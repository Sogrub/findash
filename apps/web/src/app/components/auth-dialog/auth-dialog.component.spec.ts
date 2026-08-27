import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth-dialog.component';
import { AuthStore } from '../../store/auth.store';

const mockDialogRef = { close: vi.fn() };

const mockStore = {
  isLoading: vi.fn(() => false),
  error: vi.fn(() => ''),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  clearError: vi.fn(),
};

function setup(tab: 'login' | 'register' = 'login') {
  TestBed.configureTestingModule({
    imports: [AuthDialogComponent],
    providers: [
      provideRouter([]),
      { provide: MAT_DIALOG_DATA, useValue: { tab } },
      { provide: MatDialogRef, useValue: mockDialogRef },
      { provide: AuthStore, useValue: mockStore },
    ],
  });
  const fixture = TestBed.createComponent(AuthDialogComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

describe('AuthDialogComponent', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Inicialización ──────────────────────────────────────────────────────────

  it('starts on login tab when data.tab is "login"', () => {
    const { component } = setup('login');
    expect(component.selectedTab).toBe(0);
  });

  it('starts on register tab when data.tab is "register"', () => {
    const { component } = setup('register');
    expect(component.selectedTab).toBe(1);
  });

  it('clears error on tab change', () => {
    const { component } = setup();
    component.onTabChange(1);
    expect(mockStore.clearError).toHaveBeenCalled();
    expect(component.selectedTab).toBe(1);
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  describe('onLogin()', () => {
    it('marks form as touched and does not call store when form is invalid', () => {
      const { component } = setup();
      component.onLogin();
      expect(mockStore.login).not.toHaveBeenCalled();
      expect(component.loginForm.touched).toBe(true);
    });

    it('calls store.login with form values and a close callback', () => {
      const { component } = setup();
      component.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });

      component.onLogin();

      expect(mockStore.login).toHaveBeenCalledWith(
        'user@test.com',
        'pass123',
        expect.any(Function),
      );
    });

    it('the onSuccess callback closes the dialog', () => {
      const { component } = setup();
      component.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });
      component.onLogin();

      // Simulate store calling onSuccess
      const onSuccess = mockStore.login.mock.calls[0][2] as () => void;
      onSuccess();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  // ── Register ────────────────────────────────────────────────────────────────

  describe('onRegister()', () => {
    const validData = { fullName: 'John Doe', document: '123456', email: 'new@test.com', password: 'pass123' };

    it('marks form as touched and does not call store when form is invalid', () => {
      const { component } = setup('register');
      component.onRegister();
      expect(mockStore.register).not.toHaveBeenCalled();
      expect(component.registerForm.touched).toBe(true);
    });

    it('calls store.register with form values and a close callback', () => {
      const { component } = setup('register');
      component.registerForm.setValue(validData);

      component.onRegister();

      expect(mockStore.register).toHaveBeenCalledWith(validData, expect.any(Function));
    });

    it('the onSuccess callback closes the dialog', () => {
      const { component } = setup('register');
      component.registerForm.setValue(validData);
      component.onRegister();

      const onSuccess = mockStore.register.mock.calls[0][1] as () => void;
      onSuccess();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  // ── Recuperar contraseña ────────────────────────────────────────────────────

  describe('openForgot() / backToAuth()', () => {
    it('switches view to forgot and resets state', () => {
      const { component } = setup();
      component.openForgot();
      expect(component.view()).toBe('forgot');
      expect(component.forgotStep()).toBe(1);
      expect(component.recoveryCode()).toBe('');
      expect(mockStore.clearError).toHaveBeenCalled();
    });

    it('backToAuth switches view back to auth', () => {
      const { component } = setup();
      component.openForgot();
      component.backToAuth();
      expect(component.view()).toBe('auth');
      expect(mockStore.clearError).toHaveBeenCalled();
    });
  });

  describe('onForgotPassword()', () => {
    it('marks form touched and does not call store when invalid', () => {
      const { component } = setup();
      component.openForgot();
      component.onForgotPassword();
      expect(mockStore.forgotPassword).not.toHaveBeenCalled();
      expect(component.forgotForm.touched).toBe(true);
    });

    it('calls store.forgotPassword with email', () => {
      const { component } = setup();
      component.openForgot();
      component.forgotForm.setValue({ email: 'user@test.com' });

      component.onForgotPassword();

      expect(mockStore.forgotPassword).toHaveBeenCalledWith('user@test.com', expect.any(Function));
    });

    it('onSuccess stores code, pre-fills resetForm and advances to step 2', () => {
      const { component } = setup();
      component.openForgot();
      component.forgotForm.setValue({ email: 'user@test.com' });
      component.onForgotPassword();

      const onSuccess = mockStore.forgotPassword.mock.calls[0][1] as (code: string) => void;
      onSuccess('654321');

      expect(component.recoveryCode()).toBe('654321');
      expect(component.resetForm.get('code')?.value).toBe('654321');
      expect(component.forgotStep()).toBe(2);
    });
  });

  describe('onResetPassword()', () => {
    it('marks form touched and does not call store when invalid', () => {
      const { component } = setup();
      component.openForgot();
      component.onResetPassword();
      expect(mockStore.resetPassword).not.toHaveBeenCalled();
      expect(component.resetForm.touched).toBe(true);
    });

    it('calls store.resetPassword with email, code and newPassword', () => {
      const { component } = setup();
      component.openForgot();
      component.forgotForm.setValue({ email: 'user@test.com' });
      component.resetForm.setValue({ code: '123456', newPassword: 'NewPass!' });

      component.onResetPassword();

      expect(mockStore.resetPassword).toHaveBeenCalledWith(
        'user@test.com',
        '123456',
        'NewPass!',
        expect.any(Function),
      );
    });

    it('onSuccess switches view back to auth', () => {
      const { component } = setup();
      component.openForgot();
      component.forgotForm.setValue({ email: 'user@test.com' });
      component.resetForm.setValue({ code: '123456', newPassword: 'NewPass!' });
      component.onResetPassword();

      const onSuccess = mockStore.resetPassword.mock.calls[0][3] as () => void;
      onSuccess();

      expect(component.view()).toBe('auth');
    });
  });
});
