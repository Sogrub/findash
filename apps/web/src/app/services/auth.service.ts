import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

const API_URL = 'http://localhost:3000/api/v1';
const COOKIE_NAME = 'fd_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export interface AuthResponse {
  accessToken: string;
}

export interface UserInfo {
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap(res => this.setToken(res.accessToken)));
  }

  register(data: {
    email: string;
    password: string;
    fullName: string;
    document: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, data)
      .pipe(tap(res => this.setToken(res.accessToken)));
  }

  forgotPassword(email: string): Observable<{ code: string }> {
    return this.http.post<{ code: string }>(`${API_URL}/auth/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/reset-password`, { email, code, newPassword });
  }

  logout(): Observable<void> {
    const token = this.getToken();
    return this.http
      .post<void>(`${API_URL}/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .pipe(
        catchError(() => of(void 0)),
        finalize(() => this.clearToken()),
      );
  }

  setToken(token: string): void {
    document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Strict; max-age=${COOKIE_MAX_AGE}`;
  }

  clearToken(): void {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }

  getToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)fd_token=([^;]+)/);
    return match ? match[1] : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  decodeToken(): UserInfo | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
        fullName?: string;
        email?: string;
        role?: string;
        avatarUrl?: string | null;
      };
      return {
        fullName: payload.fullName ?? '',
        email: payload.email ?? '',
        role: payload.role ?? '',
        avatarUrl: payload.avatarUrl ?? null,
      };
    } catch {
      return null;
    }
  }
}
