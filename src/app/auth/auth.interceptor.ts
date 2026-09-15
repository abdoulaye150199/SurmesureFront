import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AUTH_SESSION_KEY, AuthSession } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  let session: AuthSession | null = null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    session = raw ? JSON.parse(raw) as AuthSession : null;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  const authenticatedRequest = session?.token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } })
    : request;

  return next(authenticatedRequest).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes('/auth/')) {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    return throwError(() => error);
  }));
};
