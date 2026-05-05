import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language';
import { HealthService } from '../../core/services/health';
import { SpikesService } from '../../core/services/spikes';
import { OrganizationService } from '../../core/services/organization';
import { CampaignService } from '../../core/services/campaign';
import { DonationService } from '../../core/services/donation';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Table, type TableColumn } from '../../shared/components/table/table';
import { Accordion } from '../../shared/components/accordion/accordion';
import { AccordionItem } from '../../shared/components/accordion/accordion-item';
import { Tabs } from '../../shared/components/tabs/tabs';
import { TabsList } from '../../shared/components/tabs/tabs-list';
import { TabsTrigger } from '../../shared/components/tabs/tabs-trigger';
import { TabsContent } from '../../shared/components/tabs/tabs-content';
import { DonationForm } from '../donation-form/donation-form';
import { BulkDonationUpload } from '../donation-form/bulk-donation-upload/bulk-donation-upload';
import { TextInput } from '../../shared/components/text-input/text-input';
import { Dropdown, type DropdownOption } from '../../shared/components/dropdown/dropdown';
import { RadioCardGroup } from '../../shared/components/radio-card/radio-card-group';
import { RadioCardItem } from '../../shared/components/radio-card/radio-card-item';
import type { MockDataParams, CreateDonationRequest } from '@formunauts/shared';
import { DonationStreamer } from './donation-streamer/donation-streamer';

@Component({
  selector: 'app-settings',
  imports: [
    LoadingSpinner, Table, DatePipe, ReactiveFormsModule, NgIcon,
    Accordion, AccordionItem,
    Tabs, TabsList, TabsTrigger, TabsContent,
    DonationForm, BulkDonationUpload,
    TextInput, Dropdown, RadioCardGroup, RadioCardItem,
    TranslocoPipe, DonationStreamer,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly #healthService = inject(HealthService);
  readonly #spikesService = inject(SpikesService);
  readonly #orgService = inject(OrganizationService);
  readonly #campaignService = inject(CampaignService);
  readonly #donationService = inject(DonationService);
  readonly #http = inject(HttpClient);
  readonly #fb = inject(FormBuilder);
  readonly #lang = inject(LanguageService);
  readonly #transloco = inject(TranslocoService);

  readonly health = this.#healthService.health;
  readonly spikes = this.#spikesService.spikes;
  readonly organizations = this.#orgService.organizations;
  readonly campaigns = this.#campaignService.campaigns;

  readonly donationFormRef = viewChild(DonationForm);

  readonly orgWorking        = signal(false);
  readonly campaignWorking   = signal(false);
  readonly fundraiserWorking = signal(false);
  readonly mockWorking       = signal(false);

  readonly hasOrgs      = computed(() => (this.organizations.value()?.length ?? 0) > 0);
  readonly hasCampaigns = computed(() => (this.#campaignService.campaigns.value()?.length ?? 0) > 0);
  readonly activeCampaignId = computed(() => {
    const selected = this.#campaignService.campaignResource.value()?.id;
    if (selected) return selected;
    return this.#campaignService.campaigns.value()?.[0]?.id ?? 0;
  });

  readonly campaignStatusOptions = computed<DropdownOption[]>(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { value: 'draft',     label: t('settings.setup.campaign.statusDraft') },
      { value: 'active',    label: t('settings.setup.campaign.statusActive') },
      { value: 'paused',    label: t('settings.setup.campaign.statusPaused') },
      { value: 'completed', label: t('settings.setup.campaign.statusCompleted') },
    ];
  });

  readonly orgOptions = computed<DropdownOption[]>(() =>
    (this.organizations.value() ?? []).map(o => ({ value: String(o.id), label: o.name })),
  );

  readonly spikesEmpty = computed(() => {
    const s = this.spikes();
    return s !== null && s !== undefined && s.length === 0;
  });

  readonly spikeColumns = computed<TableColumn[]>(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { key: 'time',      label: t('settings.spikes.columns.time') },
      { key: 'service',   label: t('settings.spikes.columns.service') },
      { key: 'metric',    label: t('settings.spikes.columns.metric') },
      { key: 'value',     label: t('settings.spikes.columns.value') },
      { key: 'threshold', label: t('settings.spikes.columns.threshold') },
      { key: 'severity',  label: t('settings.spikes.columns.severity') },
    ];
  });

  readonly orgForm = this.#fb.nonNullable.group({
    name:    ['', Validators.required],
    type:    ['npo', Validators.required],
    country: [''],
    website: [''],
  });

  readonly campaignForm = this.#fb.nonNullable.group({
    organizationId: [0, [Validators.required, Validators.min(1)]],
    title:          ['', Validators.required],
    description:    [''],
    goal:           [0, [Validators.required, Validators.min(1)]],
    currency:       ['EUR'],
    status:         ['active'],
    startDate:      [''],
    endDate:        [''],
  });

  readonly fundraiserForm = this.#fb.nonNullable.group({
    organizationId: [0, [Validators.required, Validators.min(1)]],
    firstName:      ['', Validators.required],
    lastName:       ['', Validators.required],
    email:          [''],
    phone:          [''],
  });

  readonly randomForm = this.#fb.nonNullable.group({
    count:     [100, [Validators.required, Validators.min(1), Validators.max(10000)]],
    minAmount: [10,  [Validators.required, Validators.min(1)]],
    maxAmount: [500, [Validators.required, Validators.min(1)]],
    startDate: ['2024-01-01', Validators.required],
    endDate:   ['2025-12-31', Validators.required],
  });

  readonly formattedUptime = computed(() => {
    const s = this.health()?.server.uptimeSeconds ?? 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  });

  readonly lastUpdated = computed(() => {
    const ts = this.health()?.timestamp;
    return ts ? new Date(ts).toLocaleTimeString() : '';
  });

  createOrg(): void {
    if (this.orgForm.invalid || this.orgWorking()) return;
    this.orgWorking.set(true);
    const { name, type, country, website } = this.orgForm.getRawValue();
    this.#http.post<{ id: number }>('/api/organizations', {
      name, type,
      country: country || null,
      website: website || null,
    }).subscribe({
      next: (res) => {
        toast.success(`Organization created`, { description: `"${name}" (id ${res.id})` });
        this.orgWorking.set(false);
        this.orgForm.reset({ type: 'npo' });
        this.#orgService.organizations.reload();
      },
      error: () => {
        toast.error('Failed to create organization');
        this.orgWorking.set(false);
      },
    });
  }

  createCampaign(): void {
    if (this.campaignForm.invalid || this.campaignWorking()) return;
    this.campaignWorking.set(true);
    const v = this.campaignForm.getRawValue();
    this.#http.post<{ id: number }>('/api/campaigns', {
      ...v,
      organizationId: Number(v.organizationId),
      description: v.description || null,
      startDate:   v.startDate || null,
      endDate:     v.endDate   || null,
    }).subscribe({
      next: (res) => {
        toast.success(`Campaign created`, { description: `"${v.title}" (id ${res.id})` });
        this.campaignWorking.set(false);
        this.campaignForm.reset({ currency: 'EUR', status: 'active', organizationId: 0 });
        this.#campaignService.campaigns.reload();
      },
      error: () => {
        toast.error('Failed to create campaign');
        this.campaignWorking.set(false);
      },
    });
  }

  createFundraiser(): void {
    if (this.fundraiserForm.invalid || this.fundraiserWorking()) return;
    this.fundraiserWorking.set(true);
    const v = this.fundraiserForm.getRawValue();
    this.#http.post<{ id: number }>('/api/fundraisers', {
      ...v,
      organizationId: Number(v.organizationId),
      email: v.email || null,
      phone: v.phone || null,
    }).subscribe({
      next: (res) => {
        toast.success(`Fundraiser created`, { description: `${v.firstName} ${v.lastName} (id ${res.id})` });
        this.fundraiserWorking.set(false);
        this.fundraiserForm.reset({ organizationId: 0 });
      },
      error: () => {
        toast.error('Failed to create fundraiser');
        this.fundraiserWorking.set(false);
      },
    });
  }

  onDonationSubmit(req: CreateDonationRequest): void {
    this.#donationService.submit(req).subscribe({
      next: () => {
        toast.success('Donation submitted');
        this.donationFormRef()?.onSuccess();
      },
      error: (err: Error) => {
        toast.error('Submission failed', { description: err.message });
        this.donationFormRef()?.onError(err.message);
      },
    });
  }

  generateRandom(): void {
    if (this.randomForm.invalid || this.mockWorking()) return;
    this.mockWorking.set(true);
    const params = this.randomForm.getRawValue() as MockDataParams;
    this.#http.post<{ inserted: number }>('/api/mock/generate', params).subscribe({
      next: (res) => {
        toast.success(`Generated ${res.inserted} mock donations`);
        this.mockWorking.set(false);
        this.#donationService.donationsResource.reload();
      },
      error: () => {
        toast.error('Failed to generate mock data');
        this.mockWorking.set(false);
      },
    });
  }

  deleteMock(): void {
    if (this.mockWorking()) return;
    if (!confirm('Delete all mock donations? This cannot be undone.')) return;
    this.mockWorking.set(true);
    this.#http.delete<{ deleted: number }>('/api/mock').subscribe({
      next: (res) => {
        toast.success(`Deleted ${res.deleted} mock donations`);
        this.mockWorking.set(false);
        this.#donationService.donationsResource.reload();
      },
      error: () => {
        toast.error('Failed to delete mock data');
        this.mockWorking.set(false);
      },
    });
  }

  onFileSelected(_event: Event): void {
    toast.info('Excel import coming soon');
  }

  dotClass(status: string): string {
    return `status-dot status-dot--${this.#statusMod(status)}`;
  }

  badgeClass(status: string): string {
    return `status-badge status-badge--${this.#statusMod(status)}`;
  }

  severityClass(severity: string): string {
    return severity === 'critical' ? 'spike-severity spike-severity--critical' : 'spike-severity spike-severity--warning';
  }

  formatMetric(metric: string, value: number | null, _service: string): string {
    if (value === null) return '—';
    if (metric === 'response_time') return `${value} ms`;
    if (metric === 'memory_rss') return `${value} MB`;
    return String(value);
  }

  formatThreshold(metric: string, threshold: number | null): string {
    if (threshold === null) return '—';
    if (metric === 'response_time') return `${threshold} ms`;
    if (metric === 'memory_rss') return `${threshold} MB`;
    return String(threshold);
  }

  #statusMod(status: string): string {
    if (status === 'ok') return 'ok';
    if (['slow', 'loading', 'downloading', 'paused'].includes(status)) return 'warn';
    if (status === 'error') return 'error';
    return 'unknown';
  }
}
