import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, filter } from 'rxjs';
import { CampaignService } from './campaign';
import type { Campaign } from '@formunauts/shared';

const mockCampaign: Campaign = {
  id: 1,
  title: 'Test Campaign',
  goal: 50000,
  raised: 25000,
  donorCount: 100,
};

describe('CampaignService', () => {
  let service: CampaignService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CampaignService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CampaignService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    httpMock.expectOne('/api/campaign').flush(mockCampaign);
    expect(service).toBeTruthy();
  });

  it('exposes campaignResource that sends GET /api/campaign', () => {
    const req = httpMock.expectOne('/api/campaign');
    expect(req.request.method).toBe('GET');
    req.flush(mockCampaign);
    expect(service.campaignResource).toBeDefined();
  });

  it('populates resource value on successful response', async () => {
    const resource = service.campaignResource;

    const valuePromise = TestBed.runInInjectionContext(() =>
      firstValueFrom(
        toObservable(resource.value).pipe(filter((v): v is Campaign => v !== undefined))
      )
    );

    httpMock.expectOne('/api/campaign').flush(mockCampaign);

    const value = await valuePromise;
    expect(value).toEqual(mockCampaign);
  });

  it('sets resource error signal on network failure', async () => {
    const resource = service.campaignResource;

    const errorPromise = TestBed.runInInjectionContext(() =>
      firstValueFrom(
        toObservable(resource.error).pipe(filter((e) => e != null))
      )
    );

    httpMock.expectOne('/api/campaign').error(new ProgressEvent('error'));

    const err = await errorPromise;
    expect(err).toBeTruthy();
  });
});
