import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppAccountRole, AuthService, AuthUser } from '../auth/auth.service';

export type AccountRole = AppAccountRole;
export type SignupRole = Exclude<AccountRole, 'admin' | 'employee'>;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly signupRequested = new EventEmitter<SignupRole>();
  @Output() readonly loggedIn = new EventEmitter<AuthUser>();
  @Output() readonly demoRequested = new EventEmitter<SignupRole>();
  @Input() set initialRole(value: AccountRole) {
    this.accountRole = value;
  }

  accountRole: AccountRole = 'client';
  loginEmail = '';
  loginPassword = '';
  showPassword = false;
  error = '';
  submitting = false;

  constructor(private readonly auth: AuthService) {}

  chooseAccount(role: AccountRole): void {
    this.accountRole = role;
  }

  requestSignup(): void {
    if (this.accountRole === 'client' || this.accountRole === 'stylist') this.signupRequested.emit(this.accountRole);
  }

  requestDemo(): void {
    if (this.accountRole === 'client' || this.accountRole === 'stylist') this.demoRequested.emit(this.accountRole);
  }

  close(): void {
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
      this.loggedIn.emit(user);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Connexion impossible pour le moment.';
    } finally {
      this.submitting = false;
    }
  }
}
