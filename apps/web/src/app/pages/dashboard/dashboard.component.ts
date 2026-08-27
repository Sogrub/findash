import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-dashboard',
  imports: [MatToolbarModule, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly store = inject(AuthStore);
  protected readonly avatarError = signal(false);

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
