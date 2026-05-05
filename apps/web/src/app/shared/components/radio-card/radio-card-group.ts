import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RADIO_CARD_TOKEN, RadioCardContext } from './radio-card-token';

@Component({
  selector: 'app-radio-card-group',
  imports: [],
  template: `
    <div
      class="radio-card-group"
      [class.radio-card-group--column]="direction() === 'column'"
      role="radiogroup"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './radio-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioCardGroup),
      multi: true,
    },
    {
      provide: RADIO_CARD_TOKEN,
      useExisting: forwardRef(() => RadioCardGroup),
    },
  ],
})
export class RadioCardGroup implements ControlValueAccessor, RadioCardContext {
  readonly direction = input<'row' | 'column'>('row');

  readonly value = signal('');

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  select(v: string): void {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
  }

  writeValue(val: string): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(): void {}
}
