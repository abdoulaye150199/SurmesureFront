# Bonnes pratiques pour Sur Mesure Style

Ce document décrit les pratiques importantes pour garder le portail rapide, fiable, accessible et sûr. Les éléments marqués **En place** sont présents dans le code à la date de cette mise à jour. Les recommandations restantes sont des actions à prévoir, pas des services déjà configurés.

## Performance et expérience utilisateur

- **Afficher un état de chargement adapté.** Utiliser des squelettes qui reprennent la forme des cartes ou lignes attendues, annoncer le chargement aux lecteurs d’écran et respecter `prefers-reduced-motion`. Le catalogue public dispose maintenant de squelettes de cartes.
- **Réduire le poids des images.** Préférer WebP ou AVIF pour les images éditoriales et utiliser des dimensions proches de leur taille d’affichage. Les variantes WebP du hero, des exemples de créations, des portraits de démonstration et de l’image de connexion sont maintenant utilisées par le portail. Garder PNG pour les icônes PWA et les images qui nécessitent de la transparence.
- **Charger les images à la demande.** Garder `loading="lazy"` sur les images sous la ligne de flottaison ; réserver `fetchpriority="high"` à l’image principale. Définir `width` et `height` ou un ratio CSS pour éviter les déplacements de page.
- **Limiter les requêtes redondantes.** Partager une requête GET identique tant qu’elle est en cours. Une mise en cache doit avoir une durée courte et être invalidée après les opérations qui modifient les données. Le service dashboard regroupe les appels simultanés et met en cache brièvement les listes parcourues intégralement.
- **Temporiser les recherches distantes.** Appliquer un délai (environ 300 ms) et ignorer les réponses obsolètes. Le champ de recherche utilisateur de l’administration utilise désormais ce délai. Pour les autres recherches, distinguer celles qui filtrent seulement des données déjà en mémoire de celles qui sollicitent l’API.
- **Paginer côté serveur.** Ne pas télécharger une liste entière pour n’en afficher qu’une partie. Utiliser un curseur pour les flux chronologiques et la pagination par numéro si l’utilisateur doit aller directement à une page. Les routes catalogue, commandes et mesures sont paginées ; les chargements des espaces client, styliste et employé parcourent toutes les pages quand l’écran a réellement besoin de l’ensemble.
- **Garder les réponses bornées.** Fixer une limite maximale par page, trier de façon stable et indexer les colonnes de filtre/tri en base. Préférer le chargement progressif pour les catalogues visibles.

## Images et CDN

Le front contient une configuration Vercel (`vercel.json`) ; les assets statiques seront distribués via le réseau CDN lorsque ce portail est déployé sur Vercel. Les nouvelles variantes WebP sont publiées sous `public/assets/` et servies comme assets statiques. Le choix de l’hébergement actif reste à confirmer avant de considérer ce CDN comme celui de production.

Les images envoyées par les utilisateurs sont un cas distinct : le navigateur les réduit actuellement puis les envoie sous forme de données intégrées. Pour un catalogue de production, préférer un stockage objet privé/public contrôlé (par exemple S3 compatible) avec un domaine CDN, des URL de téléchargement signées, une validation serveur du format et de la taille, et une génération de variantes miniature/affichage. Ne pas exposer de clé de stockage dans le frontend. Choisir ce fournisseur avant d’ajouter une URL CDN applicative ; le dépôt ne configure pas actuellement de stockage d’images distant.

## Fiabilité des interfaces et API

- Conserver les états de chargement, erreur, contenu vide et nouvelle tentative.
- Annuler ou ignorer les réponses d’une recherche ou navigation précédente.
- Dédupliquer uniquement les lectures simultanées identiques ; ne jamais fusionner les mutations (POST, PUT, PATCH, DELETE).
- Ne pas mettre en cache les données privées dans un cache partagé ou service worker sans stratégie explicite d’authentification, d’expiration et de purge à la déconnexion.
- Valider les paramètres et corps côté serveur, limiter la taille des requêtes et renvoyer des erreurs sans détails internes.
- Utiliser des transactions pour les opérations qui mettent à jour plusieurs enregistrements et rendre les actions répétables sans doublon lorsque c’est nécessaire.

## Sécurité et données personnelles

- Garder les secrets et clés uniquement côté serveur ; les stocker dans les variables d’environnement de l’hébergeur.
- Vérifier les droits d’accès à chaque route côté API, même si l’interface masque les actions non autorisées.
- Ne collecter que les données utiles, limiter leur durée de conservation et éviter de les écrire dans les journaux.
- Utiliser HTTPS partout, une politique CORS précise, des cookies sécurisés si l’authentification repose sur des cookies, et une politique CSP adaptée.
- Protéger les imports : taille maximale, type réel vérifié, décodage/réencodage serveur et nom de fichier généré.

## Accessibilité et qualité d’interface

- Associer chaque champ à un libellé, garder une navigation clavier complète, un focus visible et des textes alternatifs utiles.
- Utiliser des boutons pour les actions et des liens pour la navigation ; annoncer les erreurs et les changements importants avec les régions ARIA appropriées.
- Vérifier le contraste, les tailles tactiles sur mobile et les préférences de mouvement réduit.
- Conserver des états vides explicites et des messages d’erreur actionnables.

## Exploitation et évolution

- Activer une compression HTTP (Brotli ou gzip) et des en-têtes cache longs pour les fichiers nommés avec hash ; garder HTML et réponses API avec des politiques adaptées.
- Surveiller les erreurs frontend/backend, temps de réponse, taux d’échec et requêtes lentes en base sans enregistrer de données sensibles.
- Exécuter lint et build avant déploiement ; ajouter ou maintenir des tests ciblés sur la pagination, la déduplication, les permissions et les parcours critiques.
- Déployer les migrations de base de données de façon compatible avec les versions précédentes de l’application et garder une procédure de retour arrière.
- Vérifier les performances sur réseau mobile lent et appareil modeste, pas seulement en développement local.

## Vérifications périodiques

- Mesurer le poids transféré des pages principales et des images.
- Confirmer que chaque liste volumineuse est paginée côté serveur et que l’interface permet d’accéder aux éléments suivants.
- Confirmer que les erreurs réseau peuvent être réessayées et qu’une réponse lente ne remplace pas un résultat plus récent.
- Vérifier la configuration de cache/CDN et l’expiration après une mise à jour d’asset.
- Revoir les journaux, dépendances, autorisations et règles de stockage à chaque changement d’hébergement.
