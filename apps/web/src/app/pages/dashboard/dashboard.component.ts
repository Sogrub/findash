import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountService } from '../../services/account.service';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, MatToolbarModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly store = inject(AuthStore);
  private readonly accountService = inject(AccountService);

  protected readonly avatarError = signal(false);
  protected readonly balance = signal<number | null>(null);

  ngOnInit(): void {
    if (this.store.currentUser()?.role === 'CLIENT') {
      this.accountService.getMyAccount().subscribe({
        next: acc => this.balance.set(acc.balance),
      });
    }
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase();
  }

  protected onAvatarError(): void {
    this.avatarError.set(true);
  }

  logout(): void {
    this.store.logout();
  }
}
