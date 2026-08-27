import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    document.cookie = 'fd_token=; path=/; max-age=0';
  });

  afterEach(() => {
    httpMock.verify();
    document.cookie = 'fd_token=; path=/; max-age=0';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── Cookie helpers ──────────────────────────────────────────────────────────

  describe('setToken / getToken / isAuthenticated / clearToken', () => {
    it('setToken stores the value in cookie', () => {
      service.setToken('abc123');
      expect(service.getToken()).toBe('abc123');
    });

    it('isAuthenticated returns true when token exists', () => {
      service.setToken('abc123');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated returns false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('getToken returns null when no cookie', () => {
      expect(service.getToken()).toBeNull();
    });

    it('clearToken removes the cookie', () => {
      service.setToken('abc123');
      service.clearToken();
      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  // ── decodeToken() ───────────────────────────────────────────────────────────

  describe('decodeToken()', () => {
    function makeToken(payload: object): string {
      // Encode as UTF-8 bytes → base64url (same as JWT libraries do)
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json);
      const base64 = btoa(String.fromCharCode(...bytes));
      const base64Url = base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `fakeheader.${base64Url}.fakesig`;
    }

    it('returns null when no token in cookie', () => {
      expect(service.decodeToken()).toBeNull();
    });

    it('decodes fullName, email, role and avatarUrl from JWT payload', () => {
      const payload = { sub: '1', email: 'user@test.com', role: 'CLIENT', fullName: 'John Doe', avatarUrl: null, jv: 0 };
      service.setToken(makeToken(payload));

      const result = service.decodeToken();

      expect(result).toEqual({ fullName: 'John Doe', email: 'user@test.com', role: 'CLIENT', avatarUrl: null });
    });

    it('includes avatarUrl when present', () => {
      const payload = { sub: '1', email: 'g@test.com', role: 'CLIENT', fullName: 'Google User', avatarUrl: 'https://photos.google.com/avatar.jpg', jv: 0 };
      service.setToken(makeToken(payload));

      expect(service.decodeToken()?.avatarUrl).toBe('https://photos.google.com/avatar.jpg');
    });

    it('decodes names with accented characters correctly', () => {
      const payload = { sub: '1', email: 'sofia@test.com', role: 'CLIENT', fullName: 'Sofía Gómez', avatarUrl: null, jv: 0 };
      service.setToken(makeToken(payload));

      expect(service.decodeToken()?.fullName).toBe('Sofía Gómez');
    });

    it('returns null when token is malformed', () => {
      service.setToken('not.a.valid.jwt.at.all');
      expect(service.decodeToken()).toBeNull();
    });
  });

  // ── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('makes POST to /auth/login with credentials', () => {
      service.login('user@test.com', 'pass123').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com', password: 'pass123' });
      req.flush({ accessToken: 'token-xyz' });
    });

    it('saves token in cookie after successful login', () => {
      service.login('user@test.com', 'pass123').subscribe(() => {
        expect(service.getToken()).toBe('token-xyz');
      });
      httpMock.expectOne('http://localhost:3000/api/v1/auth/login').flush({ accessToken: 'token-xyz' });
    });

    it('propagates HTTP errors', () => {
      let error: unknown;
      service.login('user@test.com', 'wrong').subscribe({ error: e => (error = e) });
      httpMock.expectOne('http://localhost:3000/api/v1/auth/login').flush(
        { message: 'Credenciales incorrectas' },
        { status: 401, statusText: 'Unauthorized' },
      );
      expect(error).toBeTruthy();
    });
  });

  // ── register() ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    const payload = { email: 'new@test.com', password: 'pass123', fullName: 'John Doe', document: '123456' };

    it('makes POST to /auth/register with user data', () => {
      service.register(payload).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ accessToken: 'new-token' });
    });

    it('saves token in cookie after successful register', () => {
      service.register(payload).subscribe(() => {
        expect(service.getToken()).toBe('new-token');
      });
      httpMock.expectOne('http://localhost:3000/api/v1/auth/register').flush({ accessToken: 'new-token' });
    });
  });

  // ── forgotPassword() ────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('makes POST to /auth/forgot-password with only email', () => {
      service.forgotPassword('user@test.com').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/forgot-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com' });
      req.flush({ code: '123456' });
    });

    it('returns the recovery code from the API', () => {
      let result: { code: string } | undefined;
      service.forgotPassword('user@test.com').subscribe(r => (result = r));

      httpMock.expectOne('http://localhost:3000/api/v1/auth/forgot-password').flush({ code: '654321' });

      expect(result?.code).toBe('654321');
    });
  });

  // ── resetPassword() ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('makes POST to /auth/reset-password with email, code and newPassword', () => {
      service.resetPassword('user@test.com', '123456', 'NewPass!').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/reset-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com', code: '123456', newPassword: 'NewPass!' });
      req.flush(null);
    });
  });

  // ── logout() ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('makes POST to /auth/logout with Bearer token header', () => {
      service.setToken('my-jwt');
      service.logout().subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt');
      req.flush(null);
    });

    it('clears the cookie after successful logout', () => {
      service.setToken('my-jwt');
      service.logout().subscribe();
      httpMock.expectOne('http://localhost:3000/api/v1/auth/logout').flush(null);
      // finalize corre tras complete — verificar después del flush
      expect(service.getToken()).toBeNull();
    });

    it('clears the cookie even when the API call fails', () => {
      service.setToken('my-jwt');
      service.logout().subscribe();
      httpMock.expectOne('http://localhost:3000/api/v1/auth/logout').flush(
        null,
        { status: 401, statusText: 'Unauthorized' },
      );
      expect(service.getToken()).toBeNull();
    });
  });
});
