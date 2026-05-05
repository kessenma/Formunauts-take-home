import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        router.navigate(['/login']);
      }
      const message =
        err instanceof HttpErrorResponse
          ? err.error?.message ?? err.statusText
          : 'An unexpected error occurred';
      return throwError(() => new Error(message));
    })
  );
};
