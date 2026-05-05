import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-text-input',
  imports: [],
  templateUrl: './text-input.html',
  styleUrl: './text-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInput),
      multi: true,
    },
  ],
})
export class TextInput implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly multiline = input<boolean>(false);
  readonly rows = input<number>(3);
  readonly autoGrow = input<boolean>(false);
  readonly readOnly = input<boolean>(false);
  readonly error = input<string>('');

  protected readonly inputId = `text-input-${nextId++}`;
  protected readonly isFocused = signal(false);
  protected readonly value = signal('');
  protected readonly cvDisabled = signal(false);

  protected readonly hasValue = computed(() => this.value().length > 0);
  protected readonly isDisabled = computed(() => this.cvDisabled());
  protected readonly labelFloats = computed(
    () => this.isFocused() || this.hasValue() || !!this.placeholder(),
  );

  private readonly textareaEl =
    viewChild<ElementRef<HTMLTextAreaElement>>('textareaEl');

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

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

  protected onFocus(): void {
    if (!this.readOnly()) {
      this.isFocused.set(true);
    }
  }

  protected onBlur(): void {
    if (!this.readOnly()) {
      this.isFocused.set(false);
      this.onTouched();
    }
  }

  protected onInput(event: Event): void {
    if (this.readOnly()) return;
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.value.set(el.value);
    this.onChange(el.value);
    if (this.autoGrow() && el instanceof HTMLTextAreaElement) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }
}
