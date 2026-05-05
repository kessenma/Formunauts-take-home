import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { Organization } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  readonly organizations = httpResource<Organization[]>(() => '/api/organizations');
}
