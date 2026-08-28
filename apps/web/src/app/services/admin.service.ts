import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

export interface AccountTypeMetric {
  type: string;
  volume: number;
  count: number;
}

export interface DashboardMetrics {
  kpis: {
    totalVolume: number;
    completedCount: number;
    failedCount: number;
    activeAccounts: number;
  };
  byAccountType: AccountTypeMetric[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.getToken() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${API_URL}/admin/metrics`, {
      headers: this.authHeaders,
    });
  }
}
