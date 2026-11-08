import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'explore', pathMatch: 'full', children: [] },
  { path: 'measure', pathMatch: 'full', children: [] },
  { path: 'signup', pathMatch: 'full', children: [] },
  { path: 'admin', pathMatch: 'full', children: [] },
  { path: 'admin/:page', pathMatch: 'full', children: [] },
  { path: 'stylist', pathMatch: 'full', children: [] },
  { path: 'employee', pathMatch: 'full', children: [] },
  { path: 'client/:page', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
