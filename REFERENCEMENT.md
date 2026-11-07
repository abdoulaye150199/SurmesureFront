# Référencement Sur Mesure Style

## Livré

- Titre et description de l’accueil et du catalogue, URL canonique `www`,
  balises de partage et données structurées Organization / WebSite.
- Trois guides HTML lisibles sans JavaScript, avec liens entre les guides
  et vers le catalogue. Ils ne nécessitent pas un compte.
- `robots.txt`, `sitemap.xml` et consignes `noindex` pour les espaces privés
  et l’inscription. `noindex` ne remplace pas l’authentification.
- Aucune balise « meta keywords », aucun faux avis, aucune note ni adresse
  commerciale inventée, aucun lien externe acheté.

## Expressions à travailler avec un contenu utile

| Intention | Expressions possibles | Page |
| --- | --- | --- |
| Marque | Sur Mesure Style, SurMesureStyle, surmesurestyle | Accueil |
| Découverte | modèles de couture, créations sur mesure, modèles de boubous, ensembles sur mesure, tenues de cérémonie | Catalogue |
| Projet | préparer une tenue sur mesure, choisir un modèle de couture, commander une création sur mesure | Guide couture |
| Créateur | choisir un styliste, trouver un atelier de couture, styliste pour tenue de cérémonie | Guide stylistes |
| Mesures | mensurations couture, prendre ses mesures pour une tenue, mesures pour couture sur mesure | Guide mensurations |

Ces expressions sont des pistes éditoriales, pas des positions garanties ou
des volumes de recherche mesurés. Les termes locaux tels que « styliste à
Dakar » ou « couture au Sénégal » doivent être développés uniquement avec
des profils et des informations locales vérifiées. Ne pas créer plusieurs
copies de pages changeant seulement le nom de la ville ou le mot-clé.

## Après publication Vercel

1. Ouvrir https://search.google.com/search-console et ajouter la propriété
   de domaine `surmesurestyle.com`.
2. Google fournit une valeur TXT de validation : l’ajouter à la zone DNS
   sans supprimer les enregistrements existants, puis valider.
3. Soumettre `https://www.surmesurestyle.com/sitemap.xml` dans Sitemaps.
4. Inspecter l’accueil, le catalogue et les trois guides ; vérifier le rendu
   mobile et demander leur indexation lorsqu’ils sont accessibles.
5. Suivre les impressions et les requêtes réelles dans Search Console.
   Enrichir les descriptions originales des modèles, les photos et les
   profils stylistes à partir d’informations vérifiées.
6. Partager le véritable lien du site sur les profils sociaux officiels et
   demander aux stylistes partenaires de référencer leur présence réelle.

L’application principale reste rendue côté navigateur : le catalogue dépend
du chargement JavaScript et de l’API. Les guides sont des pages HTML statiques.
Une évolution utile serait le prérendu et des URL publiques uniques pour les
modèles et les stylistes ; les fiches en fenêtre modale n’ont pas encore ces URL.

Le code ne peut pas soumettre le site à Search Console sans accès au compte
et à sa validation DNS. Aucune inscription externe n’a été effectuée.

Sources :
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
