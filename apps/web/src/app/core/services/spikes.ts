import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { switchMap, catchError, of } from 'rxjs';
import type { Spike } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class SpikesService {
  readonly #http = inject(HttpClient);

  readonly spikes = toSignal(
    timer(0, 10000).pipe(
      switchMap(() =>
        this.#http.get<Spike[]>('/api/spikes').pipe(catchError(() => of(null)))
      )
    )
  );
}
