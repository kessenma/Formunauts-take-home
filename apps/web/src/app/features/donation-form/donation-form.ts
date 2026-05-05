import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TextInput } from '../../shared/components/text-input/text-input';
import type { CreateDonationRequest, PaymentMethod, DonationChannel } from '@formunauts/shared';

@Component({
  selector: 'app-donation-form',
  imports: [ReactiveFormsModule, NgIcon, TextInput],
  templateUrl: './donation-form.html',
  styleUrl: './donation-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationForm {
  readonly campaignId = input.required<number>();
  readonly submitted = output<CreateDonationRequest>();

  readonly #fb = inject(FormBuilder);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
    { value: 'sepa_direct_debit', label: 'SEPA Direct Debit' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'google_pay', label: 'Google Pay' },
    { value: 'apple_pay', label: 'Apple Pay' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
  ];

  readonly CHANNELS: Array<{ value: DonationChannel; label: string }> = [
    { value: 'street', label: 'Street' },
    { value: 'door_to_door', label: 'Door to Door' },
    { value: 'event', label: 'Event' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'social_media', label: 'Social Media' },
  ];

  readonly form = this.#fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    email: [''],
    phone: [''],
    amount: [null as unknown as number, [Validators.required, Validators.min(1)]],
    paymentMethod: ['credit_card' as PaymentMethod, Validators.required],
    channel: ['street' as DonationChannel, Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    const { firstName, lastName, email, phone, amount, paymentMethod, channel } = this.form.getRawValue();
    this.submitted.emit({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      amount,
      paymentMethod,
      channel,
      campaignId: this.campaignId(),
    });
  }

  onSuccess(): void {
    this.isSubmitting.set(false);
    this.successMessage.set('Donation submitted successfully!');
    this.form.reset({ paymentMethod: 'credit_card', channel: 'street' });
  }

  onError(msg: string): void {
    this.isSubmitting.set(false);
    this.errorMessage.set(msg);
  }
}
