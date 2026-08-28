import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { AuthService } from './auth.service';
import type { DashboardMetrics } from './admin.service';

const mockAuthService = { getToken: vi.fn() };

const mockMetrics: DashboardMetrics = {
  kpis: { totalVolume: 10000, completedCount: 50, failedCount: 3, activeAccounts: 20 },
  byAccountType: [
    { type: 'BASIC', volume: 5000, count: 30 },
    { type: 'PREMIUM', volume: 5000, count: 20 },
  ],
};

describe('AdminService', () => {
  let service: AdminService;
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
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getMetrics()', () => {
    it('makes GET to /admin/metrics with Bearer token', () => {
      mockAuthService.getToken.mockReturnValue('admin-token');

      service.getMetrics().subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/admin/metrics');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer admin-token');
      req.flush(mockMetrics);
    });

    it('returns the full metrics payload from the API', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      let result: DashboardMetrics | undefined;
      service.getMetrics().subscribe(r => (result = r));

      http.expectOne('http://localhost:3000/api/v1/admin/metrics').flush(mockMetrics);
      expect(result).toEqual(mockMetrics);
    });

    it('uses empty string token when getToken returns null', () => {
      mockAuthService.getToken.mockReturnValue(null);

      service.getMetrics().subscribe();

      const req = http.expectOne('http://localhost:3000/api/v1/admin/metrics');
      expect(req.request.headers.get('Authorization')).toBe('Bearer ');
      req.flush(mockMetrics);
    });

    it('propagates HTTP errors', () => {
      mockAuthService.getToken.mockReturnValue('tok');

      let error: unknown;
      service.getMetrics().subscribe({ error: e => (error = e) });

      http.expectOne('http://localhost:3000/api/v1/admin/metrics').flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );
      expect(error).toBeTruthy();
    });
  });
});
