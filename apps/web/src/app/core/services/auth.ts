import { Injectable, computed, signal } from '@angular/core';
import { authClient } from '../auth/auth.client';
import type { AuthUser } from '@formunauts/shared';

type Session = { user: AuthUser } | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _session = signal<Session>(null);

  readonly isAuthenticated = computed(() => !!this._session());
  readonly currentUser = computed(() => this._session()?.user ?? null);

  async loadSession(): Promise<'authenticated' | 'unauthenticated' | 'unknown'> {
    try {
      const { data, error } = await authClient.getSession();
      if (error?.status === 401) {
        this._session.set(null);
        return 'unauthenticated';
      }
      if (data !== undefined) {
        this._session.set(data as Session);
        return data ? 'authenticated' : 'unauthenticated';
      }
      return 'unknown';
    } catch {
      // Transient failure (server restarting, offline) — cookie is still valid.
      return 'unknown';
    }
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) return error.message ?? 'Sign in failed';
    await this.loadSession();
    return null;
  }

  async signUp(name: string, email: string, password: string): Promise<string | null> {
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) return error.message ?? 'Sign up failed';
    await this.loadSession();
    return null;
  }

  async signOut(): Promise<void> {
    await authClient.signOut();
    this._session.set(null);
  }

  async forgotPassword(email: string): Promise<{ token: string } | { error: string }> {
    const res = await fetch('http://localhost:3000/api/auth/forgot-password-dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return res.json();
  }

  async resetPassword(token: string, newPassword: string): Promise<string | null> {
    const res = await fetch('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
      return data.message ?? 'Reset failed';
    }
    return null;
  }
}
