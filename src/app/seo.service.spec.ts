import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('Public search metadata', () => {
  let canonical: HTMLLinkElement;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.appendChild(canonical);
  });
  afterEach(() => canonical.remove());

  it('canonicalizes catalog URLs without query parameters', () => {
    TestBed.inject(SeoService).update('/explore?source=partenaire#modeles');
    expect(canonical.href).toBe('https://www.surmesurestyle.com/explore');
    expect(document.title).toContain('Modèles de couture');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('index, follow');
  });
  it('excludes account pages from indexing', () => {
    TestBed.inject(SeoService).update('/client/commandes');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
  });
  it('restores public indexing when returning home', () => {
    const service = TestBed.inject(SeoService);
    service.update('/signup');
    service.update('/');
    expect(canonical.href).toBe('https://www.surmesurestyle.com/');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).not.toContain('noindex');
  });
});
