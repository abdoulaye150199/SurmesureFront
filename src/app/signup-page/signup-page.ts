import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignupRole } from '../login/login';
import {
  AuthService,
  AuthUser,
  isPendingRegistration,
  PendingRegistration,
} from '../auth/auth.service';
import { SUBSCRIPTION_PLANS, SubscriptionPlan, subscriptionConfig } from '../subscription-plans';
import { GoogleButtonComponent } from '../auth/google-button';
import { SubscriptionPaymentComponent } from '../subscription-payment/subscription-payment';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleButtonComponent, SubscriptionPaymentComponent],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.scss',
})
export class SignupPageComponent {
  private readonly auth = inject(AuthService);
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loginRequested = new EventEmitter<SignupRole>();
  @Output() readonly accountCreated = new EventEmitter<AuthUser>();
  @Input() set initialRole(value: SignupRole) {
    this.accountRole = value;
  }
  @Input() set initialPlan(value: SubscriptionPlan | null) {
    this.planLocked = !!value;
    this.requestedPlan = value ?? 'ESSENTIEL';
    if (value) this.accountRole = 'stylist';
    this.pending = null;
  }

  readonly plans = SUBSCRIPTION_PLANS;
  requestedPlan: SubscriptionPlan = 'ESSENTIEL';
  planLocked = false;
  pending: PendingRegistration | null = null;

  get plan() {
    return subscriptionConfig(this.pending?.data.requestedPlan ?? this.requestedPlan);
  }

  private finishRegistration(result: AuthUser | PendingRegistration): void {
    if (isPendingRegistration(result)) {
      this.pending = result;
      this.password = '';
      this.passwordConfirmation = '';
      this.googleCredential = '';
    } else this.accountCreated.emit(result);
  }

  accountRole: SignupRole = 'client';
  firstName = '';
  lastName = '';
  businessName = '';
  phone = '';
  email = '';
  password = '';
  passwordConfirmation = '';
  showPassword = false;
  showPasswordConfirmation = false;
  error = '';
  submitting = false;
  googleCredential = '';

  selectGoogle(credential: string): void {
    this.googleCredential = credential;
    this.password = '';
    this.passwordConfirmation = '';
    this.error = '';
  }

  get isStylist(): boolean {
    return this.accountRole === 'stylist';
  }

  chooseAccount(role: SignupRole): void {
    if (this.planLocked) return;
    this.accountRole = role;
    this.error = '';
  }

  back(): void {
    this.closed.emit();
  }

  goToLogin(): void {
    this.loginRequested.emit(this.accountRole);
  }

  async submit(): Promise<void> {
    if (this.submitting) return;
    this.error = '';
    if (
      !this.firstName ||
      !this.lastName ||
      !this.phone ||
      (!this.googleCredential && (!this.email || !this.password))
    ) {
      this.error = 'Remplissez tous les champs obligatoires.';
      return;
    }
    if (this.isStylist && !this.businessName) {
      this.error = 'Indiquez le nom de votre atelier.';
      return;
    }
    if (!this.googleCredential && this.password.length < 10) {
      this.error = 'Le mot de passe doit contenir au moins 10 caractères.';
      return;
    }
    if (!this.googleCredential && this.password !== this.passwordConfirmation) {
      this.error = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.submitting = true;
    try {
      if (this.googleCredential) {
        const user = await this.auth.registerGoogle({
          credential: this.googleCredential,
          role: this.accountRole,
          firstName: this.firstName,
          lastName: this.lastName,
          phone: this.phone,
          ...(this.isStylist ? { businessName: this.businessName } : {}),
          ...(this.isStylist ? { requestedPlan: this.requestedPlan } : {}),
        });
        this.finishRegistration(user);
        return;
      }
      const body = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
        ...(this.isStylist ? { businessName: this.businessName } : {}),
        ...(this.isStylist ? { requestedPlan: this.requestedPlan } : {}),
      };
      const user = await this.auth.register(this.accountRole, body);
      this.finishRegistration(user);
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Le serveur est momentanément indisponible. Réessayez.';
    } finally {
      this.submitting = false;
    }
  }
}
