# Sécurité de Canard Culture

## Données utilisateurs

- L'adresse email et les identifiants de connexion restent dans Supabase Auth.
- `profiles` contient seulement le profil du compte et n'est lisible que par son propriétaire.
- `user_state` contient la progression et les paquets privés, avec une règle d'accès par utilisateur.
- Le site utilise uniquement la clé Supabase publique. Une clé secrète ne doit jamais être ajoutée au dépôt.
- À la déconnexion, les données du compte sont retirées de l'interface locale.

## Avant une mise en production

1. Exécuter `docs/supabase-schema.sql` dans le projet Supabase de production.
2. Vérifier les Security Advisors Supabase après chaque changement de schéma.
3. Activer CAPTCHA et conserver les limites de débit de Supabase Auth.
4. Garder la confirmation d'email active.
5. Tester avec deux comptes que chacun ne peut lire que ses propres données.

## Signaler un problème

Ne pas publier de faille ou de donnée personnelle dans une issue publique.
Utiliser le formulaire de contact du site avec le minimum d'informations nécessaire.
