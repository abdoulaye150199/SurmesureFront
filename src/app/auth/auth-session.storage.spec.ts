import {
  AUTH_SESSION_KEY,
  clearStoredAuthSession,
  readAuthSession,
  writeAuthSession,
} from './auth-session.storage';
import { AuthSession } from './auth.service';

describe('auth session storage', () => {
  const session: AuthSession = {
    token: 'access-token',
    refreshToken: 'refresh-token',
    data: {
      id: 'client-1',
      role: 'CLIENT',
      firstName: 'Awa',
      lastName: 'Diop',
      email: 'awa@example.com',
      phone: '+221770000000',
      profileImage: '',
      isActive: true,
    },
  };

  beforeEach(() => clearStoredAuthSession());
  afterEach(() => clearStoredAuthSession());

  it('stores a valid session only for the current browser tab', () => {
    writeAuthSession(session);

    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toEqual(JSON.stringify(session));
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(readAuthSession()).toEqual(session);
  });

  it('moves an existing session out of persistent local storage', () => {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

    expect(readAuthSession()).toEqual(session);
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toEqual(JSON.stringify(session));
    expect(localStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });

  it('discards malformed session data before the interceptor can use it', () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token: 'invalid' }));

    expect(readAuthSession()).toBeNull();
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });
});
