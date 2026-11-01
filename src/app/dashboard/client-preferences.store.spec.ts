import { ClientPreferencesStore } from './client-preferences.store';

describe('ClientPreferencesStore', () => {
  const store = new ClientPreferencesStore();

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('ignores invalid saved creations and keeps valid entries', () => {
    localStorage.setItem(
      'surmesure.selection',
      JSON.stringify([
        {
          name: 'Boubou',
          stylist: 'Atelier Awa',
          price: 50000,
          image: '/look.jpg',
          category: 'Boubous',
          tone: 'sand',
        },
        { name: 'Corrompue', stylist: 'Atelier Awa', price: '50000' },
      ]),
    );

    expect(store.loadCreations()).toEqual([
      {
        name: 'Boubou',
        stylist: 'Atelier Awa',
        price: 50000,
        image: '/look.jpg',
        category: 'Boubous',
        tone: 'sand',
      },
    ]);
  });

  it('keeps delivery reminders scoped to the account', () => {
    store.saveReadDeliveryReminderKeys('client-1', ['order-1:2026-11-02']);

    expect(store.loadReadDeliveryReminderKeys('client-1')).toEqual(['order-1:2026-11-02']);
    expect(store.loadReadDeliveryReminderKeys('client-2')).toEqual([]);
  });
});
