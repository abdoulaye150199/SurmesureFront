import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { clearStoredAuthSession, readAuthSession } from './auth-session.storage';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = readAuthSession();

  const authenticatedRequest = session?.token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.includes('/auth/')
      ) {
        clearStoredAuthSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('surmesure:session-expired'));
        }
      }
      return throwError(() => error);
    }),
  );
};
