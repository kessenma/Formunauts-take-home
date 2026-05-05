import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dropdown',
  imports: [NgIcon],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class Dropdown {
  readonly options = input<DropdownOption[]>([]);
  readonly value = input<string>('');
  readonly placeholder = input('Select…');
  readonly leadingIcon = input<string>();

  readonly valueChange = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly selectedLabel = computed(
    () => this.options().find(o => o.value === this.value())?.label ?? this.placeholder(),
  );

  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }

  protected toggle(): void {
    this.isOpen.update(v => !v);
  }

  protected select(opt: DropdownOption): void {
    this.valueChange.emit(opt.value);
    this.isOpen.set(false);
  }
}
