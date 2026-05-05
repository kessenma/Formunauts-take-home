import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';
import { TranslocoPipe } from '@jsverse/transloco';
import { CampaignService } from '../../../core/services/campaign';
import { DonationService } from '../../../core/services/donation';
import { Dropdown, type DropdownOption } from '../../../shared/components/dropdown/dropdown';
import type { StreamStatus } from '@formunauts/shared';

@Component({
  selector: 'app-donation-streamer',
  imports: [ReactiveFormsModule, NgIcon, TranslocoPipe, Dropdown],
  templateUrl: './donation-streamer.html',
  styleUrl: './donation-streamer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationStreamer implements OnInit, OnDestroy {
  readonly #http = inject(HttpClient);
  readonly #fb = inject(FormBuilder);
  readonly #campaignService = inject(CampaignService);
  readonly #donationService = inject(DonationService);

  readonly streamRunning = signal(false);
  readonly streamCount   = signal(0);
  readonly streamWorking = signal(false);

  readonly streamForm = this.#fb.nonNullable.group({
    campaignId: [0, [Validators.required, Validators.min(1)]],
    speed:      ['medium'],
    minAmount:  [10,  [Validators.required, Validators.min(1)]],
    maxAmount:  [250, [Validators.required, Validators.min(1)]],
  });

  readonly speedOptions = [
    { label: 'Slow (1 / 3s)',  value: 'slow',   ms: 3000 },
    { label: 'Medium (1/s)',   value: 'medium',  ms: 1000 },
    { label: 'Fast (3/s)',     value: 'fast',    ms: 333  },
    { label: 'Rapid (10/s)',   value: 'rapid',   ms: 100  },
  ];

  readonly hasCampaigns = computed(() => (this.#campaignService.campaigns.value()?.length ?? 0) > 0);

  readonly campaignOptions = computed<DropdownOption[]>(() =>
    (this.#campaignService.campaigns.value() ?? []).map(c => ({ value: String(c.id), label: c.name })),
  );

  #streamStatusTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.#http.get<StreamStatus>('/api/mock/stream/status').subscribe(s => {
      this.streamRunning.set(s.running);
      this.streamCount.set(s.totalGenerated);
      if (s.running) {
        if (s.config) {
          const speed = this.speedOptions.find(o => o.ms === s.config!.intervalMs)?.value ?? 'medium';
          this.streamForm.patchValue({
            campaignId: s.config.campaignId,
            speed,
            minAmount: s.config.minAmount,
            maxAmount: s.config.maxAmount,
          });
        }
        this.streamForm.disable();
        this.#startStatusPolling();
      }
    });
  }

  ngOnDestroy(): void {
    this.#stopStatusPolling();
  }

  startStream(): void {
    const v = this.streamForm.getRawValue();
    const intervalMs = this.speedOptions.find(o => o.value === v.speed)?.ms ?? 1000;
    this.streamWorking.set(true);
    this.#http.post<StreamStatus>('/api/mock/stream/start', {
      campaignId: Number(v.campaignId),
      intervalMs,
      minAmount: v.minAmount,
      maxAmount: v.maxAmount,
    }).subscribe({
      next: () => {
        this.streamRunning.set(true);
        this.streamCount.set(0);
        this.streamWorking.set(false);
        this.streamForm.disable();
        this.#startStatusPolling();
      },
      error: () => {
        toast.error('Failed to start donation stream');
        this.streamWorking.set(false);
      },
    });
  }

  stopStream(): void {
    this.streamWorking.set(true);
    this.#http.post<StreamStatus>('/api/mock/stream/stop', {}).subscribe({
      next: (s) => {
        this.streamRunning.set(false);
        this.streamCount.set(s.totalGenerated);
        this.streamWorking.set(false);
        this.streamForm.enable();
        this.#stopStatusPolling();
        toast.success(`Stream stopped — ${s.totalGenerated} donations sent`);
        this.#donationService.donationsResource.reload();
      },
      error: () => {
        toast.error('Failed to stop donation stream');
        this.streamWorking.set(false);
      },
    });
  }

  #startStatusPolling(): void {
    this.#stopStatusPolling();
    this.#streamStatusTimer = setInterval(() => {
      this.#http.get<StreamStatus>('/api/mock/stream/status').subscribe(s => {
        this.streamCount.set(s.totalGenerated);
        if (!s.running) {
          this.streamRunning.set(false);
          this.streamForm.enable();
          this.#stopStatusPolling();
        }
      });
    }, 1000);
  }

  #stopStatusPolling(): void {
    if (this.#streamStatusTimer !== null) {
      clearInterval(this.#streamStatusTimer);
      this.#streamStatusTimer = null;
    }
  }
}
