import { TestBed } from '@angular/core/testing';
import { SignupPageComponent } from './signup-page';
import { AuthService, AuthUser } from '../auth/auth.service';
import { SUBSCRIPTION_PLANS } from '../subscription-plans';
import { WAVE_MERCHANT_URL } from '../subscription-payment/subscription-payment';

describe('Plan registration awaiting approval', () => {
  for (const plan of SUBSCRIPTION_PLANS) {
    it(`submits ${plan.name} and shows a pending account without opening a workspace`, async () => {
      const pending = {
        status: 'pending',
        message: 'Validation en attente',
        data: {
          email: 'atelier@example.test',
          phone: '+221770000000',
          requestedPlan: plan.id,
          isActive: false,
        },
      };
      const api = { register: jasmine.createSpy().and.resolveTo(pending) };
      TestBed.configureTestingModule({
        imports: [SignupPageComponent],
        providers: [{ provide: AuthService, useValue: api }],
      });
      const fixture = TestBed.createComponent(SignupPageComponent);
      const component = fixture.componentInstance;
      component.initialPlan = plan.id;
      Object.assign(component, {
        firstName: 'Awa',
        lastName: 'Diop',
        businessName: 'Atelier Awa',
        email: 'atelier@example.test',
        phone: '+221770000000',
        password: 'MotDePasse!2026',
        passwordConfirmation: 'MotDePasse!2026',
      });
      const created = spyOn(component.accountCreated, 'emit');
      await component.submit();
      fixture.detectChanges();

      expect(api.register).toHaveBeenCalledWith(
        'stylist',
        jasmine.objectContaining({ requestedPlan: plan.id, businessName: 'Atelier Awa' }),
      );
      expect(created).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Validation en attente.');
      expect(fixture.nativeElement.textContent).toContain(`Formule demandée : ${plan.name}`);
      expect(component.password).toBe('');

      const paymentLink: HTMLAnchorElement =
        fixture.nativeElement.querySelector('.wave-payment-link');
      expect(paymentLink.href).toBe(WAVE_MERCHANT_URL);
      expect(paymentLink.target).toBe('_blank');
      expect(paymentLink.rel).toContain('noopener');
      expect(fixture.nativeElement.querySelector('.wave-payment-amount').textContent).toContain(
        plan.price.toLocaleString('fr-FR'),
      );
      const pendingBeforePayment = component.pending;
      paymentLink.addEventListener('click', (event) => event.preventDefault());
      paymentLink.click();
      expect(component.pending).toBe(pendingBeforePayment);
      expect(created).not.toHaveBeenCalled();
      expect(api.register).toHaveBeenCalledTimes(1);

      const verificationLink: HTMLAnchorElement =
        fixture.nativeElement.querySelector('.wave-verification-link');
      const email = new URL(verificationLink.href);
      expect(email.pathname).toBe('bonjour@surmesure.sn');
      expect(email.searchParams.get('body')).toContain('E-mail du compte : atelier@example.test');
      expect(email.searchParams.get('body')).toContain('Téléphone du compte : +221770000000');
      expect(email.searchParams.get('body')).toContain('Référence de transaction Wave :');
    });
  }

  it('offers Wave after Google registration using the account email and plan returned by the server', async () => {
    const pending = {
      status: 'pending',
      message: 'Validation en attente',
      data: {
        email: 'google-atelier@example.test',
        phone: '+221780000000',
        requestedPlan: 'ATELIER',
        isActive: false,
      },
    };
    const api = { registerGoogle: jasmine.createSpy().and.resolveTo(pending) };
    TestBed.configureTestingModule({
      imports: [SignupPageComponent],
      providers: [{ provide: AuthService, useValue: api }],
    });
    const fixture = TestBed.createComponent(SignupPageComponent);
    const component = fixture.componentInstance;
    component.initialPlan = 'STUDIO';
    Object.assign(component, {
      firstName: 'Awa',
      lastName: 'Diop',
      businessName: 'Atelier Awa',
      phone: '+221780000000',
      googleCredential: 'google-token',
    });
    const created = spyOn(component.accountCreated, 'emit');
    await component.submit();
    fixture.detectChanges();
    const verificationLink: HTMLAnchorElement =
      fixture.nativeElement.querySelector('.wave-verification-link');
    const body = new URL(verificationLink.href).searchParams.get('body');
    expect(body).toContain('google-atelier@example.test');
    expect(body).toContain('Formule : Atelier');
    expect(fixture.nativeElement.querySelector('.wave-payment-link').href).toBe(WAVE_MERCHANT_URL);
    expect(component.googleCredential).toBe('');
    expect(created).not.toHaveBeenCalled();
  });

  it('preserves the normal client registration flow', async () => {
    const user = { id: 'client', role: 'CLIENT', isActive: true } as AuthUser;
    const api = { register: jasmine.createSpy().and.resolveTo(user) };
    TestBed.configureTestingModule({
      imports: [SignupPageComponent],
      providers: [{ provide: AuthService, useValue: api }],
    });
    const component = TestBed.createComponent(SignupPageComponent).componentInstance;
    Object.assign(component, {
      firstName: 'Awa',
      lastName: 'Diop',
      email: 'client@example.test',
      phone: '+221770000000',
      password: 'MotDePasse!2026',
      passwordConfirmation: 'MotDePasse!2026',
    });
    const created = spyOn(component.accountCreated, 'emit');
    await component.submit();
    expect(created).toHaveBeenCalledWith(user);
    expect(component.pending).toBeNull();
    expect(api.register.calls.mostRecent().args[1].requestedPlan).toBeUndefined();
  });
});
