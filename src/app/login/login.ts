import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppAccountRole, AuthService, AuthUser } from '../auth/auth.service';
import { GoogleButtonComponent } from '../auth/google-button';

export type AccountRole = AppAccountRole;
export type SignupRole = Exclude<AccountRole, 'admin' | 'employee'>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly signupRequested = new EventEmitter<SignupRole>();
  @Output() readonly loggedIn = new EventEmitter<AuthUser>();
  @Input() set initialRole(value: AccountRole) {
    this.accountRole = value;
  }

  accountRole: AccountRole = 'client';
  isOpen = true;
  loginEmail = '';
  loginPassword = '';
  showPassword = false;
  error = '';
  submitting = false;

  requestSignup(): void {
    if (this.accountRole === 'client' || this.accountRole === 'stylist')
      this.signupRequested.emit(this.accountRole);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closed.emit();
  }

  async submit(): Promise<void> {
    this.error = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.error = 'Saisissez votre adresse e-mail et votre mot de passe.';
      return;
    }
    this.submitting = true;
    try {
      const user = await this.auth.login(this.loginEmail, this.loginPassword, this.accountRole);
      this.close();
      this.loggedIn.emit(user);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Connexion impossible pour le moment.';
    } finally {
      this.submitting = false;
    }
  }

  async loginGoogle(credential: string): Promise<void> {
    if (this.submitting) return;
    this.error = '';
    this.submitting = true;
    try {
      const user = await this.auth.loginGoogle(credential);
      this.close();
      this.loggedIn.emit(user);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Connexion Google impossible.';
    } finally {
      this.submitting = false;
    }
  }
}
