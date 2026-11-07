import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  update(url: string): void {
    const path = url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    const explore = path === '/explore';
    const isPublic = path === '/' || explore;
    const title = explore
      ? 'Modèles de couture, boubous et ensembles | Sur Mesure Style'
      : 'Sur Mesure Style | Modèles et stylistes de couture sur mesure';
    const description = explore
      ? 'Explorez les modèles de couture et les créations de nos stylistes : tenues de cérémonie, boubous et ensembles. Constituez votre sélection sur Sur Mesure Style.'
      : 'Découvrez des modèles de couture, boubous et ensembles. Trouvez un styliste, enregistrez vos mensurations et suivez vos commandes avec Sur Mesure Style.';
    if (isPublic) this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: isPublic ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    });
    const canonical = `https://www.surmesurestyle.com${path === '/' ? '/' : path}`;
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', canonical);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
  }
}
