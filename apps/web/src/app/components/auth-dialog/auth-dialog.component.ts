import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from '../../store/auth.store';
import { environment } from '../../../environments/environment';

export interface AuthDialogData {
  tab: 'login' | 'register';
}

@Component({
  selector: 'app-auth-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.scss',
})
export class AuthDialogComponent {
  protected readonly store = inject(AuthStore);
  private readonly dialogRef = inject(MatDialogRef<AuthDialogComponent>);
  private readonly data = inject<AuthDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  // ── Estado UI del dialog (no va al store global) ────────────────────────────
  selectedTab = this.data.tab === 'register' ? 1 : 0;
  readonly view = signal<'auth' | 'forgot'>('auth');
  readonly forgotStep = signal<1 | 2>(1);
  readonly recoveryCode = signal('');

  // ── Aliases de señales del store para el template ────────────────────────────
  readonly isLoading = computed(() => this.store.isLoading());
  readonly errorMessage = computed(() => this.store.error());

  // ── Formularios ──────────────────────────────────────────────────────────────
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly registerForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    document: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  // ── Handlers auth ────────────────────────────────────────────────────────────
  onTabChange(index: number): void {
    this.selectedTab = index;
    this.store.clearError();
  }

  onLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    const { email, password } = this.loginForm.value as { email: string; password: string };
    this.store.login(email, password, () => this.dialogRef.close());
  }

  onRegister(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    const data = this.registerForm.value as {
      email: string; password: string; fullName: string; document: string;
    };
    this.store.register(data, () => this.dialogRef.close());
  }

  // ── Handlers recuperar contraseña ────────────────────────────────────────────
  openForgot(): void {
    this.view.set('forgot');
    this.forgotStep.set(1);
    this.recoveryCode.set('');
    this.forgotForm.reset();
    this.resetForm.reset();
    this.store.clearError();
  }

  backToAuth(): void {
    this.view.set('auth');
    this.store.clearError();
  }

  onForgotPassword(): void {
    if (this.forgotForm.invalid) { this.forgotForm.markAllAsTouched(); return; }
    const { email } = this.forgotForm.value as { email: string };
    this.store.forgotPassword(email, (code) => {
      this.recoveryCode.set(code);
      this.resetForm.patchValue({ code });
      this.forgotStep.set(2);
    });
  }

  onResetPassword(): void {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    const { email } = this.forgotForm.value as { email: string };
    const { code, newPassword } = this.resetForm.value as { code: string; newPassword: string };
    this.store.resetPassword(email, code, newPassword, () => this.view.set('auth'));
  }

  readonly googleAuthUrl = `${environment.apiUrl}/auth/google`;
}
