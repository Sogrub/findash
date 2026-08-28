import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStore } from '../../store/auth.store';
import { TransfersStore } from '../../store/transfers.store';

function generateUUID(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

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
  protected readonly transfersStore = inject(TransfersStore);
  private readonly fb = inject(FormBuilder);

  protected readonly avatarError = signal(false);
  protected idempotencyKey = generateUUID();

  protected readonly form: FormGroup = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(3)]],
    amount: [null, [Validators.required, Validators.min(0.01), Validators.max(10_000_000)]],
    description: [''],
  });

  private readonly amountValue = toSignal(
    this.form.get('amount')!.valueChanges.pipe(startWith(null)),
    { initialValue: null as number | null },
  );

  protected readonly commissionInfo = computed(() => {
    const type = this.transfersStore.accountType();
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

  protected txPage = 1;
  protected readonly txLimit = 8;
  protected get skeletonItems(): number[] { return Array.from({ length: this.txLimit }, (_, i) => i); }

  ngOnInit(): void {
    this.transfersStore.clearSuccess();
    this.transfersStore.loadBalance();
    this.transfersStore.loadHistory(this.txPage, this.txLimit);
  }

  protected onAvatarError(): void { this.avatarError.set(true); }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  protected logout(): void { this.store.logout(); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.transfersStore.transferLoading()) return;

    const { toAccountNumber, amount, description } = this.form.value as {
      toAccountNumber: string; amount: number; description: string;
    };

    this.transfersStore.submitTransfer(
      this.idempotencyKey,
      { toAccountNumber: toAccountNumber.trim(), amount, description: description || undefined },
      () => {
        this.form.reset();
        this.idempotencyKey = generateUUID();
        this.txPage = 1;
        this.transfersStore.loadHistory(1, this.txLimit);
      },
    );
  }

  onFormFocus(): void {
    if (this.transfersStore.transferSuccess()) {
      this.transfersStore.clearSuccess();
    }
  }

  protected onPage(event: PageEvent): void {
    this.txPage = event.pageIndex + 1;
    this.transfersStore.loadHistory(this.txPage, this.txLimit);
  }
}
