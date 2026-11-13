import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
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
    options: {
      theme: string;
      size: string;
      text: string;
      locale: string;
      shape: string;
      width: number;
    },
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
    let script = document.querySelector<HTMLScriptElement>('#google-identity-services');
    const shouldAppend = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
    }
    const fail = () => {
      window.clearTimeout(timer);
      library = undefined;
      if (shouldAppend) script?.remove();
      reject(new Error('Impossible de charger Google. Vérifiez votre connexion puis réessayez.'));
    };
    const timer = window.setTimeout(fail, 15000);
    script.addEventListener('load', () => {
      if (!window.google?.accounts.id) {
        fail();
        return;
      }
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (shouldAppend) document.head.appendChild(script);
  }));
}

@Component({
  selector: 'app-google-button',
  standalone: true,
  template: `<div class="google-button-wrap" [class.is-loading]="loading" #button>
      @if (loading) { <span class="google-placeholder" aria-hidden="true"><i>G</i>Se connecter avec Google</span> }
    </div>
    @if (message) {
      <p class="google-status" role="status">{{ message }}</p>
    }`,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin: 16px 0 20px;
      }
      .google-button-wrap {
        display: flex;
        justify-content: center;
        max-width: 100%;
        width: min(280px, 100%);
        min-height: 40px;
        position: relative;
        border-radius: 999px;
        box-shadow: 0 4px 14px rgba(72, 0, 72, 0.08);
      }
      .google-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 30px;
        border: 1px solid #dadce0;
        border-radius: 999px;
        background: #fff;
        color: #1f1f1f;
        font: 500 14px Arial, sans-serif;
      }
      .google-placeholder i { font-size: 18px; font-style: normal; font-weight: 700; color: #4285f4; }
      .google-button-wrap.is-loading { box-shadow: none; }
      .google-status {
        font-size: 12px;
        color: #746a6f;
        margin: 6px 0;
        text-align: center;
      }
    `,
  ],
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  @ViewChild('button', { static: true }) button!: ElementRef<HTMLElement>;
  @Input() mode: 'login' | 'signup' = 'login';
  @Output() readonly credential = new EventEmitter<string>();
  message = '';
  loading = true;
  private destroyed = false;
  private readonly onGoogleFrameLoad = (event: Event) => {
    if (event.target instanceof HTMLIFrameElement) {
      this.zone.run(() => (this.loading = false));
    }
  };
  private readonly receive = (value: string) => {
    this.zone.run(() => {
      if (!this.destroyed) this.credential.emit(value);
    });
  };

  async ngAfterViewInit(): Promise<void> {
    try {
      const { clientId } = await this.auth.googleConfiguration();
      if (this.destroyed) return;
      if (!clientId) {
        this.message = 'Google n’est pas encore disponible.';
        this.loading = false;
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
      this.button.nativeElement.addEventListener('load', this.onGoogleFrameLoad, true);
      google.renderButton(this.button.nativeElement, {
        theme: 'outline',
        size: 'large',
        text: this.mode === 'signup' ? 'signup_with' : 'signin_with',
        locale: 'fr',
        shape: 'pill',
        width: Math.min(280, this.button.nativeElement.parentElement?.clientWidth || 280),
      });
    } catch (error) {
      if (!this.destroyed) {
        this.loading = false;
        this.message =
          error instanceof Error ? error.message : 'Google est momentanément indisponible.';
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.button.nativeElement.removeEventListener('load', this.onGoogleFrameLoad, true);
    if (receiveCredential === this.receive) receiveCredential = undefined;
  }
}
