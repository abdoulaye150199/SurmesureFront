import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { AuthService } from './auth.service';

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(
    element: HTMLElement,
    options: { theme: string; size: string; text: string; locale: string },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}
let library: Promise<void> | undefined;
let initializedClient: string | undefined;
let receiveCredential: ((credential: string) => void) | undefined;

function loadGoogle(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  return (library ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      library = undefined;
      script.remove();
      reject(new Error('Impossible de charger Google. Vérifiez votre connexion.'));
    };
    document.head.appendChild(script);
  }));
}

@Component({
  selector: 'app-google-button',
  standalone: true,
  template: `<div #button></div>
    @if (message) {
      <p class="google-status" role="status">{{ message }}</p>
    }`,
  styles: [
    `
      :host {
        display: block;
        margin: 10px 0;
      }
      .google-status {
        font-size: 12px;
        color: #746a6f;
        margin: 6px 0;
      }
    `,
  ],
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  @ViewChild('button', { static: true }) button!: ElementRef<HTMLElement>;
  @Input() mode: 'login' | 'signup' = 'login';
  @Output() readonly credential = new EventEmitter<string>();
  message = '';
  private destroyed = false;
  private readonly receive = (value: string) => {
    if (!this.destroyed) this.credential.emit(value);
  };

  async ngAfterViewInit(): Promise<void> {
    try {
      const { clientId } = await this.auth.googleConfiguration();
      if (this.destroyed) return;
      if (!clientId) {
        this.message = 'Google n’est pas encore disponible.';
        return;
      }
      await loadGoogle();
      if (this.destroyed) return;
      const google = window.google!.accounts.id;
      if (initializedClient !== clientId) {
        google.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => receiveCredential?.(response.credential),
        });
        initializedClient = clientId;
      }
      receiveCredential = this.receive;
      google.renderButton(this.button.nativeElement, {
        theme: 'outline',
        size: 'large',
        text: this.mode === 'signup' ? 'signup_with' : 'signin_with',
        locale: 'fr',
      });
    } catch (error) {
      if (!this.destroyed)
        this.message =
          error instanceof Error ? error.message : 'Google est momentanément indisponible.';
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (receiveCredential === this.receive) receiveCredential = undefined;
  }
}
