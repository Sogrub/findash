import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';

const mockAuthService = { getToken: vi.fn() };

describe('AccountService', () => {
  let service: AccountService;
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
    service = TestBed.inject(AccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── getMyAccount() ───────────────────────────────────────────────────────────

  describe('getMyAccount()', () => {
    it('makes GET to /accounts/me with Bearer token', () => {
      mockAuthService.getToken.mockReturnValue('test-token');

      service.getMyAccount().subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/accounts/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({ accountNumber: 'FD001', balance: 1000, type: 'BASIC', status: 'ACTIVE' });
    });

    it('returns the account info from the API', () => {
      mockAuthService.getToken.mockReturnValue('tok');
      const mockAccount = { accountNumber: 'FD001', balance: 500, type: 'PREMIUM', status: 'ACTIVE' };

      let result: typeof mockAccount | undefined;
      service.getMyAccount().subscribe(r => (result = r));

      http.expectOne('http://localhost:3000/api/v1/accounts/me').flush(mockAccount);
      expect(result).toEqual(mockAccount);
    });

    it('sends no Authorization header when token is null', () => {
      mockAuthService.getToken.mockReturnValue(null);

      service.getMyAccount().subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/accounts/me');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });
  });

  // ── listAccounts() ───────────────────────────────────────────────────────────

  describe('listAccounts()', () => {
    it('makes GET to /accounts with pagination and sort params', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.listAccounts({ page: 2, limit: 10, sortBy: 'fullName', sortOrder: 'asc' }).subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/accounts');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('sortBy')).toBe('fullName');
      expect(req.request.params.get('sortOrder')).toBe('asc');
      req.flush({ data: [], meta: {} });
    });

    it('includes search param when provided', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.listAccounts({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc', search: '12345' }).subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/accounts');
      expect(req.request.params.get('search')).toBe('12345');
      req.flush({ data: [], meta: {} });
    });

    it('includes status param when provided', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.listAccounts({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc', status: 'ACTIVE' }).subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/accounts');
      expect(req.request.params.get('status')).toBe('ACTIVE');
      req.flush({ data: [], meta: {} });
    });

    it('omits search param when not provided', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      service.listAccounts({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe();

      const req = http.expectOne(r => r.url === 'http://localhost:3000/api/v1/accounts');
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ data: [], meta: {} });
    });

    it('returns paginated data from API', () => {
      mockAuthService.getToken.mockReturnValue('tok');
      const mockResp = {
        data: [{ id: '1', accountNumber: 'FD001', fullName: 'Test', balance: 0, type: 'BASIC', status: 'ACTIVE' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      let result: typeof mockResp | undefined;
      service.listAccounts({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe(r => (result = r));

      http.expectOne(r => r.url === 'http://localhost:3000/api/v1/accounts').flush(mockResp);
      expect(result).toEqual(mockResp);
    });
  });
});
