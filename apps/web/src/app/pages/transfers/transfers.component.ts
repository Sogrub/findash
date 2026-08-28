import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountService } from '../../services/account.service';
import { AuthStore } from '../../store/auth.store';
import { TransactionItem, TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-transfers',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.scss',
})
export class TransfersComponent implements OnInit {
  protected readonly store = inject(AuthStore);
  private readonly accountService = inject(AccountService);
  private readonly transactionService = inject(TransactionService);
  private readonly fb = inject(FormBuilder);

  // Navbar
  protected readonly avatarError = signal(false);
  protected readonly balance = signal<number | null>(null);
  protected readonly accountType = signal<string | null>(null);

  // Form
  protected idempotencyKey = crypto.randomUUID();
  protected readonly formLoading = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formSuccess = signal(false);
  protected readonly lastResult = signal<import('../../services/transaction.service').TransferResult | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(3)]],
    amount: [null, [Validators.required, Validators.min(0.01), Validators.max(10_000_000)]],
    description: [''],
  });

  // Reactive amount → commission preview
  private readonly amountValue = toSignal(
    this.form.get('amount')!.valueChanges.pipe(startWith(null)),
    { initialValue: null as number | null },
  );

  protected readonly commissionInfo = computed(() => {
    const type = this.accountType();
    if (!type) return null;

    const raw = this.amountValue();
    const amount = typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : 0;

    if (type === 'PREMIUM') {
      return { kind: 'premium' as const, commission: 0, total: amount, amount };
    }

    const commission = type === 'CORPORATE' ? 5 : +(amount * 0.02).toFixed(2);
    return {
      kind: (type === 'CORPORATE' ? 'corporate' : 'basic') as 'corporate' | 'basic',
      commission,
      total: amount > 0 ? +(amount + commission).toFixed(2) : 0,
      amount,
    };
  });

  // History
  protected readonly transactions = signal<TransactionItem[]>([]);
  protected readonly totalTx = signal(0);
  protected readonly historyLoading = signal(true);
  protected txPage = 1;
  protected readonly txLimit = 8;
  protected get skeletonItems(): number[] { return Array.from({ length: this.txLimit }, (_, i) => i); }

  ngOnInit(): void {
    this.loadBalance();
    this.loadHistory();
  }

  // ── Navbar ──────────────────────────────────────────────────────────────────

  protected onAvatarError(): void { this.avatarError.set(true); }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  protected logout(): void { this.store.logout(); }

  private loadBalance(): void {
    this.accountService.getMyAccount().subscribe({
      next: acc => {
        this.balance.set(acc.balance);
        this.accountType.set(acc.type);
      },
    });
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.formLoading()) return;

    this.formLoading.set(true);
    this.formError.set(null);
    this.formSuccess.set(false);

    const { toAccountNumber, amount, description } = this.form.value as {
      toAccountNumber: string; amount: number; description: string;
    };

    this.transactionService
      .createTransfer(this.idempotencyKey, {
        toAccountNumber: toAccountNumber.trim(),
        amount,
        description: description || undefined,
      })
      .subscribe({
        next: (res) => {
          this.formLoading.set(false);
          this.formSuccess.set(true);
          this.lastResult.set(res);
          this.form.reset();
          this.idempotencyKey = crypto.randomUUID();
          this.loadBalance();
          this.txPage = 1;
          this.loadHistory();
        },
        error: (err: HttpErrorResponse) => {
          this.formLoading.set(false);
          const msg = (err.error as { message?: string })?.message;
          this.formError.set(typeof msg === 'string' ? msg : 'Error al procesar la transferencia');
        },
      });
  }

  onFormFocus(): void {
    if (this.formSuccess()) {
      this.formSuccess.set(false);
      this.lastResult.set(null);
    }
  }

  // ── History ─────────────────────────────────────────────────────────────────

  protected onPage(event: PageEvent): void {
    this.txPage = event.pageIndex + 1;
    this.loadHistory();
  }

  private loadHistory(): void {
    this.historyLoading.set(true);
    this.transactionService.getMyTransactions(this.txPage, this.txLimit).subscribe({
      next: res => {
        this.transactions.set(res.data);
        this.totalTx.set(res.meta.total);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }
}
