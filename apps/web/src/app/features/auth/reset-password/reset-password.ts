import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly errorMessage = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');

  readonly form = this.fb.nonNullable.group({
    token: [this.token(), [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { token, newPassword } = this.form.getRawValue();
    const error = await this.authService.resetPassword(token, newPassword);
    this.submitting.set(false);
    if (error) {
      this.errorMessage.set(error);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
