import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountService } from '../services/account.service';
import {
  TransactionService,
  TransactionItem,
  TransferPayload,
  TransferResult,
} from '../services/transaction.service';

export type { TransactionItem, TransferResult };

@Injectable({ providedIn: 'root' })
export class TransfersStore {
  private readonly accountService = inject(AccountService);
  private readonly txService = inject(TransactionService);

  readonly balance = signal<number | null>(null);
  readonly accountType = signal<string | null>(null);

  readonly transactions = signal<TransactionItem[]>([]);
  readonly totalTx = signal(0);
  readonly historyLoading = signal(false);

  readonly transferLoading = signal(false);
  readonly transferError = signal<string | null>(null);
  readonly transferSuccess = signal(false);
  readonly lastTransfer = signal<TransferResult | null>(null);

  loadBalance(): void {
    this.accountService.getMyAccount().subscribe({
      next: acc => {
        this.balance.set(acc.balance);
        this.accountType.set(acc.type);
      },
    });
  }

  loadHistory(page: number, limit: number): void {
    this.historyLoading.set(true);
    this.txService.getMyTransactions(page, limit).subscribe({
      next: res => {
        this.transactions.set(res.data);
        this.totalTx.set(res.meta.total);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  submitTransfer(
    idempotencyKey: string,
    payload: TransferPayload,
    onSuccess: () => void,
  ): void {
    this.transferLoading.set(true);
    this.transferError.set(null);
    this.transferSuccess.set(false);
    this.txService.createTransfer(idempotencyKey, payload).subscribe({
      next: res => {
        this.transferLoading.set(false);
        this.transferSuccess.set(true);
        this.lastTransfer.set(res);
        this.loadBalance();
        onSuccess();
      },
      error: (err: HttpErrorResponse) => {
        this.transferLoading.set(false);
        const msg = (err.error as { message?: string })?.message;
        this.transferError.set(typeof msg === 'string' ? msg : 'Error al procesar la transferencia');
      },
    });
  }

  clearSuccess(): void {
    this.transferSuccess.set(false);
    this.lastTransfer.set(null);
    this.transferError.set(null);
  }
}
