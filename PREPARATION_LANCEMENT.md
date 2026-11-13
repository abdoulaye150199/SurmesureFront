# Préparation au lancement

État préparé le 13 novembre 2026 à partir du dépôt. Les validations ci-dessous nécessitent les comptes de production ou des décisions de l’exploitant ; elles ne peuvent pas être confirmées par une compilation locale.

## Corrigé dans le dépôt

- Les origines CORS par défaut comprennent les deux domaines de production (`www` et domaine racine). Les autres origines de production doivent être HTTPS.
- L’inscription et le pied de page donnent accès à des pages de conditions et de confidentialité. Ces pages sont des brouillons opérationnels : elles signalent explicitement les renseignements juridiques et durées de conservation à confirmer.
- Les listes principales utilisent les mécanismes de pagination déjà exposés par l’API ; les images importées sont compressées côté navigateur et limitées par les validations existantes.
- Les contrôles de santé `/v1/health/live` et `/v1/health/ready` sont disponibles.

## À valider avant ouverture publique

1. **Déploiements** : déployer le backend et le frontend après mise à jour des variables de production. Vérifier les deux domaines, le certificat HTTPS, la redirection vers le domaine canonique, les réponses API et l’inscription depuis le navigateur.
2. **CORS LWS** : vérifier que les variables Passenger reflètent les domaines actuels. Le code autorise maintenant le domaine public même pendant le déploiement de cette variable ; retire les anciennes origines qui ne sont plus utilisées.
3. **Google OAuth** : vérifier dans la console du client OAuth les origines JavaScript autorisées, le domaine de production et le même identifiant client entre Google, Vercel et l’API.
4. **Sauvegardes** : confirmer dans le fournisseur PostgreSQL la fréquence, la durée de rétention et la restauration à un instant donné disponibles sur l’offre utilisée. Effectuer une restauration de répétition dans une base séparée avant la première migration métier. Les scripts de déploiement ne sauvegardent pas automatiquement la base.
5. **Photos de créations** : les images sont aujourd’hui compressées dans le navigateur puis envoyées à l’API comme données intégrées. C’est borné et peut convenir au pilote, mais cela augmente la taille de la base et les réponses API. Avant une montée en charge, choisir et provisionner un stockage objet/CDN ; ne pas inventer de clés dans le dépôt.
6. **Informations juridiques** : faire confirmer le nom légal et les coordonnées de l’exploitant, les durées exactes de conservation, le traitement des demandes d’effacement et les modalités de transaction entre clients et ateliers. Faire relire les pages légales selon le pays d’exploitation avant de retirer leur mention de brouillon.
7. **Suivi et capacité** : vérifier alertes et journaux dans les panneaux d’hébergement, surveiller erreurs et latences, et exécuter un essai progressif sur une préproduction représentative avant toute campagne d’acquisition. Le limiteur d’API est local au processus : une configuration multi-instance demande un stockage partagé.
8. **Google Search Console** : vérifier la propriété du domaine, envoyer le sitemap et inspecter les pages. C’est utile pour l’acquisition mais ne bloque pas les tests privés du service.

## Parcours de pilote à effectuer avec de vrais comptes de test

- Créer un compte client et un compte styliste, avec e-mail et Google.
- Créer un profil et une création, puis vérifier l’image sur mobile et bureau.
- Envoyer et confirmer un rendez-vous ; créer une commande et faire évoluer son statut.
- Enregistrer des mensurations, vérifier leur visibilité par les seuls comptes concernés et supprimer les comptes d’essai.
- Vérifier les refus d’accès entre rôles, l’expiration de session, la déconnexion et les messages en cas d’API indisponible.
- Répéter les opérations sur le domaine HTTPS de production, sans données personnelles réelles.
