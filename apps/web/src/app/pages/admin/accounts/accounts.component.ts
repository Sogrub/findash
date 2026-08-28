import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountListItem, AccountSortField, SortOrder } from '../../../services/account.service';
import { AuthStore } from '../../../store/auth.store';
import { AccountsStore } from '../../../store/accounts.store';

const AVATAR_COLORS = [
  '#5c6bc0', '#26a69a', '#ef5350', '#ab47bc',
  '#29b6f6', '#66bb6a', '#ffa726', '#ec407a',
];

@Component({
  selector: 'app-admin-accounts',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatSelectModule,
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AdminAccountsComponent implements OnInit {
  protected readonly store = inject(AuthStore);
  protected readonly accountsStore = inject(AccountsStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  protected readonly revealed = signal<Set<string>>(new Set());
  protected readonly copied = signal<string | null>(null);

  protected page = 1;
  protected limit = 5;
  protected sortBy: AccountSortField = 'createdAt';
  protected sortOrder: SortOrder = 'desc';
  protected search = '';
  protected statusFilter = '';
  protected sidebarPage = 1;

  protected get skeletonItems(): number[] { return Array.from({ length: this.limit }, (_, i) => i); }
  protected readonly sidebarSkeletons = Array.from({ length: 5 }, (_, i) => i);

  readonly sortFields: { value: AccountSortField; label: string }[] = [
    { value: 'createdAt', label: 'Fecha de registro' },
    { value: 'fullName', label: 'Nombre' },
    { value: 'balance', label: 'Saldo' },
    { value: 'status', label: 'Estado' },
  ];

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.load();
  }

  protected onSortChange(): void {
    this.page = 1;
    this.load();
  }

  protected onSearchChange(value: string): void {
    this.search = value;
    this.searchSubject.next(value);
  }

  private load(): void {
    this.accountsStore.load({
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      search: this.search || undefined,
      status: this.statusFilter || undefined,
    });
  }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  protected avatarColor(name: string): string {
    const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  }

  protected mask(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return accountNumber.slice(0, 4) + '•'.repeat(accountNumber.length - 4);
  }

  protected isRevealed(accountNumber: string): boolean {
    return this.revealed().has(accountNumber);
  }

  protected toggleReveal(accountNumber: string, event: MouseEvent): void {
    event.stopPropagation();
    const next = new Set(this.revealed());
    if (next.has(accountNumber)) { next.delete(accountNumber); } else { next.add(accountNumber); }
    this.revealed.set(next);
  }

  protected copyAccount(accountNumber: string, event: MouseEvent): void {
    event.stopPropagation();
    void navigator.clipboard.writeText(accountNumber).then(() => {
      this.copied.set(accountNumber);
      setTimeout(() => this.copied.set(null), 2000);
    });
  }

  protected openSidebar(account: AccountListItem): void {
    this.sidebarPage = 1;
    this.accountsStore.openSidebar(account);
  }

  protected closeSidebar(): void {
    this.accountsStore.closeSidebar();
  }

  protected onSidebarPage(event: PageEvent): void {
    this.sidebarPage = event.pageIndex + 1;
    const account = this.accountsStore.selectedAccount();
    if (account) this.accountsStore.loadSidebarTxs(account.id, this.sidebarPage);
  }

  protected logout(): void {
    this.store.logout();
  }
}
