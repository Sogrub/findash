import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

export interface AccountInfo {
  accountNumber: string;
  balance: number;
  type: string;
  status: string;
}

export interface AccountListItem {
  id: string;
  accountNumber: string;
  fullName: string;
  balance: number;
  type: string;
  status: string;
}

export interface AccountListResponse {
  data: AccountListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type AccountSortField = 'fullName' | 'balance' | 'status' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get authHeaders(): HttpHeaders | undefined {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  getMyAccount(): Observable<AccountInfo> {
    return this.http.get<AccountInfo>(`${API_URL}/accounts/me`, { headers: this.authHeaders });
  }

  listAccounts(params: {
    page: number;
    limit: number;
    sortBy: AccountSortField;
    sortOrder: SortOrder;
    search?: string;
    status?: string;
  }): Observable<AccountListResponse> {
    const queryParams: Record<string, string> = {
      page: String(params.page),
      limit: String(params.limit),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };
    if (params.search) queryParams['search'] = params.search;
    if (params.status) queryParams['status'] = params.status;
    return this.http.get<AccountListResponse>(`${API_URL}/accounts`, {
      headers: this.authHeaders,
      params: queryParams,
    });
  }
}
