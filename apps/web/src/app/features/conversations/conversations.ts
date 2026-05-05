import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ChatSession, ChatMessage, ChatResponseWithSession, SlashMention } from '@formunauts/shared';
import { ChatService } from '../../core/services/chat';
import { AuthService } from '../../core/services/auth';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Accordion } from '../../shared/components/accordion/accordion';
import { AccordionItem } from '../../shared/components/accordion/accordion-item';
import { ChatInput } from '../../shared/components/chat-input/chat-input';

interface ChatEntry {
  id?: number;
  role: 'user' | 'assistant';
  text: string;
  sql?: string;
  columns?: string[];
  rows?: unknown[][];
  error?: boolean;
}

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [DatePipe, Avatar, Accordion, AccordionItem, ChatInput, TranslocoPipe],
  templateUrl: './conversations.html',
  styleUrl: './conversations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conversations implements OnInit {
  readonly #chatService = inject(ChatService);
  readonly #auth = inject(AuthService);
  readonly #route = inject(ActivatedRoute);

  readonly sessions = this.#chatService.sessions;
  readonly isLoading = signal(true);
  readonly modelReady = computed(() => this.#chatService.modelStatus()?.model_loaded ?? false);

  readonly sharedThread = signal<{ title: string; userName: string; messages: ChatEntry[] } | null>(null);
  readonly sessionMessages = signal(new Map<number, ChatEntry[]>());
  readonly sendingFor = signal<number | null>(null);

  ngOnInit(): void {
    this.#chatService.ensurePolling();

    this.#chatService.getSessions().subscribe({
      next: (s) => {
        this.#chatService.sessions.set(s);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    const token = this.#route.snapshot.queryParamMap.get('chat');
    if (token) {
      this.#chatService.getSharedThread(token).subscribe({
        next: ({ title, userName, messages }) =>
          this.sharedThread.set({ title, userName, messages: messages.map(m => this.#toEntry(m)) }),
      });
    }
  }

  onToggle(session: ChatSession, isOpen: boolean): void {
    if (!isOpen || this.sessionMessages().has(session.id)) return;
    this.#chatService.getSessionMessages(session.id).subscribe({
      next: ({ messages }) =>
        this.sessionMessages.update(m => new Map(m).set(session.id, messages.map(msg => this.#toEntry(msg)))),
    });
  }

  sendMessage(session: ChatSession, event: { question: string; mentions: SlashMention[] }): void {
    const { question, mentions } = event;
    if (!question || this.sendingFor() !== null) return;

    const chipLabels = mentions.map(m => `[${m.label}]`).join(' ');
    const displayText = chipLabels ? `${question}  ${chipLabels}` : question;

    this.sessionMessages.update(m => new Map(m).set(session.id, [
      ...(m.get(session.id) ?? []),
      { role: 'user', text: displayText },
    ]));
    this.sendingFor.set(session.id);

    this.#chatService.ask(question, session.id, mentions.length > 0 ? mentions : undefined).subscribe({
      next: (response: ChatResponseWithSession) => {
        const columns = response.results.length > 0 ? Object.keys(response.results[0]) : [];
        const rows = response.results.map(r => Object.values(r));
        const count = response.results.length;
        const text = count === 0 ? 'No results found.'
          : count === 1 && columns.length === 1 ? String(rows[0][0])
          : `Found ${count} result${count !== 1 ? 's' : ''}.`;
        this.sessionMessages.update(m => new Map(m).set(session.id, [
          ...(m.get(session.id) ?? []),
          { role: 'assistant', text, sql: response.sql, columns, rows },
        ]));
        this.sendingFor.set(null);
      },
      error: (err: { error?: { error?: string } }) => {
        const errorText = err?.error?.error ?? 'Something went wrong.';
        this.sessionMessages.update(m => new Map(m).set(session.id, [
          ...(m.get(session.id) ?? []),
          { role: 'assistant', text: errorText, error: true },
        ]));
        this.sendingFor.set(null);
      },
    });
  }

  isOwner(session: ChatSession): boolean {
    return session.userId === this.#auth.currentUser()?.id;
  }

  #toEntry(m: ChatMessage): ChatEntry {
    const columns = m.results && m.results.length > 0 ? Object.keys(m.results[0]) : [];
    const rows = m.results ? m.results.map(r => Object.values(r)) : [];
    return {
      id: m.id,
      role: m.role,
      text: m.text,
      sql: m.sql ?? undefined,
      columns: columns.length > 0 ? columns : undefined,
      rows: rows.length > 0 ? rows : undefined,
      error: m.isError,
    };
  }
}
