export type SubscriptionPlan = 'ESSENTIEL' | 'ATELIER' | 'STUDIO';

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlan;
  slug: string;
  name: string;
  price: number;
  audience: string;
  description: string;
  headline: string;
  features: readonly string[];
}

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlanDefinition[] = [
  {
    id: 'ESSENTIEL',
    slug: 'essentiel',
    name: 'Essentiel',
    price: 5000,
    audience: 'Pour démarrer',
    description: 'Présentez votre univers et vos premières créations.',
    headline: 'Donnez vie à votre vitrine.',
    features: [
      'Profil de styliste et vitrine en ligne',
      'Catalogue de vos créations',
      'Suivi de vos commandes',
    ],
  },
  {
    id: 'ATELIER',
    slug: 'atelier',
    name: 'Atelier',
    price: 10000,
    audience: 'Pour organiser votre activité',
    description: 'Réunissez votre clientèle et votre quotidien au même endroit.',
    headline: 'Organisez votre atelier.',
    features: [
      'Tous les services de l’offre Essentiel',
      'Fiches clients et mensurations',
      'Planning et rendez-vous',
    ],
  },
  {
    id: 'STUDIO',
    slug: 'studio',
    name: 'Studio',
    price: 20000,
    audience: 'Pour travailler en équipe',
    description: 'Coordonnez votre équipe et gardez une vue sur votre atelier.',
    headline: 'Faites grandir votre équipe.',
    features: [
      'Tous les services de l’offre Atelier',
      'Gestion de votre équipe',
      'Vue d’ensemble de votre activité',
    ],
  },
];

export function subscriptionFromSlug(slug: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((plan) => plan.slug === slug)?.id ?? null;
}

export function subscriptionConfig(id: SubscriptionPlan) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id)!;
}

export function includesPlan(
  plan: SubscriptionPlan | null | undefined,
  minimum: SubscriptionPlan,
): boolean {
  const rank = { ESSENTIEL: 1, ATELIER: 2, STUDIO: 3 };
  return !!plan && rank[plan] >= rank[minimum];
}
