import { Injectable, inject, OnDestroy } from '@angular/core';
import type { WsDonationEvent } from '@formunauts/shared';
import { DonationService } from './donation';

const MAX_BACKOFF_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  readonly #donationService = inject(DonationService);

  #ws: WebSocket | null = null;
  #retryCount = 0;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;

  connect(): void {
    if (this.#ws && (this.#ws.readyState === WebSocket.OPEN || this.#ws.readyState === WebSocket.CONNECTING)) return;
    const wsUrl = `ws://${window.location.host}/api/donations/live`;
    this.#ws = new WebSocket(wsUrl);

    this.#ws.onopen = () => {
      this.#retryCount = 0;
    };

    this.#ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WsDonationEvent;
        if (msg.type === 'new_donation') {
          this.#donationService.prependDonation(msg.payload);
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.#ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** this.#retryCount, MAX_BACKOFF_MS);
      this.#retryCount++;
      this.#retryTimer = setTimeout(() => this.connect(), delay);
    };
  }

  disconnect(): void {
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#ws?.close();
    this.#ws = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
