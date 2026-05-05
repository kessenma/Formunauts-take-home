import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import type { SlashMention, SlashCommandType } from '@formunauts/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  solarArrowRightBoldDuotone,
  solarAltArrowLeftBoldDuotone,
  solarAltArrowRightBoldDuotone,
  solarCloseCircleBoldDuotone,
  solarFlagBoldDuotone,
  solarTargetBoldDuotone,
  solarUserRoundedBoldDuotone,
  solarCardBoldDuotone,
  solarHashtagBoldDuotone,
  solarCalendarBoldDuotone,
  solarTagBoldDuotone,
} from '@ng-icons/solar-icons/bold-duotone';
import { TextInput } from '../text-input/text-input';

interface SlashMenuItem { id: number | null; label: string; value?: string; }

@Component({
  selector: 'app-chat-input',
  standalone: true,
  host: { 'class': 'chat-input' },
  imports: [ReactiveFormsModule, NgIcon, TextInput],
  providers: [provideIcons({
    solarArrowRightBoldDuotone,
    solarAltArrowLeftBoldDuotone, solarAltArrowRightBoldDuotone,
    solarCloseCircleBoldDuotone,
    solarFlagBoldDuotone, solarTargetBoldDuotone, solarUserRoundedBoldDuotone,
    solarCardBoldDuotone, solarHashtagBoldDuotone, solarCalendarBoldDuotone, solarTagBoldDuotone,
  })],
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ChatInput implements OnDestroy {
  readonly #http = inject(HttpClient);

  readonly placeholder = input<string>('Ask about donations… (/ for context)');
  readonly submitDisabled = input<boolean>(false);
  readonly submitted = output<{ question: string; mentions: SlashMention[] }>();

  readonly questionControl = new FormControl('', { nonNullable: true });
  readonly mentions = signal<SlashMention[]>([]);
  readonly slashMenuOpen = signal(false);
  readonly slashMenuLevel = signal<1 | 2>(1);
  readonly slashMenuType = signal<SlashCommandType | null>(null);
  readonly slashMenuSearch = signal('');
  readonly slashMenuFocusIndex = signal(0);
  readonly slashMenuItems = signal<SlashMenuItem[]>([]);
  readonly slashMenuLoading = signal(false);
  readonly #activeSlashToken = signal('');

  readonly questionInput = viewChild<ElementRef<HTMLElement>>('questionInput');

  #slashSub: Subscription | null = null;
  #donorSearchTimer?: ReturnType<typeof setTimeout>;

  readonly SLASH_COMMANDS = [
    { type: 'organization' as const, label: 'Organization', icon: 'solarFlagBoldDuotone' },
    { type: 'campaign'     as const, label: 'Campaign',     icon: 'solarTargetBoldDuotone' },
    { type: 'donor'        as const, label: 'Donor',        icon: 'solarUserRoundedBoldDuotone' },
    { type: 'payment'      as const, label: 'Payment Method', icon: 'solarCardBoldDuotone' },
    { type: 'channel'      as const, label: 'Channel',      icon: 'solarHashtagBoldDuotone' },
    { type: 'date'         as const, label: 'Date',         icon: 'solarCalendarBoldDuotone' },
  ];

  readonly filteredCommands = computed(() => {
    const token = this.#activeSlashToken().slice(1).toLowerCase();
    if (!token) return this.SLASH_COMMANDS;
    return this.SLASH_COMMANDS.filter(c =>
      c.type.startsWith(token) || c.label.toLowerCase().startsWith(token));
  });

  readonly filteredItems = computed(() => {
    const search = this.slashMenuSearch().toLowerCase();
    if (!search) return this.slashMenuItems();
    return this.slashMenuItems().filter(i => i.label.toLowerCase().includes(search));
  });

  constructor() {
    this.#slashSub = this.questionControl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(v => this.#detectSlash(v));
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.#closeMenu();
  }

  submit(): void {
    const question = this.questionControl.value.trim();
    if (!question || this.submitDisabled()) return;
    const mentions = this.mentions();
    this.submitted.emit({ question, mentions });
    this.questionControl.reset();
    this.mentions.set([]);
  }

  #detectSlash(value: string): void {
    const match = /(?:^|\s)(\/\w*)$/.exec(value);
    if (match) {
      this.#activeSlashToken.set(match[1]);
      this.slashMenuOpen.set(true);
      this.slashMenuLevel.set(1);
      this.slashMenuFocusIndex.set(0);
    } else {
      this.#closeMenu();
    }
  }

  #closeMenu(): void {
    this.slashMenuOpen.set(false);
    this.slashMenuLevel.set(1);
    this.slashMenuType.set(null);
    this.slashMenuSearch.set('');
    this.slashMenuFocusIndex.set(0);
  }

  selectCommandType(type: SlashCommandType): void {
    this.slashMenuType.set(type);
    this.slashMenuLevel.set(2);
    this.slashMenuFocusIndex.set(0);
    this.slashMenuSearch.set('');

    if (type === 'payment') {
      this.slashMenuItems.set([
        { id: null, label: 'SEPA Direct Debit',  value: 'sepa_direct_debit' },
        { id: null, label: 'Credit Card',         value: 'credit_card' },
        { id: null, label: 'Google Pay',          value: 'google_pay' },
        { id: null, label: 'Apple Pay',           value: 'apple_pay' },
        { id: null, label: 'PayPal',              value: 'paypal' },
        { id: null, label: 'Bank Transfer',       value: 'bank_transfer' },
        { id: null, label: 'Cash',                value: 'cash' },
      ]);
    } else if (type === 'channel') {
      this.slashMenuItems.set([
        { id: null, label: 'Street',       value: 'street' },
        { id: null, label: 'Door to Door', value: 'door_to_door' },
        { id: null, label: 'Event',        value: 'event' },
        { id: null, label: 'Phone',        value: 'phone' },
        { id: null, label: 'Email',        value: 'email' },
        { id: null, label: 'Social Media', value: 'social_media' },
      ]);
    } else if (type === 'date') {
      this.slashMenuItems.set([]);
    } else {
      this.#fetchItems(type as 'organization' | 'campaign' | 'donor');
    }
  }

  #fetchItems(type: 'organization' | 'campaign' | 'donor', search = ''): void {
    this.slashMenuLoading.set(true);
    let url: string;
    if (type === 'organization') {
      url = '/api/organizations';
    } else if (type === 'campaign') {
      url = '/api/campaigns';
    } else {
      const p = new URLSearchParams({ limit: '50' });
      if (search) p.set('search', search);
      url = `/api/donors?${p}`;
    }

    this.#http.get<unknown>(url).subscribe({
      next: (data) => {
        if (type === 'organization') {
          this.slashMenuItems.set(
            (data as { id: number; name: string }[]).map(o => ({ id: o.id, label: o.name })),
          );
        } else if (type === 'campaign') {
          this.slashMenuItems.set(
            (data as { id: number; name: string }[]).map(c => ({ id: c.id, label: c.name })),
          );
        } else {
          const paginated = data as { data: { id: number; firstName: string; lastName: string }[] };
          this.slashMenuItems.set(
            paginated.data.map(d => ({ id: d.id, label: `${d.firstName} ${d.lastName}` })),
          );
        }
        this.slashMenuLoading.set(false);
      },
      error: () => this.slashMenuLoading.set(false),
    });
  }

  onSlashSearchInput(value: string): void {
    this.slashMenuSearch.set(value);
    if (this.slashMenuType() === 'donor') {
      clearTimeout(this.#donorSearchTimer);
      this.#donorSearchTimer = setTimeout(() => this.#fetchItems('donor', value), 300);
    }
  }

  tagTable(type: SlashCommandType): void {
    if (type === 'date') {
      this.selectCommandType(type);
      return;
    }
    const cmd = this.SLASH_COMMANDS.find(c => c.type === type)!;
    this.mentions.update(m => [...m, { type, label: cmd.label, id: null }]);
    const current = this.questionControl.value;
    const token = this.#activeSlashToken();
    this.questionControl.setValue(current.slice(0, current.lastIndexOf(token)).trimEnd(), { emitEvent: false });
    this.#closeMenu();
    this.#focusInput();
  }

  commitItem(item: SlashMenuItem): void {
    const type = this.slashMenuType();
    if (!type) return;
    this.mentions.update(m => [...m, { type, label: item.label, id: item.id, value: item.value }]);
    const current = this.questionControl.value;
    const token = this.#activeSlashToken();
    this.questionControl.setValue(current.slice(0, current.lastIndexOf(token)).trimEnd(), { emitEvent: false });
    this.#closeMenu();
    this.#focusInput();
  }

  commitDate(value: string): void {
    if (!value.trim()) return;
    this.mentions.update(m => [...m, { type: 'date', label: value.trim(), id: null }]);
    const current = this.questionControl.value;
    const token = this.#activeSlashToken();
    this.questionControl.setValue(current.slice(0, current.lastIndexOf(token)).trimEnd(), { emitEvent: false });
    this.#closeMenu();
    this.#focusInput();
  }

  removeMention(index: number): void {
    this.mentions.update(m => m.filter((_, i) => i !== index));
  }

  getChipIcon(type: SlashCommandType): string {
    return this.SLASH_COMMANDS.find(c => c.type === type)?.icon ?? 'solarTagBoldDuotone';
  }

  getCommandLabel(type: SlashCommandType | null): string {
    return this.SLASH_COMMANDS.find(c => c.type === type)?.label ?? '';
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (!this.slashMenuOpen()) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.submit();
      }
      return;
    }
    const level = this.slashMenuLevel();
    const list = level === 1 ? this.filteredCommands() : this.filteredItems();
    const len = Math.max(list.length, 1);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.#closeMenu();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.slashMenuFocusIndex.update(i => (i + 1) % len);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.slashMenuFocusIndex.update(i => (i - 1 + len) % len);
    } else if (event.key === 'Enter' && list.length > 0) {
      event.preventDefault();
      const idx = this.slashMenuFocusIndex();
      if (level === 1) {
        this.tagTable((list as typeof this.SLASH_COMMANDS)[idx].type);
      } else {
        this.commitItem(list[idx] as SlashMenuItem);
      }
    } else if (event.key === 'ArrowRight' && level === 1 && list.length > 0) {
      event.preventDefault();
      this.selectCommandType((list as typeof this.SLASH_COMMANDS)[this.slashMenuFocusIndex()].type);
    } else if (event.key === 'Backspace' && level === 2) {
      event.preventDefault();
      this.slashMenuLevel.set(1);
      this.slashMenuFocusIndex.set(0);
    }
  }

  ngOnDestroy(): void {
    this.#slashSub?.unsubscribe();
    clearTimeout(this.#donorSearchTimer);
  }

  #focusInput(): void {
    (this.questionInput()?.nativeElement.querySelector('.text-input__field') as HTMLElement | null)?.focus();
  }
}
