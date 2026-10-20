# AudioCanvas — Backend Schema and API Specification

*Version 1.0*

## 4.1 Backend Overview

The MVP backend is intentionally small: accounts, preset storage, sharing, gallery and moderation. Audio and exports never touch the server. Suggested stack: **Next.js route handlers (or Node/Fastify) + PostgreSQL + Prisma/Drizzle ORM + S3-compatible storage (thumbnails) + Redis (rate limiting, cache)**. Auth via Auth.js/Lucia (email magic link, Google, GitHub).

## 4.2 Entity Relationship Overview

```
users 1────< presets >────< preset_tags >──── tags
  │              │
  │              ├────< preset_likes >──── users
  │              ├────< reports >──── users
  │              └────< preset_versions
  ├────< sessions
  └────< user_settings
```

## 4.3 PostgreSQL Schema (DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TYPE preset_visibility AS ENUM ('private', 'unlisted', 'public');
CREATE TYPE report_status AS ENUM ('open', 'reviewed', 'actioned', 'dismissed');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  display_name    VARCHAR(60) NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE oauth_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     VARCHAR(20) NOT NULL,
  provider_uid VARCHAR(255) NOT NULL,
  UNIQUE (provider, provider_uid)
);

CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent  TEXT,
  ip_hash     TEXT
);

CREATE TABLE user_settings (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reduced_motion    BOOLEAN NOT NULL DEFAULT FALSE,
  flash_limiter     BOOLEAN NOT NULL DEFAULT TRUE,
  analytics_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  default_fps       SMALLINT NOT NULL DEFAULT 30,
  default_aspect    VARCHAR(8) NOT NULL DEFAULT '16:9'
);

CREATE TABLE presets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id       VARCHAR(10) UNIQUE NOT NULL,
  owner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  name           VARCHAR(80) NOT NULL,
  description    VARCHAR(500),
  scene_id       VARCHAR(40) NOT NULL,
  schema_version SMALLINT NOT NULL DEFAULT 1,
  config         JSONB NOT NULL,
  thumbnail_url  TEXT,
  visibility     preset_visibility NOT NULL DEFAULT 'private',
  like_count     INTEGER NOT NULL DEFAULT 0,
  open_count     INTEGER NOT NULL DEFAULT 0,
  remix_of       UUID REFERENCES presets(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT config_size CHECK (pg_column_size(config) < 65536)
);
CREATE INDEX idx_presets_owner ON presets(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_presets_public_new ON presets(created_at DESC) WHERE visibility = 'public' AND deleted_at IS NULL;
CREATE INDEX idx_presets_public_popular ON presets(like_count DESC) WHERE visibility = 'public' AND deleted_at IS NULL;
CREATE INDEX idx_presets_scene ON presets(scene_id);

CREATE TABLE preset_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id  UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  config     JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  slug VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(40) NOT NULL
);

CREATE TABLE preset_tags (
  preset_id UUID REFERENCES presets(id) ON DELETE CASCADE,
  tag_id    INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (preset_id, tag_id)
);

CREATE TABLE preset_likes (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  preset_id  UUID REFERENCES presets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, preset_id)
);

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id   UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason      VARCHAR(40) NOT NULL,
  details     VARCHAR(500),
  status      report_status NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES users(id)
);

CREATE TABLE telemetry_events (
  id         BIGSERIAL PRIMARY KEY,
  event      VARCHAR(40) NOT NULL,
  anon_id    UUID NOT NULL,
  props      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 4.4 Client-Side Storage (IndexedDB)

| Store | Key | Contents |
| --- | --- | --- |
| `presets` | `localId` | Preset JSON, name, thumbnail blob, updatedAt, syncedId |
| `session` | `current` | Last scene, mappings, theme (auto-restore) |
| `settings` | `app` | Reduced motion, flash limiter, quality tier, coach-mark flags |

Audio files are **never persisted** by default (privacy and storage). Users re-drop tracks per session.

## 4.5 REST API (v1)

Base path `/api/v1`. JSON only. Errors: `{ "error": { "code": "string", "message": "string" } }`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/magic-link` | No | Send sign-in email |
| GET | `/auth/callback/{provider}` | No | OAuth callback |
| POST | `/auth/logout` | Yes | Invalidate session |
| GET | `/me` | Yes | Current user and settings |
| PATCH | `/me` | Yes | Update profile and settings |
| DELETE | `/me` | Yes | Delete account and data |
| GET | `/presets` | Mixed | List own presets (auth) or public gallery (`?visibility=public&sort=new\|popular&scene=&tag=&cursor=`) |
| POST | `/presets` | Yes | Create preset `{name, sceneId, config, visibility}` |
| GET | `/presets/{shortId}` | Mixed | Fetch a preset (public/unlisted, or own private) |
| PUT | `/presets/{id}` | Yes (owner) | Replace preset |
| PATCH | `/presets/{id}` | Yes (owner) | Rename, change visibility, tags |
| DELETE | `/presets/{id}` | Yes (owner) | Soft-delete |
| POST | `/presets/{id}/thumbnail` | Yes (owner) | Get a signed upload URL |
| POST | `/presets/{id}/like` | Yes | Like (idempotent) |
| DELETE | `/presets/{id}/like` | Yes | Unlike |
| POST | `/presets/{id}/open` | No | Increment open counter (rate-limited) |
| POST | `/presets/{id}/report` | Yes | Report content |
| GET | `/tags` | No | Popular tags |
| POST | `/telemetry` | No | Batched anonymous events |

### Example: Create Preset

```http
POST /api/v1/presets
Content-Type: application/json

{
  "name": "Neon Pulse",
  "sceneId": "particle-vortex",
  "visibility": "unlisted",
  "config": { "schemaVersion": 1, "mappings": [ ... ], "theme": { ... } }
}
```

Response `201`:

```json
{ "id": "b0b8...", "shortId": "x7Kp2Qa", "url": "https://audiocanvas.app/p/x7Kp2Qa" }
```

## 4.6 Validation, Security and Rate Limits

- Validate `config` with a Zod/JSON Schema matching the versioned preset schema; reject unknown scene ids, out-of-range values, and payloads over 64 KB.
- Rate limits: 60 req/min per IP for reads, 20 req/min for writes, 5 magic-link requests per hour per email.
- Public gallery reads cached at the CDN for 60 seconds; unlisted and private never cached publicly.
- Moderation: reports above a threshold auto-hide a preset pending review; names and descriptions filtered for abusive content.
- CSRF protection for cookie-authenticated mutations; strict CORS; parameterized queries only.
