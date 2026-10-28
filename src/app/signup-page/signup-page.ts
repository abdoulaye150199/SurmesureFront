import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignupRole } from '../login/login';
import { AuthService, AuthUser } from '../auth/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.scss'
})
export class SignupPageComponent {
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loginRequested = new EventEmitter<SignupRole>();
  @Output() readonly accountCreated = new EventEmitter<AuthUser>();
  @Input() set initialRole(value: SignupRole) {
    this.accountRole = value;
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

  constructor(private readonly auth: AuthService) {}

  get isStylist(): boolean {
    return this.accountRole === 'stylist';
  }

  chooseAccount(role: SignupRole): void {
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
    this.error = '';
    if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.password) {
      this.error = 'Remplissez tous les champs obligatoires.';
      return;
    }
    if (this.isStylist && !this.businessName) {
      this.error = 'Indiquez le nom de votre atelier.';
      return;
    }
    if (this.password.length < 10) {
      this.error = 'Le mot de passe doit contenir au moins 10 caractères.';
      return;
    }
    if (this.password !== this.passwordConfirmation) {
      this.error = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.submitting = true;
    try {
      const body = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
        ...(this.isStylist ? { businessName: this.businessName } : {})
      };
      const user = await this.auth.register(this.accountRole, body);
      this.accountCreated.emit(user);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Le serveur est momentanément indisponible. Réessayez.';
    } finally {
      this.submitting = false;
    }
  }

}
