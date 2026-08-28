import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';
import { AdminService, AccountTypeMetric, DashboardMetrics } from '../services/admin.service';

export type { AccountTypeMetric, DashboardMetrics };

@Injectable({ providedIn: 'root' })
export class MetricsStore {
  private readonly adminService = inject(AdminService);

  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly loading = signal(false);

  startPolling(destroyRef: DestroyRef): void {
    this.loading.set(true);
    timer(0, 30_000).pipe(
      takeUntilDestroyed(destroyRef),
      switchMap(() =>
        this.adminService.getMetrics().pipe(
          catchError(() => { this.loading.set(false); return EMPTY; }),
        ),
      ),
    ).subscribe(data => {
      this.metrics.set(data);
      this.loading.set(false);
    });
  }
}
