import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api/v1';

export interface AccountInfo {
  accountNumber: string;
  balance: number;
  type: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getMyAccount(): Observable<AccountInfo> {
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<AccountInfo>(`${API_URL}/accounts/me`, { headers });
  }
}
