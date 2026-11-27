# PortailWeb

## Abonnements et paiement Wave

Le lien marchand public `https://pay.wave.com/m/M_sn_pmS768xGpJd-/c/sn/` est centralisé dans `src/app/subscription-payment/subscription-payment.ts`. Il est proposé après une inscription styliste réussie (mot de passe ou Google), puis dans l’espace styliste sous « Payer ma formule avec Wave ». Le client ouvre le lien dans un nouvel onglet et saisit le montant affiché pour sa formule : Essentiel 5 000 FCFA, Atelier 10 000 FCFA, Studio 20 000 FCFA, pour un mois. Aucun paramètre de montant ni retour de paiement non documenté n’est ajouté au lien.

La transmission de référence ouvre un brouillon dans la messagerie du client vers `bonjour@surmesure.sn`, l’adresse de contact déjà utilisée sur le site. Le brouillon reprend la formule, le montant et les coordonnées du compte ; le client complète la référence de transaction, le numéro payeur et la date puis l’envoie. Ce clic n’envoie aucun message depuis l’application et ne déclare pas un paiement réussi. Vérifier que cette boîte est bien surveillée avant mise en production.

L’administrateur rapproche la référence avec une transaction réellement reçue dans Wave Business, vérifie le montant et le compte concerné, puis utilise l’attribution de formule et l’activation existantes. Ne pas réutiliser une transaction déjà affectée à un autre règlement. Le backend ne reçoit aucune confirmation Wave : ouvrir le lien, revenir sur le site ou transmettre une référence n’active jamais de compte.

Cette intégration est manuelle : elle n’enregistre pas de transaction ni d’échéance en base, ne déclenche aucun prélèvement et ne prolonge ni n’expire automatiquement les accès. Le suivi des périodes et des renouvellements reste à la charge de l’administrateur. Aucun changement du backend ni migration n’est nécessaire. Pour automatiser la vérification et les périodes d’abonnement, une intégration serveur Wave Checkout distincte sera nécessaire.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# SurmesureFront
