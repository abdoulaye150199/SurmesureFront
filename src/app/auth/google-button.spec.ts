import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { GoogleButtonComponent } from './google-button';

describe('GoogleButtonComponent', () => {
  it('delivers Google credentials inside Angular so the authentication UI updates', async () => {
    const originalGoogle = window.google;
    let callback!: (response: { credential: string }) => void;
    window.google = {
      accounts: {
        id: {
          initialize: (options) => {
            callback = options.callback;
          },
          renderButton: () => undefined,
        },
      },
    };
    TestBed.configureTestingModule({
      imports: [GoogleButtonComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            googleConfiguration: async () => ({ clientId: 'test-client' }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(GoogleButtonComponent);
    try {
      fixture.detectChanges();
      await fixture.whenStable();
      const received: string[] = [];
      fixture.componentInstance.credential.subscribe((credential) => {
        expect(NgZone.isInAngularZone()).toBeTrue();
        received.push(credential);
      });
      TestBed.inject(NgZone).runOutsideAngular(() => callback({ credential: 'google-token' }));
      expect(received).toEqual(['google-token']);
      fixture.destroy();
      callback({ credential: 'late-token' });
      expect(received).toEqual(['google-token']);
    } finally {
      fixture.destroy();
      window.google = originalGoogle;
    }
  });
});
