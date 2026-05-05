import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-accordion',
  imports: [],
  template: `<div class="accordion"><ng-content /></div>`,
  styleUrl: './accordion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class Accordion {}
