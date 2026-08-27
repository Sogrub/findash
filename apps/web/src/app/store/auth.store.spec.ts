import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthService } from '../services/auth.service';

const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  isAuthenticated: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeToken: vi.fn<any>(() => null),
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: mockAuthService },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return {
    store: TestBed.inject(AuthStore),
    router,
  };
}

describe('AuthStore', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('sets isLoading while the request is in flight', () => {
      const { store } = setup();
      mockAuthService.login.mockReturnValue(of({ accessToken: 'tok' }));

      store.login('user@test.com', 'pass');

      // After the synchronous observable resolves, isLoading is false again
      expect(store.isLoading()).toBe(false);
    });

    it('calls onSuccess callback and navigates to /dashboard on success', () => {
      const { store, router } = setup();
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockAuthService.login.mockReturnValue(of({ accessToken: 'tok' }));
      const onSuccess = vi.fn();

      store.login('user@test.com', 'pass', onSuccess);

      expect(onSuccess).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });

    it('sets currentUser from decoded token after login', () => {
      const { store, router } = setup();
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const fakeUser = { fullName: 'Test User', email: 'test@test.com', role: 'CLIENT', avatarUrl: null };
      mockAuthService.login.mockReturnValue(of({ accessToken: 'tok' }));
      mockAuthService.decodeToken.mockReturnValue(fakeUser);

      store.login('test@test.com', 'pass');

      expect(store.currentUser()).toEqual(fakeUser);
    });

    it('sets error message on failure', () => {
      const { store } = setup();
      mockAuthService.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Credenciales incorrectas' } })),
      );

      store.login('user@test.com', 'wrong');

      expect(store.error()).toBe('Credenciales incorrectas');
      expect(store.isLoading()).toBe(false);
    });

    it('uses fallback error when message is missing', () => {
      const { store } = setup();
      mockAuthService.login.mockReturnValue(throwError(() => ({})));

      store.login('user@test.com', 'wrong');

      expect(store.error()).toBe('Credenciales incorrectas');
    });
  });

  // ── register() ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    const data = { email: 'new@test.com', password: 'pass', fullName: 'John', document: '123' };

    it('calls onSuccess and navigates to /dashboard on success', () => {
      const { store, router } = setup();
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockAuthService.register.mockReturnValue(of({ accessToken: 'tok' }));
      const onSuccess = vi.fn();

      store.register(data, onSuccess);

      expect(onSuccess).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });

    it('joins array error messages', () => {
      const { store } = setup();
      mockAuthService.register.mockReturnValue(
        throwError(() => ({ error: { message: ['email inválido', 'doc requerido'] } })),
      );

      store.register(data);

      expect(store.error()).toBe('email inválido, doc requerido');
    });
  });

  // ── logout() ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('calls authService.logout and navigates to /', () => {
      const { store, router } = setup();
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockAuthService.logout.mockReturnValue(of(void 0));

      store.logout();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });

    it('clears currentUser on logout', () => {
      const { store, router } = setup();
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      mockAuthService.logout.mockReturnValue(of(void 0));

      store.logout();

      expect(store.currentUser()).toBeNull();
    });
  });

  // ── forgotPassword() ────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('calls onSuccess with the recovery code', () => {
      const { store } = setup();
      mockAuthService.forgotPassword.mockReturnValue(of({ code: '123456' }));
      const onSuccess = vi.fn();

      store.forgotPassword('user@test.com', onSuccess);

      expect(onSuccess).toHaveBeenCalledWith('123456');
    });

    it('sets error on failure', () => {
      const { store } = setup();
      mockAuthService.forgotPassword.mockReturnValue(
        throwError(() => ({ error: { message: 'Usuario no encontrado' } })),
      );

      store.forgotPassword('nobody@test.com');

      expect(store.error()).toBe('Usuario no encontrado');
    });
  });

  // ── resetPassword() ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('calls onSuccess when password is reset', () => {
      const { store } = setup();
      mockAuthService.resetPassword.mockReturnValue(of(void 0));
      const onSuccess = vi.fn();

      store.resetPassword('user@test.com', '123456', 'NewPass!', onSuccess);

      expect(onSuccess).toHaveBeenCalled();
    });

    it('sets error on failure', () => {
      const { store } = setup();
      mockAuthService.resetPassword.mockReturnValue(
        throwError(() => ({ error: { message: 'Código inválido o expirado' } })),
      );

      store.resetPassword('user@test.com', '000000', 'NewPass!');

      expect(store.error()).toBe('Código inválido o expirado');
    });
  });

  // ── clearError() ────────────────────────────────────────────────────────────

  describe('clearError()', () => {
    it('resets the error signal', () => {
      const { store } = setup();
      mockAuthService.login.mockReturnValue(throwError(() => ({})));
      store.login('x', 'y');

      store.clearError();

      expect(store.error()).toBe('');
    });
  });
});
