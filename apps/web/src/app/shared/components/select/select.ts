import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

let nextId = 0;

@Component({
  selector: 'app-select',
  imports: [NgIcon],
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
})
export class Select implements ControlValueAccessor {
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input<string>('Select…');
  readonly label = input<string>('');
  readonly error = input<string>('');

  protected readonly triggerId = `select-trigger-${nextId++}`;
  protected readonly panelId = `select-panel-${nextId++}`;
  protected readonly isOpen = signal(false);
  protected readonly value = signal('');
  protected readonly cvDisabled = signal(false);

  protected readonly hasValue = computed(() => !!this.value());
  protected readonly isDisabled = computed(() => this.cvDisabled());
  protected readonly selectedLabel = computed(
    () => this.options().find(o => o.value === this.value())?.label ?? '',
  );

  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
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

  setDisabledState(isDisabled: boolean): void {
    this.cvDisabled.set(isDisabled);
  }

  protected toggle(): void {
    if (!this.isDisabled()) {
      this.isOpen.update(v => !v);
    }
  }

  protected selectOption(opt: SelectOption): void {
    if (opt.disabled) return;
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.onTouched();
    this.isOpen.set(false);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.isOpen.set(false);
    if (event.key === 'ArrowDown') { event.preventDefault(); this.isOpen.set(true); }
  }
}
