import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toast } from 'ngx-sonner';
import type { ChatMessage, SlashMention } from '@formunauts/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  solarChatRoundBoldDuotone,
  solarFullScreenSquareBoldDuotone,
  solarShareBoldDuotone,
} from '@ng-icons/solar-icons/bold-duotone';
import { ChatService } from '../../core/services/chat';
import { AuthService } from '../../core/services/auth';
import { Modal } from '../../shared/components/modal/modal';
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
  selector: 'app-chat-panel',
  standalone: true,
  imports: [NgTemplateOutlet, NgIcon, Modal, ChatInput],
  providers: [provideIcons({
    solarChatRoundBoldDuotone, solarFullScreenSquareBoldDuotone, solarShareBoldDuotone,
  })],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanel implements OnDestroy {
  readonly #chatService = inject(ChatService);
  readonly #auth = inject(AuthService);

  // Aliases from service (shared state)
  readonly isOpen = this.#chatService.isOpen;
  readonly isSharedView = this.#chatService.isSharedView;
  readonly sharedTitle = this.#chatService.sharedTitle;
  readonly sharedUserName = this.#chatService.sharedUserName;

  // Local UI state
  readonly isExpanded = signal(false);
  readonly messages = signal<ChatEntry[]>([]);
  readonly isLoading = signal(false);
  readonly modelStatus = this.#chatService.modelStatus;
  readonly modelInfoOpen = signal(false);
  readonly isSharing = signal(false);
  readonly fabHidden = signal(false);

  #lastScrollY = 0;

  readonly modelReady = computed(() => this.#chatService.modelStatus()?.model_loaded ?? false);

  readonly isOwner = computed(() => {
    if (this.#chatService.isSharedView()) return false;
    const ownerId = this.#chatService.currentSessionOwnerId();
    const me = this.#auth.currentUser()?.id;
    return ownerId === null || ownerId === me;
  });

  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');

  #sessionCreating = false;

  constructor() {
    effect(() => {
      const open = this.#chatService.isOpen();
      if (!open) return;

      if (this.#chatService.isSharedView()) {
        this.messages.set(this.#chatService.sharedMessages().map(m => this.#toEntry(m)));
        setTimeout(() => this.#scrollToBottom());
        return;
      }

      const sessionId = this.#chatService.currentSessionId();

      if (sessionId === null) {
        if (this.#sessionCreating) return;
        this.#sessionCreating = true;
        this.messages.set([]);
        this.#chatService.createSession().subscribe({
          next: ({ sessionId: id }) => {
            this.#chatService.currentSessionId.set(id);
            this.#chatService.currentSessionOwnerId.set(this.#auth.currentUser()?.id ?? null);
            this.#chatService.loadMySessions();
            this.#sessionCreating = false;
          },
          error: () => { this.#sessionCreating = false; },
        });
      } else {
        this.messages.set([]);
        this.#chatService.getSessionMessages(sessionId).subscribe({
          next: ({ sessionUserId, messages }) => {
            this.#chatService.currentSessionOwnerId.set(sessionUserId);
            this.messages.set(messages.map(m => this.#toEntry(m)));
            setTimeout(() => this.#scrollToBottom());
          },
        });
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.modelInfoOpen.set(false);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isOpen()) return;
    const currentY = window.scrollY;
    this.fabHidden.set(currentY > this.#lastScrollY && currentY > 80);
    this.#lastScrollY = currentY;
  }

  toggleModelInfo(event: MouseEvent): void {
    event.stopPropagation();
    this.modelInfoOpen.update((v) => !v);
  }

  toggle(): void {
    this.#chatService.isOpen.update((v) => !v);
    if (this.#chatService.isOpen()) {
      this.#chatService.ensurePolling();
    } else {
      this.isExpanded.set(false);
    }
  }

  expand(): void {
    this.isExpanded.set(true);
  }

  collapse(): void {
    this.isExpanded.set(false);
  }

  pauseDownload(): void {
    this.#chatService.pauseDownload().subscribe();
  }

  resumeDownload(): void {
    this.#chatService.resumeDownload().subscribe();
  }

  shareSession(): void {
    const sessionId = this.#chatService.currentSessionId();
    if (!sessionId || !this.isOwner()) return;
    this.isSharing.set(true);
    this.#chatService.shareSession(sessionId).subscribe({
      next: ({ shareToken }) => {
        const url = `${window.location.origin}/conversations?chat=${shareToken}`;
        navigator.clipboard.writeText(url).then(
          () => toast.success('Share link copied to clipboard!'),
          () => toast.info(`Share link: ${url}`),
        );
        this.isSharing.set(false);
        this.#chatService.loadMySessions();
      },
      error: () => {
        toast.error('Failed to create share link');
        this.isSharing.set(false);
      },
    });
  }

  onChatInputSubmit(event: { question: string; mentions: SlashMention[] }): void {
    const { question, mentions } = event;
    const sessionId = this.#chatService.currentSessionId();
    if (!question || this.isLoading() || !this.modelReady() || !sessionId || !this.isOwner()) return;

    const chipLabels = mentions.map(m => `[${m.label}]`).join(' ');
    const displayText = chipLabels ? `${question}  ${chipLabels}` : question;

    this.messages.update((msgs) => [...msgs, { role: 'user', text: displayText }]);
    this.isLoading.set(true);
    this.#scrollToBottom();

    this.#chatService.ask(question, sessionId, mentions.length > 0 ? mentions : undefined).subscribe({
      next: (response) => {
        const columns = response.results.length > 0 ? Object.keys(response.results[0]) : [];
        const rows = response.results.map((row) => Object.values(row));
        const count = response.results.length;
        const text =
          count === 0
            ? 'No results found.'
            : count === 1 && columns.length === 1
              ? String(rows[0][0])
              : `Found ${count} result${count !== 1 ? 's' : ''}.`;

        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', text, sql: response.sql, columns, rows },
        ]);
        this.isLoading.set(false);
        this.#scrollToBottom();
        this.#chatService.loadMySessions();
      },
      error: (err: { error?: { error?: string } }) => {
        const errorText = err?.error?.error ?? 'Something went wrong. Please try again.';
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', text: errorText, error: true },
        ]);
        this.isLoading.set(false);
        this.#scrollToBottom();
      },
    });
  }

  ngOnDestroy(): void {
    // nothing to clean up — polling is service-owned
  }

  #toEntry(m: ChatMessage): ChatEntry {
    const columns = m.results && m.results.length > 0 ? Object.keys(m.results[0]) : [];
    const rows = m.results ? m.results.map((r) => Object.values(r)) : [];
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

  #scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
