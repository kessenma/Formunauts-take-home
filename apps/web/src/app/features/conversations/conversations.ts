import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChatService } from '../../core/services/chat';
import { Avatar } from '../../shared/components/avatar/avatar';
import type { ChatSession } from '@formunauts/shared';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [DatePipe, Avatar],
  templateUrl: './conversations.html',
  styleUrl: './conversations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conversations implements OnInit {
  readonly #chatService = inject(ChatService);

  readonly sessions = this.#chatService.sessions;
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.#chatService.getSessions().subscribe({
      next: (s) => {
        this.#chatService.sessions.set(s);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openSession(session: ChatSession): void {
    this.#chatService.openWithSession(session);
  }
}
