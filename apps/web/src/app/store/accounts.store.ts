import { Injectable, inject, signal } from '@angular/core';
import {
  AccountService,
  AccountListItem,
  AccountSortField,
  SortOrder,
} from '../services/account.service';
import { TransactionService, TransactionItem } from '../services/transaction.service';

export type { AccountListItem };

export interface AccountsLoadParams {
  page: number;
  limit: number;
  sortBy: AccountSortField;
  sortOrder: SortOrder;
  search?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly accountService = inject(AccountService);
  private readonly txService = inject(TransactionService);

  readonly accounts = signal<AccountListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly selectedAccount = signal<AccountListItem | null>(null);
  readonly sidebarTxs = signal<TransactionItem[]>([]);
  readonly sidebarTotal = signal(0);
  readonly sidebarLoading = signal(false);
  readonly sidebarLimit = 10;

  load(params: AccountsLoadParams): void {
    this.loading.set(true);
    this.accountService.listAccounts(params).subscribe({
      next: res => {
        this.accounts.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openSidebar(account: AccountListItem): void {
    this.selectedAccount.set(account);
    this.sidebarTxs.set([]);
    this.loadSidebarTxs(account.id, 1);
  }

  loadSidebarTxs(accountId: string, page: number): void {
    this.sidebarLoading.set(true);
    this.txService.getAccountTransactions(accountId, page, this.sidebarLimit).subscribe({
      next: res => {
        this.sidebarTxs.set(res.data);
        this.sidebarTotal.set(res.meta.total);
        this.sidebarLoading.set(false);
      },
      error: () => this.sidebarLoading.set(false),
    });
  }

  closeSidebar(): void {
    this.selectedAccount.set(null);
    this.sidebarTxs.set([]);
    this.sidebarTotal.set(0);
  }
}
