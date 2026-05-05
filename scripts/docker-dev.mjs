#!/usr/bin/env node
import { createInterface } from 'readline';
import { execSync, spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * db  — always Docker (no local Postgres needed locally)
 * api — can run locally (bun run dev) or in Docker
 * web — can run locally (pnpm dev) or in Docker
 */
const SERVICES = {
  db: {
    label: 'PostgreSQL (port 5432)',
    file: 'docker-compose.db.yml',
    ports: [5432, 6379], // redis is also in docker-compose.db.yml
    local: null, // Docker-only
  },
  api: {
    // docker-compose.api.yml also starts llm-service (port 8082)
    // when api runs locally, the LLM service does NOT start → chat feature disabled
    label: 'Bun API (port 3000)  [Docker also starts LLM service on port 8082]',
    file: 'docker-compose.api.yml',
    ports: [3000, 8082],
    local: { cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/api' },
  },
  web: {
    label: 'Angular dev server (port 4200)',
    file: 'docker-compose.web.yml',
    ports: [4200],
    local: { cmd: 'pnpm', args: ['dev'], cwd: 'apps/web' },
  },
};

const ALL_COMPOSE_FILES = [...new Set(Object.values(SERVICES).map((s) => s.file))];

/**
 * Presets: { docker: string[], local: string[] }
 * null means prompt for custom selection
 */
const PRESETS = {
  1: {
    name: 'Full local dev  — db:Docker  api:local  web:local  (AI chat disabled)',
    docker: ['db'],
    local: ['api', 'web'],
  },
  2: {
    name: 'API in Docker   — db:Docker  api:Docker web:local  (AI chat enabled)',
    docker: ['db', 'api'],
    local: ['web'],
  },
  3: {
    name: 'All in Docker   — db:Docker  api:Docker web:Docker (AI chat enabled)',
    docker: ['db', 'api', 'web'],
    local: [],
  },
  4: {
    name: 'DB only         — start Postgres, run everything else yourself',
    docker: ['db'],
    local: [],
  },
  5: {
    name: 'Custom selection',
    docker: null,
    local: null,
  },
};

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function checkDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return;
  } catch {
    // not running — try to start it
  }

  console.log('Docker is not running. Starting Docker Desktop...');
  try {
    execSync('open -a Docker', { stdio: 'ignore' });
  } catch {
    console.error('Could not launch Docker Desktop. Please start it manually.');
    process.exit(1);
  }

  const deadline = Date.now() + 60_000;
  process.stdout.write('Waiting for Docker');
  while (Date.now() < deadline) {
    try {
      execSync('docker info', { stdio: 'ignore' });
      process.stdout.write(' ready.\n');
      return;
    } catch {
      process.stdout.write('.');
      execSync('sleep 2');
    }
  }

  console.error('\nDocker did not start in time. Please try again.');
  process.exit(1);
}

function killPorts(services) {
  const ports = [...new Set(services.flatMap((s) => SERVICES[s]?.ports ?? []))];
  for (const port of ports) {
    try {
      const pids = execSync(`lsof -ti:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (pids) {
        execSync(`kill -9 ${pids.split('\n').join(' ')}`, { stdio: 'ignore' });
        console.log(`  Freed port ${port}`);
      }
    } catch {
      // nothing on this port
    }
  }
}

function ensureFormunautsNetwork() {
  try {
    execSync('docker network inspect formunauts', { stdio: 'ignore' });
  } catch {
    console.log("Creating 'formunauts' Docker network...");
    execSync('docker network create formunauts', { stdio: 'inherit' });
  }
}

function getRunningContainers(composeFiles) {
  const args = composeFiles.flatMap((f) => ['-f', f]);
  try {
    const out = execSync(
      ['docker', 'compose', ...args, 'ps', '--services', '--filter', 'status=running'].join(' '),
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim();
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function warnIfAlreadyRunning(composeFiles, { canSkip = false } = {}) {
  const running = getRunningContainers(composeFiles);
  if (running.length === 0) return;

  console.log('\n⚠️  Already running:');
  running.forEach((s, i) => console.log(`  ${i + 1}) ${s}`));
  console.log('\nOptions:');
  if (canSkip) console.log('  k) Keep running (skip rebuild)');
  console.log('  a) Restart all');
  console.log('  n) Abort');
  console.log('  Or enter numbers to restart specific ones (e.g. "1" or "1,2")');

  const answer = (
    await ask(`\nRestart which? (${canSkip ? 'k/' : ''}a/n/numbers): `)
  )
    .trim()
    .toLowerCase();

  if (answer === 'k' && canSkip) {
    console.log('Keeping existing containers running.');
    return 'skip';
  }
  if (answer === 'n') {
    console.log('Aborted.');
    process.exit(0);
  }

  let toRestart;
  if (answer === 'a' || answer === 'y') {
    toRestart = running;
  } else {
    const indices = answer
      .split(',')
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < running.length);
    toRestart = [...new Set(indices.map((i) => running[i]))];
  }

  if (toRestart.length > 0) {
    const args = ALL_COMPOSE_FILES.flatMap((f) => ['-f', f]);
    execSync(['docker', 'compose', ...args, 'stop', ...toRestart].join(' '), {
      stdio: 'inherit',
    });
  }
}

async function pickCustom() {
  const keys = Object.keys(SERVICES);
  console.log('\nAvailable services:');
  keys.forEach((k, i) =>
    console.log(`  ${i + 1}) ${k.padEnd(4)} — ${SERVICES[k].label}`)
  );

  const dockerAns = (
    await ask('\nWhich services in Docker? (numbers, e.g. "1" or "1,2"): ')
  ).trim();
  const dockerIdx = dockerAns
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < keys.length);
  const dockerServices = [...new Set(dockerIdx.map((i) => keys[i]))];

  const canBeLocal = keys.filter(
    (k) => !dockerServices.includes(k) && SERVICES[k].local !== null
  );
  let localServices = [];
  if (canBeLocal.length > 0) {
    console.log(`\nRun locally? (not in Docker): ${canBeLocal.join(', ')}`);
    const localAns = (await ask('Which to run locally? (names or "none"): '))
      .trim()
      .toLowerCase();
    if (localAns !== 'none' && localAns !== '') {
      localServices = localAns
        .split(',')
        .map((s) => s.trim())
        .filter((s) => canBeLocal.includes(s));
    }
  }

  return { docker: dockerServices, local: localServices };
}

async function main() {
  const args = process.argv.slice(2);
  const down = args.includes('--down');
  const detached = args.includes('--detach') || args.includes('-d');
  const presetArg = args.find((a) => a.startsWith('--preset='))?.split('=')[1];

  console.log('=== Formunauts Dev Runner ===\n');
  console.log('Services: db (always Docker) | api | web\n');

  let dockerServices, localServices;

  if (presetArg) {
    const preset = PRESETS[presetArg];
    if (!preset || preset.docker === null) {
      console.error(`Unknown preset: ${presetArg}`);
      process.exit(1);
    }
    dockerServices = preset.docker;
    localServices = preset.local;
    console.log(`Preset: ${preset.name}`);
  } else {
    console.log('Presets:');
    for (const [k, p] of Object.entries(PRESETS)) {
      console.log(`  ${k}) ${p.name}`);
    }

    let key;
    while (true) {
      key = (await ask('\nSelect (1-5): ')).trim();
      if (PRESETS[key]) break;
      console.log(`  "${key}" is not valid. Try again.`);
    }

    const preset = PRESETS[key];
    if (preset.docker === null) {
      ({ docker: dockerServices, local: localServices } = await pickCustom());
    } else {
      dockerServices = preset.docker;
      localServices = preset.local;
    }
  }

  // Summary
  const dockerFiles = dockerServices.map((s) => SERVICES[s].file);
  console.log('\n─────────────────────────────');
  console.log('  Docker:  ' + (dockerServices.length ? dockerServices.join(', ') : 'none'));
  console.log('  Local:   ' + (localServices.length ? localServices.join(', ') : 'none'));
  if (localServices.includes('api')) {
    console.log('\n  Note: running api locally means the LLM service (AI chat) will NOT start.');
    console.log('  Use preset 2 or 3 to run api in Docker and enable the chat feature.');
  }
  if (dockerServices.includes('api')) {
    console.log('\n  Note: first Docker start downloads the ~900 MB LLM model — this takes a few');
    console.log('  minutes. The model is cached in the llm_models volume for future runs.');
  }
  console.log('─────────────────────────────\n');

  if (down) {
    if (dockerFiles.length > 0) {
      checkDockerRunning();
      const composeArgs = dockerFiles.flatMap((f) => ['-f', f]);
      console.log('Tearing down Docker services...');
      execSync(['docker', 'compose', ...composeArgs, 'down'].join(' '), {
        stdio: 'inherit',
      });
    }
    rl.close();
    return;
  }

  if (dockerFiles.length > 0) {
    checkDockerRunning();
    ensureFormunautsNetwork();
    const result = await warnIfAlreadyRunning(dockerFiles, {
      canSkip: localServices.length > 0,
    });
    const skipDockerRebuild = result === 'skip';
    rl.close();

    const procs = [];

    if (!skipDockerRebuild) {
      checkDockerRunning();
      killPorts(dockerServices);
      const upArgs = ['docker', 'compose', ...dockerFiles.flatMap((f) => ['-f', f]), 'up', '--build'];
      // Run Docker services detached if we also have local services; otherwise attach
      if (localServices.length > 0 || detached) upArgs.push('-d');
      console.log(`Running: ${upArgs.join(' ')}\n`);
      if (localServices.length > 0 || detached) {
        execSync(upArgs.join(' '), { stdio: 'inherit' });
      } else {
        procs.push(spawn(upArgs[0], upArgs.slice(1), { stdio: 'inherit' }));
      }
    }

    for (const svc of localServices) {
      const { cmd, args: svcArgs, cwd } = SERVICES[svc].local;
      const absDir = resolve(ROOT, cwd);
      console.log(`Starting ${svc} locally (${absDir})...\n`);
      procs.push(spawn(cmd, svcArgs, { cwd: absDir, stdio: 'inherit' }));
    }

    const cleanup = () => {
      procs.forEach((p) => p.kill('SIGINT'));
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    procs.forEach((p) => p.on('exit', (code) => process.exit(code ?? 0)));
  } else {
    // No Docker services — just run local ones
    rl.close();
    const procs = localServices.map((svc) => {
      const { cmd, args: svcArgs, cwd } = SERVICES[svc].local;
      const absDir = resolve(ROOT, cwd);
      console.log(`Starting ${svc} locally (${absDir})...\n`);
      return spawn(cmd, svcArgs, { cwd: absDir, stdio: 'inherit' });
    });

    if (procs.length === 0) {
      console.log('Nothing to start.');
      return;
    }

    const cleanup = () => {
      procs.forEach((p) => p.kill('SIGINT'));
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    procs.forEach((p) => p.on('exit', (code) => process.exit(code ?? 0)));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
