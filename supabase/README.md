# Supabase — Migrations & Setup

## Comment appliquer les migrations

### Option A — Supabase Dashboard (recommandé pour le premier déploiement)

1. Ouvre [Supabase Dashboard](https://app.supabase.com) → ton projet → **SQL Editor**
2. Exécute les fichiers **dans cet ordre** :
   ```
   supabase/migrations/20240401000000_strava_tokens.sql
   supabase/migrations/20240401000002_missing_tables.sql
   supabase/migrations/20240401000001_rls_policies.sql
   ```

### Option B — Supabase CLI

```bash
npx supabase db push
```

---

## Migrations disponibles

| Fichier | Description |
|---|---|
| `20240401000000_strava_tokens.sql` | Isole les tokens OAuth Strava dans une table dédiée avec RLS stricte. Migre les données existantes et supprime les colonnes sensibles de `profiles`. |
| `20240401000002_missing_tables.sql` | Crée les tables `user_badges`, `runner_connections`, `admin_activity_log`, `teams` si elles n'existent pas encore. **À exécuter avant les policies RLS.** |
| `20240401000001_rls_policies.sql` | Renforce les policies RLS sur toutes les tables critiques (profiles, sessions, strava_tokens, identity_verifications, badges, etc.). |

---

## Variables d'environnement requises

Voir `.env.example` à la racine du projet.

---

## Points d'attention RLS

- **`strava_tokens`** : chaque user ne voit **que** sa propre ligne. Le service role (backend) bypass RLS pour la sync.
- **`user_badges`** : insertion bloquée pour les users normaux — seul le service role peut attribuer des badges.
- **`admin_activity_log`** : aucun accès direct via client — service role uniquement.
- **`identity_verifications`** : user voit uniquement sa propre vérification.

---

## Après migration

Vérifier dans Supabase Dashboard → **Authentication → Policies** que toutes les tables ont bien RLS activé (icône verte).
