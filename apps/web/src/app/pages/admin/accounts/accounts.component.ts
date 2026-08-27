import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountListItem, AccountService, AccountSortField, SortOrder } from '../../../services/account.service';
import { AuthStore } from '../../../store/auth.store';

const AVATAR_COLORS = [
  '#5c6bc0', '#26a69a', '#ef5350', '#ab47bc',
  '#29b6f6', '#66bb6a', '#ffa726', '#ec407a',
];

@Component({
  selector: 'app-admin-accounts',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AdminAccountsComponent implements OnInit {
  protected readonly store = inject(AuthStore);
  private readonly accountService = inject(AccountService);

  protected readonly accounts = signal<AccountListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);

  protected page = 1;
  protected limit = 5;
  protected get skeletonItems(): number[] { return Array.from({ length: this.limit }, (_, i) => i); }
  protected sortBy: AccountSortField = 'createdAt';
  protected sortOrder: SortOrder = 'desc';

  readonly sortFields: { value: AccountSortField; label: string }[] = [
    { value: 'createdAt', label: 'Fecha de registro' },
    { value: 'fullName', label: 'Nombre' },
    { value: 'balance', label: 'Saldo' },
    { value: 'status', label: 'Estado' },
  ];

  ngOnInit(): void {
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

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  protected avatarColor(name: string): string {
    const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  }

  private load(): void {
    this.loading.set(true);
    this.accountService
      .listAccounts({ page: this.page, limit: this.limit, sortBy: this.sortBy, sortOrder: this.sortOrder })
      .subscribe({
        next: (res) => {
          this.accounts.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected logout(): void {
    this.store.logout();
  }
}
