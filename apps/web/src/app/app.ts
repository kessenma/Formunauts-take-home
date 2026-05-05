import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { RealtimeService } from './core/services/realtime';
import { ThemeService } from './core/services/theme';
import { ChatPanel } from './features/chat/chat-panel';
import { AppNav } from './shared/components/nav/nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatPanel, NgxSonnerToaster, AppNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly #realtime = inject(RealtimeService);
  readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.#realtime.connect();
  }
}
