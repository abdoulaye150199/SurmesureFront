import { TestBed } from '@angular/core/testing';
import { SignupPageComponent } from './signup-page';
import { AuthService, AuthUser } from '../auth/auth.service';
import { SUBSCRIPTION_PLANS } from '../subscription-plans';

describe('Plan registration awaiting approval', () => {
  for (const plan of SUBSCRIPTION_PLANS) {
    it(`submits ${plan.name} and shows a pending account without opening a workspace`, async () => {
      const pending = {
        status: 'pending',
        message: 'Validation en attente',
        data: { email: 'atelier@example.test', isActive: false },
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
    });
  }

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
