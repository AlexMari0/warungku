# WarungKu Agent Guidelines

Authoritative single source of truth for AI agents operating in the **WarungKu** monorepo.

---

## 🏛️ Monorepo Architecture & Seams

WarungKu is structured as a decoupled monorepo:
1. **Frontend (`app/`)**: Nuxt 3, Vue 3, `@nuxt/ui` v4, Tailwind CSS v4. Consumes the backend via `$fetch()` in `useApiClient`.
2. **Backend (`backend/`)**: Go 1.26 API service with Echo v4, pgxpool, and squirrel query builder.
3. **Database (`supabase/migrations/`)**: Authoritative PostgreSQL database schemas, constraints, and atomic RPC functions.
4. **Integration Tests (`tests/integration/`)**: Verification test suites.

```
Frontend (app/) ──► $fetch(useApiClient) ──► Go API (backend/) ──► pgxpool ──► PostgreSQL (Supabase)
```

---

## 🧭 Sub-Package Documentation

When working within specific subdirectories, consult the dedicated agent guides:
- **Backend Service (Go)**: Read [`backend/AGENTS.md`](file:///Users/alexmariokristian/project/warungku/backend/AGENTS.md) for 3-tier layering (Handler → Service → Repo), error handling, and pgx usage.
- **Frontend App (Nuxt 3)**: Read [`app/AGENTS.md`](file:///Users/alexmariokristian/project/warungku/app/AGENTS.md) for design system tokens, `useApiClient` usage, and UI guidelines.

---

## ⚡ Core Rules for Agents

1. **Zero Client-to-DB Direct Access**: Frontend composables in `app/composables/` must communicate with the Go backend via `useApiClient`, never querying Supabase PostgREST directly for business records.
2. **Atomic Checkout Invariant**: All POS checkout logic delegates to `pos_checkout_atomic` in PostgreSQL to guarantee atomic inventory decrement and transaction logging.
3. **Tenant Isolation**: All queries accessing merchant-owned data must include `WHERE merchant_id = $N`. The `merchant_id` is extracted from the verified Supabase JWT in the Go auth middleware.
4. **Type Alignment**: Go structs in `backend/internal/model/` and TypeScript interfaces in `app/types/index.ts` must stay synchronized with database schemas in `supabase/migrations/`.
5. **No Secrets in Code**: Environment variables belong in `.env` files (loaded via `godotenv`/`envconfig` in Go and `runtimeConfig` in Nuxt).

---

## 🛠️ Essential Commands

### Go Backend (`backend/`)
```bash
cd backend
make dev           # Start Go API server (port 8080)
make test          # Run Go unit tests
make vet           # Run go vet ./...
make build         # Compile static binary to bin/api
```

### Nuxt Frontend (`app/`)
```bash
npm run dev -- --host 127.0.0.1 --port 3010  # Start Nuxt dev server
npm run typecheck                            # Run TypeScript type check
npm run build                                # Run production build
```

---

## 📋 Definition of Done for Any Change

Before concluding any task:
1. `cd backend && go vet ./... && go test ./... -v -count=1` passes with zero errors.
2. `npm run typecheck` passes with zero type errors.
3. `npm run build` completes successfully.
