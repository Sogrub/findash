import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api/v1';

export interface TransferPayload {
  toAccountNumber: string;
  amount: number;
  description?: string;
}

export interface TransferResult {
  id: string;
  fromAccount: string;
  fromName: string;
  toAccount: string;
  toName: string;
  amount: number;
  commission: number;
  totalDeducted: number;
  status: string;
  authorizationCode: string;
  createdAt: string;
}

export interface TransactionItem extends TransferResult {
  direction: 'OUTGOING' | 'INCOMING';
}

export interface TransactionListResponse {
  data: TransactionItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private authHeaders(idempotencyKey?: string): HttpHeaders {
    const token = this.authService.getToken() ?? '';
    let headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    if (idempotencyKey) headers = headers.set('X-Idempotency-Key', idempotencyKey);
    return headers;
  }

  createTransfer(idempotencyKey: string, payload: TransferPayload): Observable<TransferResult> {
    return this.http.post<TransferResult>(
      `${API_URL}/transactions/transfer`,
      payload,
      { headers: this.authHeaders(idempotencyKey) },
    );
  }

  getMyTransactions(page = 1, limit = 10): Observable<TransactionListResponse> {
    return this.http.get<TransactionListResponse>(`${API_URL}/transactions`, {
      headers: this.authHeaders(),
      params: { page: String(page), limit: String(limit) },
    });
  }

  getAccountTransactions(accountId: string, page = 1, limit = 10): Observable<TransactionListResponse> {
    return this.http.get<TransactionListResponse>(
      `${API_URL}/transactions/admin/account/${accountId}`,
      { headers: this.authHeaders(), params: { page: String(page), limit: String(limit) } },
    );
  }
}
