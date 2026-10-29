# Comment Sur Mesure peut générer des revenus

Ce document propose un modèle de revenus progressif pour Sur Mesure Style et les étapes pour le tester. Les prix et pourcentages ci-dessous sont des hypothèses de départ à valider avec les stylistes et les clients, pas des tarifs déjà configurés dans l’application.

## Ce que l’application permet déjà

Le backend contient un catalogue de créations associées à un styliste, un prix en XOF, des profils de stylistes, des commandes avec montant et statut, des rendez-vous et des mesures. Cela permet de présenter les créations, recevoir et suivre des demandes de commande, et aider les ateliers à gérer leur activité.

Dans le schéma et les routes actuellement vérifiés, je n’ai pas trouvé de paiement en ligne, de portefeuille, de facturation d’abonnement ni de calcul automatique de commission. Un prix affiché et une commande enregistrée ne signifient donc pas que l’argent est encaissé par la plateforme. Il faut distinguer le suivi commercial du paiement effectif.

## Modèle recommandé pour démarrer

Commence par un pilote sans frais fixes pour quelques ateliers, puis teste une commission sur les commandes réellement terminées. Une commission ne s’applique qu’aux commandes dont le paiement et la livraison ou la remise ont été confirmés.

- **Phase pilote :** inscription et utilisation gratuites pour 5 à 10 ateliers sélectionnés, pendant une période limitée, en échange de retours et de données d’usage.
- **Première offre :** commission expérimentale de 5 à 10 % sur les ventes apportées par la plateforme. Discute du taux avec les ateliers avant de l’appliquer et affiche clairement qui paie les frais.
- **Alternative ou complément :** abonnement mensuel pour les outils professionnels (catalogue, suivi des commandes, clients, mesures et équipe). Teste plusieurs niveaux de prix, par exemple 5 000, 10 000 et 20 000 FCFA par mois, avec des avantages compréhensibles. Ne facture pas avant d’avoir vérifié que les ateliers y voient une valeur régulière.
- **Plus tard :** options facultatives comme la mise en avant d’une création ou un accompagnement photo/catalogue. Garde la visibilité de base équitable et rends toute mise en avant payante identifiable.

Évite de lancer commission et abonnement payants simultanément sans explication : cela peut donner l’impression de facturer deux fois le même service. Tu peux proposer un abonnement sans commission, ou une formule gratuite avec commission et une formule payante à commission réduite.

## Exemple de calcul

Exemple purement illustratif : pour une commande de 80 000 FCFA et une commission de 8 %, le revenu brut de la plateforme serait de 6 400 FCFA. Pour 30 commandes terminées de ce montant dans le mois, cela représente 192 000 FCFA brut.

Ce chiffre n’est pas le bénéfice : il faut encore déduire les coûts de paiement, d’hébergement, de communication, de service client, les remboursements éventuels et les obligations comptables et fiscales applicables.

Pour une formule par abonnement, 10 ateliers à 10 000 FCFA par mois représenteraient 100 000 FCFA de revenu mensuel brut récurrent, si les 10 abonnements sont effectivement payés et renouvelés.

## Comment procéder, étape par étape

### 1. Vérifier le besoin avec les ateliers

Rencontre 5 à 10 stylistes de Dakar et des environs. Demande-leur comment ils trouvent leurs clients, comment ils suivent les acomptes et les commandes, ce qui leur fait perdre du temps et quel montant ils accepteraient de payer pour obtenir des clients ou gérer leur atelier. Note les réponses et ne promets pas un volume de ventes garanti.

### 2. Faire un pilote manuel

Choisis quelques ateliers actifs et aide-les à publier des créations complètes : photos autorisées, description, prix ou prix « à partir de », délais indicatifs, couleurs et conditions de commande. Les clients peuvent contacter l’atelier et convenir avec lui du paiement et de la livraison. Enregistre dans l’application le statut réel de la commande et confirme avec les deux parties quand elle est terminée.

Pendant ce pilote, ne prétends pas que l’application encaisse les paiements. Si tu testes une commission, définis par écrit avec chaque atelier la base de calcul, le moment où elle est due, les annulations, les retouches, les remboursements et la preuve de paiement.

### 3. Mesurer avant de fixer les tarifs

Chaque semaine, suis au minimum :

- les ateliers inscrits et ceux qui publient réellement ;
- les consultations de créations et les demandes reçues ;
- les demandes qui deviennent des commandes confirmées ;
- les commandes terminées, leur montant et leur délai ;
- les annulations et les motifs ;
- les ateliers qui reviennent et ceux qui accepteraient de payer.

Utilise les commandes terminées comme base des revenus, pas les visites, les favoris ou les commandes encore en attente.

### 4. Choisir un seul mode de facturation à tester

Après le pilote, propose une offre simple à un petit groupe d’ateliers. Par exemple : formule gratuite avec commission sur les clients apportés par Sur Mesure, ou formule mensuelle donnant accès aux outils professionnels. Explique le prix, la période, les services inclus et la procédure d’arrêt. Compare le taux d’acceptation et la rétention avant d’étendre l’offre.

### 5. Automatiser le paiement seulement après validation

Quand le processus commercial est compris et que les ateliers confirment le modèle, sélectionne un prestataire de paiement adapté au Sénégal et aux moyens utilisés par tes clients. Vérifie ses frais, délais de reversement, procédures de remboursement, exigences de vérification et conditions contractuelles. Fais valider les obligations juridiques, fiscales et de protection des données par un professionnel local avant de garder ou redistribuer des fonds.

L’intégration devra notamment enregistrer les paiements et remboursements, associer chaque transaction à une commande, gérer les notifications fiables et les tentatives répétées, et empêcher qu’une même commande soit facturée deux fois. Ne conserve pas les codes secrets de paiement des clients.

### 6. Rendre les règles visibles

Avant qu’un client confirme une demande ou un paiement, indique clairement le prix, l’acompte éventuel, les délais, les conditions d’annulation et la personne responsable de la confection et de la livraison. Indique également aux stylistes le montant exact de la commission ou de l’abonnement et le calendrier de règlement.

## Priorités produit avant une monétisation automatisée

Pour encaisser proprement, il faudra probablement ajouter au backend et au dashboard :

1. un état de paiement distinct du statut de confection (en attente, acompte payé, payé, remboursé) ;
2. un identifiant de transaction et un historique des événements de paiement ;
3. le montant de commission, sa règle et son état de règlement ;
4. un récapitulatif des ventes et frais par atelier et par période ;
5. des notifications et des reçus compréhensibles ;
6. des contrôles d’accès et une journalisation adaptés aux données personnelles et aux mesures des clients.

Ces fonctions ne sont pas décrites comme déjà présentes dans le modèle actuel. Elles devront être conçues et testées avant que la plateforme ne promette un encaissement ou un reversement automatique.

## Plan des 30 premiers jours

- **Semaine 1 :** interviewer 5 à 10 stylistes et sélectionner 3 à 5 ateliers pilotes.
- **Semaine 2 :** publier leurs créations et expliquer le parcours de demande de commande ; vérifier les prix et les conditions avec chaque atelier.
- **Semaine 3 :** suivre chaque demande jusqu’à son résultat et recueillir les retours des clients et des stylistes.
- **Semaine 4 :** calculer le nombre de commandes terminées, le revenu potentiel, les coûts et le taux de retour des ateliers ; décider d’un essai d’abonnement ou de commission avec accord explicite.

Le bon signal pour commencer à facturer est que les ateliers utilisent le service de façon répétée, reçoivent une valeur mesurable et comprennent exactement le prix. Si ce signal manque, améliore d’abord l’acquisition de clients et le suivi des commandes.
