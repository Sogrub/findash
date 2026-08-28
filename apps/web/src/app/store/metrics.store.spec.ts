import { TestBed } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MetricsStore } from './metrics.store';
import { AdminService } from '../services/admin.service';
import type { DashboardMetrics } from '../services/admin.service';

const mockAdminService = { getMetrics: vi.fn() };
const mockDestroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;

const mockMetrics: DashboardMetrics = {
  kpis: { totalVolume: 5000, completedCount: 10, failedCount: 2, activeAccounts: 25 },
  byAccountType: [{ type: 'BASIC', volume: 3000, count: 7 }],
};

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: AdminService, useValue: mockAdminService }],
  });
  return TestBed.inject(MetricsStore);
}

describe('MetricsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('initializes with null metrics and loading false', () => {
    const store = setup();
    expect(store.metrics()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('sets loading true synchronously when polling starts', () => {
    mockAdminService.getMetrics.mockReturnValue(of(mockMetrics));
    const store = setup();

    store.startPolling(mockDestroyRef);

    expect(store.loading()).toBe(true);
  });

  it('populates metrics and clears loading after first poll fires', () => {
    mockAdminService.getMetrics.mockReturnValue(of(mockMetrics));
    const store = setup();

    store.startPolling(mockDestroyRef);
    vi.advanceTimersByTime(0);

    expect(store.metrics()).toEqual(mockMetrics);
    expect(store.loading()).toBe(false);
  });

  it('clears loading and keeps metrics null on API error', () => {
    mockAdminService.getMetrics.mockReturnValue(throwError(() => new Error('Network error')));
    const store = setup();

    store.startPolling(mockDestroyRef);
    vi.advanceTimersByTime(0);

    expect(store.loading()).toBe(false);
    expect(store.metrics()).toBeNull();
  });

  it('calls getMetrics again after 30 seconds', () => {
    mockAdminService.getMetrics.mockReturnValue(of(mockMetrics));
    const store = setup();

    store.startPolling(mockDestroyRef);
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(30_000);

    expect(mockAdminService.getMetrics).toHaveBeenCalledTimes(2);
  });

  it('updates metrics on each successive poll', () => {
    const updated: DashboardMetrics = { ...mockMetrics, kpis: { ...mockMetrics.kpis, completedCount: 99 } };
    mockAdminService.getMetrics
      .mockReturnValueOnce(of(mockMetrics))
      .mockReturnValueOnce(of(updated));

    const store = setup();
    store.startPolling(mockDestroyRef);

    vi.advanceTimersByTime(0);
    expect(store.metrics()?.kpis.completedCount).toBe(10);

    vi.advanceTimersByTime(30_000);
    expect(store.metrics()?.kpis.completedCount).toBe(99);
  });
});
