import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component, OnInit, OnDestroy, DestroyRef,
  ViewChild, ElementRef,
  inject, signal, effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStore } from '../../store/auth.store';
import { MetricsStore, AccountTypeMetric } from '../../store/metrics.store';
import { TransfersStore } from '../../store/transfers.store';

Chart.register(...registerables);

const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  BASIC:     { bg: 'rgba(144, 202, 249, 0.25)', border: '#90caf9' },
  CORPORATE: { bg: 'rgba(206, 147, 216, 0.25)', border: '#ce93d8' },
  PREMIUM:   { bg: 'rgba(255, 204, 128, 0.25)', border: '#ffcc80' },
};

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DecimalPipe, MatToolbarModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AuthStore);
  protected readonly metricsStore = inject(MetricsStore);
  protected readonly transfersStore = inject(TransfersStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly avatarError = signal(false);

  @ViewChild('chartCanvas') private chartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  constructor() {
    effect(() => {
      const data = this.metricsStore.metrics();
      if (data) setTimeout(() => this.renderChart(data.byAccountType), 0);
    });
  }

  ngOnInit(): void {
    const role = this.store.currentUser()?.role;
    if (role === 'ADMIN') {
      this.metricsStore.startPolling(this.destroyRef);
    } else if (role === 'CLIENT') {
      this.transfersStore.loadBalance();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  protected onAvatarError(): void { this.avatarError.set(true); }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  logout(): void { this.store.logout(); }

  private renderChart(data: AccountTypeMetric[]): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;

    this.chart?.destroy();

    const ctx = canvas.getContext('2d')!;
    const colors = data.map(d => TYPE_COLORS[d.type] ?? { bg: 'rgba(255,255,255,0.1)', border: '#fff' });

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.type),
        datasets: [{
          label: 'Volumen ($)',
          data: data.map(d => d.volume),
          backgroundColor: colors.map(c => c.bg),
          borderColor: colors.map(c => c.border),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` $${(ctx.parsed.y ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af', font: { size: 12, weight: 'bold' } },
            border: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#9ca3af',
              font: { size: 11 },
              callback: val => `$${Number(val).toLocaleString('en-US')}`,
            },
            border: { color: 'rgba(255,255,255,0.08)' },
          },
        },
      },
    });
  }
}
