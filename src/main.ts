import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      const isLocalDevelopment = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1';

      if (isLocalDevelopment) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => void registration.unregister());
        });
        void caches.keys().then((keys) => {
          keys.forEach((key) => void caches.delete(key));
        });
      } else {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((registration) => {
          void registration.update();
        }).catch((error) => console.warn('Service worker non disponible', error));
      }
    }
  })
  .catch((err) => console.error(err));
