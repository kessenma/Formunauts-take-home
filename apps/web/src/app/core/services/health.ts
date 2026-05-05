import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { switchMap, catchError, of, shareReplay, pairwise, tap, map } from 'rxjs';
import { toast } from 'ngx-sonner';
import type { SystemHealth } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class HealthService {
  readonly #http = inject(HttpClient);

  readonly #health$ = timer(0, 5000).pipe(
    switchMap(() =>
      this.#http.get<SystemHealth>('/api/health').pipe(catchError(() => of(null)))
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly health = toSignal(this.#health$);

  constructor() {
    this.#health$.pipe(
      pairwise(),
      tap(([prev, curr]) => this.#checkAlerts(prev, curr)),
    ).subscribe();
  }

  #checkAlerts(prev: SystemHealth | null, curr: SystemHealth | null): void {
    if (!prev || !curr) return;

    if (prev.database.status === 'ok' && curr.database.status === 'slow') {
      toast.warning(`Database slow: ${curr.database.responseTimeMs}ms response time`);
    }
    if (prev.database.status !== 'error' && curr.database.status === 'error') {
      toast.error('Database connection failed');
    }
    if (prev.llm.status === 'ok' && curr.llm.status === 'error') {
      toast.warning('LLM service error');
    }
    if (prev.llm.status !== 'unreachable' && curr.llm.status === 'unreachable') {
      toast.warning('LLM service unreachable');
    }
    const prevMem = prev.server.memoryMb.rss;
    const currMem = curr.server.memoryMb.rss;
    if (prevMem < 200 && currMem >= 200) {
      toast.warning(`High server memory: ${currMem} MB RSS`);
    }
    if (prevMem < 500 && currMem >= 500) {
      toast.error(`Critical server memory: ${currMem} MB RSS`);
    }
  }
}
