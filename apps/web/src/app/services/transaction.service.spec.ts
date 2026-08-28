import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionService } from './transaction.service';
import { AuthService } from './auth.service';
import type { TransferPayload, TransferResult, TransactionListResponse } from './transaction.service';

const mockAuthService = { getToken: vi.fn() };

const mockTransferResult: TransferResult = {
  id: 'tx-1',
  fromAccount: 'FD001',
  fromName: 'Alice',
  toAccount: 'FD002',
  toName: 'Bob',
  amount: 100,
  commission: 2,
  totalDeducted: 102,
  status: 'COMPLETED',
  authorizationCode: 'AUTH-XYZ',
  createdAt: '2025-01-01T00:00:00Z',
};

const mockListResponse: TransactionListResponse = {
  data: [{ ...mockTransferResult, direction: 'OUTGOING' }],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

describe('TransactionService', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── createTransfer() ─────────────────────────────────────────────────────────

  describe('createTransfer()', () => {
    const payload: TransferPayload = { toAccountNumber: 'FD002', amount: 100 };

    it('makes POST to /transactions/transfer with idempotency key header', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.createTransfer('key-abc', payload).subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/transactions/transfer');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('X-Idempotency-Key')).toBe('key-abc');
      expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
      req.flush(mockTransferResult);
    });

    it('sends the transfer payload in the request body', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.createTransfer('key-1', payload).subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/transactions/transfer');
      expect(req.request.body).toEqual(payload);
      req.flush(mockTransferResult);
    });

    it('returns the transfer result from the API', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      let result: TransferResult | undefined;
      service.createTransfer('key-1', payload).subscribe(r => (result = r));

      http.expectOne('http://localhost:3000/api/v1/transactions/transfer').flush(mockTransferResult);
      expect(result).toEqual(mockTransferResult);
    });
  });

  // ── getMyTransactions() ──────────────────────────────────────────────────────

  describe('getMyTransactions()', () => {
    it('makes GET to /transactions with page and limit params', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.getMyTransactions(2, 5).subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/transactions');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('5');
      req.flush(mockListResponse);
    });

    it('uses default page=1 limit=10', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.getMyTransactions().subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/transactions');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockListResponse);
    });

    it('returns the paginated transaction list', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      let result: TransactionListResponse | undefined;
      service.getMyTransactions(1, 10).subscribe(r => (result = r));

      http.expectOne(r => r.url === 'http://localhost:3000/api/v1/transactions').flush(mockListResponse);
      expect(result?.meta.total).toBe(1);
      expect(result?.data).toHaveLength(1);
    });
  });

  // ── getAccountTransactions() ─────────────────────────────────────────────────

  describe('getAccountTransactions()', () => {
    it('makes GET to /transactions/admin/account/:id with page and limit', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.getAccountTransactions('acc-1', 1, 10).subscribe();

      const req = http.expectOne(
        r => r.url === 'http://localhost:3000/api/v1/transactions/admin/account/acc-1',
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockListResponse);
    });

    it('includes Bearer token in Authorization header', () => {
      mockAuthService.getToken.mockReturnValue('admin-tok');

      service.getAccountTransactions('acc-2', 1, 10).subscribe();

      const req = http.expectOne(
        r => r.url === 'http://localhost:3000/api/v1/transactions/admin/account/acc-2',
      );
      expect(req.request.headers.get('Authorization')).toBe('Bearer admin-tok');
      req.flush(mockListResponse);
    });

    it('returns the account transaction list', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      let result: TransactionListResponse | undefined;
      service.getAccountTransactions('acc-1').subscribe(r => (result = r));

      http.expectOne(
        r => r.url === 'http://localhost:3000/api/v1/transactions/admin/account/acc-1',
      ).flush(mockListResponse);

      expect(result?.data[0].direction).toBe('OUTGOING');
    });
  });
});
