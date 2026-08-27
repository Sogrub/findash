import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from '../../components/auth-dialog/auth-dialog.component';

@Component({
  selector: 'app-home',
  imports: [MatToolbarModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly dialog = inject(MatDialog);

  openAuth(tab: 'login' | 'register' = 'login'): void {
    this.dialog.open(AuthDialogComponent, {
      data: { tab },
      width: '440px',
      panelClass: 'fd-auth-dialog',
    });
  }
}
