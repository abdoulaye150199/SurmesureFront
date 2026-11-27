import { Component, Input } from '@angular/core';
import { SubscriptionPlanDefinition } from '../subscription-plans';

/** Public merchant link; amounts and payment confirmation are handled manually. */
export const WAVE_MERCHANT_URL = 'https://pay.wave.com/m/M_sn_pmS768xGpJd-/c/sn/';

@Component({
  selector: 'app-subscription-payment',
  standalone: true,
  templateUrl: './subscription-payment.html',
  styleUrl: './subscription-payment.scss',
})
export class SubscriptionPaymentComponent {
  @Input({ required: true }) plan!: SubscriptionPlanDefinition;
  @Input() email = '';
  @Input() phone = '';

  readonly waveUrl = WAVE_MERCHANT_URL;

  get verificationEmailUrl(): string {
    const subject = `Vérification paiement Wave · ${this.plan.name}`;
    const body = [
      'Bonjour,',
      '',
      'Je souhaite faire vérifier mon paiement d’abonnement Sur Mesure Style.',
      `Formule : ${this.plan.name}`,
      `Montant à vérifier : ${this.plan.price.toLocaleString('fr-FR')} FCFA`,
      `E-mail du compte : ${this.email}`,
      `Téléphone du compte : ${this.phone}`,
      '',
      'Référence de transaction Wave : ',
      'Numéro utilisé pour payer : ',
      'Date du paiement : ',
      '',
      'Merci.',
    ].join('\n');
    return `mailto:bonjour@surmesure.sn?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
