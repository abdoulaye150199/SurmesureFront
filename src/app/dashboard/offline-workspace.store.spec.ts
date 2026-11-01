import { OfflineWorkspaceStore } from './offline-workspace.store';

describe('OfflineWorkspaceStore', () => {
  const store = new OfflineWorkspaceStore();

  it('persists the snapshot for its account and role only, then clears it on logout', async () => {
    const snapshot = {
      userId: 'employee-offline-test',
      role: 'employee' as const,
      savedAt: '2026-10-29T12:00:00.000Z',
      measurements: [],
    };

    await store.save(snapshot);
    expect(await store.load(snapshot.userId, snapshot.role)).toEqual(snapshot);
    expect(await store.load('another-employee', 'employee')).toBeNull();
    expect(await store.load(snapshot.userId, 'stylist')).toBeNull();

    await store.clear();
    expect(await store.load(snapshot.userId, snapshot.role)).toBeNull();
  });

  it('does not expose offline records after their retention period', async () => {
    const expiredSnapshot = {
      userId: 'employee-expired-test',
      role: 'employee' as const,
      savedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      measurements: [],
    };

    await store.save(expiredSnapshot);

    expect(await store.load(expiredSnapshot.userId, expiredSnapshot.role)).toBeNull();
    await store.clear();
  });
});
