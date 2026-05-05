import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  ChatResponse, ChatResponseWithSession, ModelStatus,
  ChatSession, ChatMessage,
  CreateSessionResponse, ShareResponse, SharedThreadResponse,
  SlashMention,
} from '@formunauts/shared';
import { Observable, Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap, takeWhile } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly #http = inject(HttpClient);

  // ── Shared state ────────────────────────────────────────────────────────────
  readonly isOpen = signal(false);
  readonly modelStatus = signal<ModelStatus | null>(null);
  #pollSub: Subscription | null = null;
  readonly currentSessionId = signal<number | null>(null);
  readonly currentSessionOwnerId = signal<string | null>(null);
  readonly sessions = signal<ChatSession[]>([]);
  readonly mySessions = signal<ChatSession[]>([]);
  readonly isSharedView = signal(false);
  readonly sharedTitle = signal<string | null>(null);
  readonly sharedUserName = signal<string | null>(null);
  readonly sharedMessages = signal<ChatMessage[]>([]);

  // ── HTTP methods ─────────────────────────────────────────────────────────────
  createSession(): Observable<CreateSessionResponse> {
    return this.#http.post<CreateSessionResponse>('/api/chat/sessions', {});
  }

  getSessions(mine?: boolean): Observable<ChatSession[]> {
    return mine
      ? this.#http.get<ChatSession[]>('/api/chat/sessions', { params: { mine: 'true' } })
      : this.#http.get<ChatSession[]>('/api/chat/sessions');
  }

  getSessionMessages(id: number): Observable<{ sessionUserId: string; messages: ChatMessage[] }> {
    return this.#http.get<{ sessionUserId: string; messages: ChatMessage[] }>(`/api/chat/sessions/${id}`);
  }

  ask(question: string, sessionId: number, context?: SlashMention[]): Observable<ChatResponseWithSession> {
    return this.#http.post<ChatResponseWithSession>('/api/chat', {
      question,
      sessionId,
      ...(context?.length ? { context } : {}),
    });
  }

  shareSession(sessionId: number): Observable<ShareResponse> {
    return this.#http.post<ShareResponse>(`/api/chat/sessions/${sessionId}/share`, {});
  }

  getSharedThread(token: string): Observable<SharedThreadResponse> {
    return this.#http.get<SharedThreadResponse>(`/api/chat/share/${token}`);
  }

  getModelStatus(): Observable<ModelStatus> {
    return this.#http.get<ModelStatus>('/api/model-status');
  }

  pauseDownload(): Observable<void> {
    return this.#http.post<void>('/api/pause-download', {});
  }

  resumeDownload(): Observable<void> {
    return this.#http.post<void>('/api/resume-download', {});
  }

  ensurePolling(): void {
    if (this.#pollSub) return;
    this.#pollSub = interval(2000).pipe(
      startWith(0),
      switchMap(() => this.getModelStatus().pipe(catchError(() => of(null)))),
      takeWhile((s) => s === null || (!s.model_loaded && s.phase !== 'error'), true),
    ).subscribe((s) => {
      if (s) this.modelStatus.set(s);
      if (s?.model_loaded || s?.phase === 'error') {
        this.#pollSub?.unsubscribe();
        this.#pollSub = null;
      }
    });
  }

  // ── State methods ────────────────────────────────────────────────────────────
  loadSessions(): void {
    this.getSessions().subscribe({ next: (s) => this.sessions.set(s) });
  }

  loadMySessions(): void {
    this.getSessions(true).subscribe({ next: (s) => this.mySessions.set(s) });
  }

  openWithSession(session: ChatSession): void {
    this.isSharedView.set(false);
    this.currentSessionId.set(session.id);
    this.currentSessionOwnerId.set(session.userId);
    this.isOpen.set(true);
  }

  newSession(): void {
    this.isSharedView.set(false);
    this.currentSessionId.set(null);
    this.currentSessionOwnerId.set(null);
    this.isOpen.set(true);
  }

  openSharedThread(token: string): void {
    this.getSharedThread(token).subscribe({
      next: ({ title, userName, messages }) => {
        this.sharedTitle.set(title);
        this.sharedUserName.set(userName);
        this.sharedMessages.set(messages);
        this.isSharedView.set(true);
        this.isOpen.set(true);
      },
    });
  }
}
