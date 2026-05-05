import asyncio
import os
import re
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from enum import Enum

import requests
from fastapi import FastAPI, HTTPException
from huggingface_hub import hf_hub_url
from pydantic import BaseModel

REPO_ID = "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
FILENAME = "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
MODEL_NAME = "Qwen2.5-Coder-1.5B-Instruct"
MODEL_URL = f"https://huggingface.co/{REPO_ID}"
MODEL_DIR = os.getenv("MODEL_DIR", "/models")
N_THREADS = int(os.getenv("N_THREADS", "4"))
DOWNLOAD_RETRY_DELAY = 15  # seconds to wait after a network interruption before retrying

SYSTEM_PROMPT = """You are a PostgreSQL SQL expert. Convert the user's question into a valid PostgreSQL SELECT query and output ONLY the SQL — no explanation, no markdown, no code fences.

Database schema:
CREATE TYPE org_type AS ENUM ('npo', 'fundraising_agency');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE channel AS ENUM ('street', 'door_to_door', 'event', 'phone', 'email', 'social_media');
CREATE TYPE payment_method AS ENUM ('sepa_direct_debit', 'credit_card', 'google_pay', 'apple_pay', 'paypal', 'bank_transfer', 'cash');

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type org_type NOT NULL,
  country TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  goal NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status campaign_status NOT NULL DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fundraisers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_fundraisers (
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  fundraiser_id INTEGER NOT NULL REFERENCES fundraisers(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, fundraiser_id)
);

CREATE TABLE donors (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE donation_locations (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6)
);

CREATE TABLE donations (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  donor_id INTEGER NOT NULL REFERENCES donors(id),
  fundraiser_id INTEGER REFERENCES fundraisers(id),
  location_id INTEGER REFERENCES donation_locations(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method payment_method NOT NULL,
  channel channel NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  donor_feedback_rating INTEGER,  -- 1 to 5
  is_mock BOOLEAN NOT NULL DEFAULT FALSE
);

Rules:
- Output ONLY the SQL query. Nothing else.
- Only SELECT statements are allowed.
- Always filter out mock data (is_mock = FALSE) unless the question explicitly asks for all data or mock data.
- Donor names are stored split: first_name and last_name in the donors table. Always JOIN donors ON donors.id = donations.donor_id to access donor info.
- For month filtering use EXTRACT(MONTH FROM donations.date). January=1, February=2, ..., December=12.
- For year filtering use EXTRACT(YEAR FROM donations.date).
- ALWAYS include GROUP BY for every non-aggregated column when using SUM/COUNT/AVG/MAX/MIN.
- Amount is stored as NUMERIC in euros (EUR).

Common query patterns:
- "Top donor / who donated most":
  SELECT d.first_name, d.last_name, SUM(dn.amount) AS total FROM donations dn JOIN donors d ON d.id = dn.donor_id WHERE dn.is_mock = FALSE GROUP BY d.id, d.first_name, d.last_name ORDER BY total DESC LIMIT 1
- "Average donation":
  SELECT AVG(amount) AS average FROM donations WHERE is_mock = FALSE
- "Total raised":
  SELECT SUM(amount) AS total FROM donations WHERE is_mock = FALSE
- "Donations by channel":
  SELECT channel, COUNT(*) AS count, SUM(amount) AS total FROM donations WHERE is_mock = FALSE GROUP BY channel ORDER BY total DESC
- "Top fundraiser":
  SELECT f.first_name, f.last_name, SUM(dn.amount) AS total FROM donations dn JOIN fundraisers f ON f.id = dn.fundraiser_id WHERE dn.is_mock = FALSE AND dn.fundraiser_id IS NOT NULL GROUP BY f.id, f.first_name, f.last_name ORDER BY total DESC LIMIT 1
- "Donations by city / location":
  SELECT dl.city, dl.country, COUNT(*) AS count, SUM(dn.amount) AS total FROM donations dn JOIN donation_locations dl ON dl.id = dn.location_id WHERE dn.is_mock = FALSE GROUP BY dl.id, dl.city, dl.country ORDER BY total DESC
- "Recurring donors":
  SELECT COUNT(DISTINCT donor_id) AS recurring_donors FROM donations WHERE is_mock = FALSE AND is_recurring = TRUE
- "Average donor feedback rating":
  SELECT AVG(donor_feedback_rating) AS avg_rating FROM donations WHERE is_mock = FALSE AND donor_feedback_rating IS NOT NULL"""


class Phase(str, Enum):
    IDLE = "idle"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    LOADING = "loading"
    READY = "ready"
    ERROR = "error"


class DownloadPaused(Exception):
    pass


@dataclass
class State:
    phase: Phase = Phase.IDLE
    progress: int = 0        # 0–100 (only meaningful during DOWNLOADING/PAUSED)
    detail: str = ""          # human-readable progress message
    error: str = ""


state = State()
llm = None

# Pause/resume signalling between the API handlers and the background download thread
_pause_event = threading.Event()   # set → stop writing chunks and enter PAUSED
_resume_event = threading.Event()  # set → leave PAUSED and restart _download


def _is_valid_gguf(path: str) -> bool:
    """Quick sanity check: GGUF files always start with the magic bytes 'GGUF'."""
    try:
        with open(path, "rb") as f:
            return f.read(4) == b"GGUF"
    except OSError:
        return False


def _remove_model(path: str) -> None:
    try:
        os.remove(path)
        print(f"Removed {path}.")
    except OSError as e:
        print(f"Could not remove {path}: {e}")


def _remote_size() -> int:
    """Return the remote file size via a HEAD request; 0 if unreachable."""
    try:
        url = hf_hub_url(repo_id=REPO_ID, filename=FILENAME)
        r = requests.head(url, allow_redirects=True, timeout=10)
        return int(r.headers.get("content-length", 0))
    except Exception:
        return 0


def _needs_download(model_path: str) -> bool:
    """True when the file is absent, empty, structurally invalid, or still partial."""
    if not os.path.exists(model_path) or os.path.getsize(model_path) == 0:
        return True
    if not _is_valid_gguf(model_path):
        print(f"File at {model_path} has invalid GGUF header. Removing.")
        _remove_model(model_path)
        return True
    remote = _remote_size()
    if remote > 0 and os.path.getsize(model_path) < remote:
        local_mb = os.path.getsize(model_path) / 1_048_576
        total_mb = remote / 1_048_576
        print(f"Partial file detected ({local_mb:.0f} MB / {total_mb:.0f} MB). Will resume.")
        return True
    return False


def _download(model_path: str) -> None:
    """Stream-download the model, resuming from an existing partial file."""
    state.phase = Phase.DOWNLOADING

    resume_pos = os.path.getsize(model_path) if os.path.exists(model_path) else 0
    headers = {"Range": f"bytes={resume_pos}-"} if resume_pos > 0 else {}

    if resume_pos > 0:
        state.detail = f"Resuming from {resume_pos / 1_048_576:.0f} MB…"
    else:
        state.progress = 0
        state.detail = "Starting download…"

    url = hf_hub_url(repo_id=REPO_ID, filename=FILENAME)
    with requests.get(url, stream=True, allow_redirects=True, timeout=60, headers=headers) as r:
        if r.status_code == 416:
            # Range not satisfiable — file already fully downloaded
            state.progress = 100
            state.detail = "Download complete."
            return
        r.raise_for_status()

        content_length = int(r.headers.get("content-length", 0))
        total = content_length + resume_pos if content_length else 0
        downloaded = resume_pos

        file_mode = "ab" if resume_pos > 0 else "wb"
        with open(model_path, file_mode) as f:
            for chunk in r.iter_content(chunk_size=65_536):
                if _pause_event.is_set():
                    raise DownloadPaused()
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        state.progress = min(99, int(downloaded / total * 100))
                        dl_mb = downloaded / 1_048_576
                        tot_mb = total / 1_048_576
                        state.detail = f"{dl_mb:.0f} MB / {tot_mb:.0f} MB"

    state.progress = 100
    state.detail = "Download complete."


def _load(model_path: str) -> None:
    global llm
    from llama_cpp import Llama

    state.phase = Phase.LOADING
    state.progress = 0
    state.detail = "Loading model into memory…"

    llm = Llama(
        model_path=model_path,
        chat_format="chatml",
        n_ctx=2048,
        n_threads=N_THREADS,
        n_gpu_layers=0,
        verbose=False,
    )

    state.phase = Phase.READY
    state.progress = 100
    state.detail = ""


def _setup() -> None:
    """Download (resuming if partial) and load the model. Retries indefinitely on
    network loss; retries once from scratch if the load itself fails."""
    model_path = os.path.join(MODEL_DIR, FILENAME)
    os.makedirs(MODEL_DIR, exist_ok=True)

    for attempt in range(2):
        if _needs_download(model_path):
            # Retry download loop — keeps going until fully downloaded
            while True:
                try:
                    print(f"Downloading {FILENAME}…")
                    _download(model_path)
                    break  # complete
                except DownloadPaused:
                    # User requested pause — hold here until resume
                    dl_mb = os.path.getsize(model_path) / 1_048_576 if os.path.exists(model_path) else 0
                    print(f"Download paused at {dl_mb:.0f} MB.")
                    state.phase = Phase.PAUSED
                    state.detail = f"Paused at {dl_mb:.0f} MB"
                    _resume_event.wait()   # blocks until POST /resume
                    _resume_event.clear()
                    _pause_event.clear()
                    print("Resuming download…")
                except Exception as exc:
                    print(f"Download interrupted: {exc}. Retrying in {DOWNLOAD_RETRY_DELAY}s…")
                    state.phase = Phase.DOWNLOADING
                    state.detail = f"Connection lost — retrying in {DOWNLOAD_RETRY_DELAY}s…"
                    time.sleep(DOWNLOAD_RETRY_DELAY)
        elif attempt == 0:
            print(f"Complete GGUF found at {model_path}, skipping download.")

        try:
            print("Loading model…")
            _load(model_path)
            print("Model ready.")
            return
        except Exception as exc:
            print(f"Load failed: {exc}")
            if attempt == 0:
                print("Removing file and retrying with a fresh download.")
                _remove_model(model_path)
                # loop continues for attempt 1
            else:
                state.phase = Phase.ERROR
                state.error = str(exc)
                print(f"Model setup failed after retry: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget: don't await so the server starts immediately and /status
    # is reachable while the model downloads/loads in the background.
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _setup)
    yield


app = FastAPI(lifespan=lifespan)


class SqlRequest(BaseModel):
    question: str


class SqlResponse(BaseModel):
    sql: str


@app.post("/sql", response_model=SqlResponse)
def generate_sql(req: SqlRequest):
    if llm is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": req.question},
        ],
        max_tokens=256,
        temperature=0.1,
    )

    raw = output["choices"][0]["message"]["content"].strip()

    # Strip markdown code fences if the model adds them despite instructions
    sql = re.sub(r"^```(?:sql)?\s*\n?", "", raw, flags=re.IGNORECASE)
    sql = re.sub(r"\n?```\s*$", "", sql).strip()

    return SqlResponse(sql=sql)


@app.post("/pause")
def pause_download():
    if state.phase != Phase.DOWNLOADING:
        raise HTTPException(status_code=409, detail=f"Cannot pause: current phase is '{state.phase}'")
    _pause_event.set()
    return {"ok": True}


@app.post("/resume")
def resume_download():
    if state.phase != Phase.PAUSED:
        raise HTTPException(status_code=409, detail=f"Cannot resume: current phase is '{state.phase}'")
    _resume_event.set()
    return {"ok": True}


@app.get("/status")
def get_status():
    return {
        "phase": state.phase,
        "progress": state.progress,
        "detail": state.detail,
        "error": state.error,
        "model_loaded": state.phase == Phase.READY,
        "model_name": MODEL_NAME,
        "model_url": MODEL_URL,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
