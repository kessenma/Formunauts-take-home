import { Component, inject, OnInit, effect, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { NgxSonnerToaster } from 'ngx-sonner';
import { RealtimeService } from './core/services/realtime';
import { ThemeService } from './core/services/theme';
import { AuthService } from './core/services/auth';
import { ChatService } from './core/services/chat';
import { ChatPanel } from './features/chat/chat-panel';
import { Avatar } from './shared/components/avatar/avatar';
import { Sheet } from './shared/components/sheet/sheet';
import type { ChatSession } from '@formunauts/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatPanel, NgxSonnerToaster, NgIcon, Avatar, Sheet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly #realtime = inject(RealtimeService);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  readonly #router = inject(Router);

  readonly profileSheetOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.profileSheetOpen()) this.chatService.loadMySessions();
    });
  }

  ngOnInit(): void {
    this.#realtime.connect();
  }

  openChatSession(session: ChatSession): void {
    this.chatService.openWithSession(session);
    this.profileSheetOpen.set(false);
  }

  newChat(): void {
    this.chatService.newSession();
    this.profileSheetOpen.set(false);
  }

  async signOut() {
    await this.auth.signOut();
    this.#router.navigate(['/login']);
  }
}
