import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../services/auth.service';

export type { UserInfo };

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  document: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // ── Estado global de autenticación ──────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly currentUser: WritableSignal<UserInfo | null>;

  constructor() {
    this.currentUser = signal(this.authService.decodeToken());
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  login(email: string, password: string, onSuccess?: () => void): void {
    this.isLoading.set(true);
    this.error.set('');
    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.currentUser.set(this.authService.decodeToken());
        onSuccess?.();
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.isLoading.set(false);
        const msg = err?.error?.message;
        this.error.set(typeof msg === 'string' ? msg : 'Credenciales incorrectas');
      },
    });
  }

  // ── Register ────────────────────────────────────────────────────────────────
  register(data: RegisterPayload, onSuccess?: () => void): void {
    this.isLoading.set(true);
    this.error.set('');
    this.authService.register(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.currentUser.set(this.authService.decodeToken());
        onSuccess?.();
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        this.isLoading.set(false);
        const msg = err?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al registrarse'));
      },
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.currentUser.set(null);
        void this.router.navigate(['/']);
      },
    });
  }

  // ── Recuperar contraseña ────────────────────────────────────────────────────
  forgotPassword(email: string, onSuccess?: (code: string) => void): void {
    this.isLoading.set(true);
    this.error.set('');
    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        onSuccess?.(res.code);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.error.set(err?.error?.message ?? 'Usuario no encontrado');
      },
    });
  }

  resetPassword(
    email: string,
    code: string,
    newPassword: string,
    onSuccess?: () => void,
  ): void {
    this.isLoading.set(true);
    this.error.set('');
    this.authService.resetPassword(email, code, newPassword).subscribe({
      next: () => {
        this.isLoading.set(false);
        onSuccess?.();
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.error.set(err?.error?.message ?? 'Error al restablecer la contraseña');
      },
    });
  }

  // ── OAuth callback ──────────────────────────────────────────────────────────
  handleOAuthToken(token: string): void {
    this.authService.setToken(token);
    this.currentUser.set(this.authService.decodeToken());
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  clearError(): void {
    this.error.set('');
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
