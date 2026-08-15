# WarungKu — Premium Multi-Module SME Operating System

**WarungKu** is a highly optimized, professional multi-module operating system built specifically for Indonesian small merchant shops (*warungs*). It consolidates inventory control, cash register (POS) operations, direct-to-consumer digital storefronts, advanced reporting, and AI-driven business coaching under a single, cohesive workflow.

Designed with a premium, high-fidelity **Obsidian-Black** and technical gray styling system, WarungKu integrates atomic transaction safety with a layered, decoupled monorepo architecture.

---

## 🏛️ Monorepo Architecture

WarungKu uses a modular monorepo structure separating the frontend user interface, the high-performance Go backend service, and the Supabase PostgreSQL database:

```
warungku/
├── app/                  # Frontend (Nuxt 3, Vue 3, @nuxt/ui v4, Tailwind v4)
├── backend/              # Backend API Service (Go 1.26, Echo v4, pgxpool, squirrel)
├── supabase/             # Database migrations, schemas, and atomic PostgreSQL RPCs
└── tests/integration/    # Automated integration test suites
```

```
┌───────────────────────────┐           ┌────────────────────────────┐
│      Nuxt 3 Frontend      │           │     Go Backend Service     │
│                           │   HTTP    │                            │
│  app/pages/        (UI)   │──────────▶│  cmd/api/main.go           │
│  app/composables/ ($fetch)│   JSON    │  internal/                 │
│  useApiClient (JWT Auth)  │           │    ├── handler/  (Echo)    │
└───────────────────────────┘           │    ├── service/  (Logic)   │
                                        │    ├── repo/     (pgxpool) │
                                        │    └── model/    (Structs) │
                                        └─────────────┬──────────────┘
                                                      │
                                                ┌─────┴─────┐
                                                │ PostgreSQL│
                                                │ (Supabase)│
                                                └───────────┘
```

---

## 🚀 Core Modules

### 1. Auth & Identity Flow
* **Standardized Sessions**: Clean sign-in, sign-up, password reset, and session tracking middleware via Supabase Auth.
* **JWT Verification**: The Go backend securely verifies incoming Supabase bearer tokens and enforces tenant isolation (`merchant_id`).

### 2. Stock & Inventory (Module 1) — `/stock`
* **Tactile Cataloging**: Real-time product inventory lists, categories, and physical unit tracking in an asymmetric dashboard structure.
* **Asset Valuation**: Automated, real-time asset currency calculation with standard tooltip descriptors.
* **Smart Thresholds**: Dynamic, warm-rose low-stock alerts highlighting critical inventory thresholds.
* **Append-Only History**: Automated stock movement logging on adjustments and product creation.

### 3. Kasir Digital / POS (Module 2) — `/pos`
* **Atomic Checkout**: Direct digital cart, multi-payment options, customer loyalty points, and interactive receipt preview modals.
* **Relational Safety**: Orchestrated via `POST /api/checkout`, invoking the `pos_checkout_atomic` Postgres transaction to enforce all-or-nothing constraints, guaranteeing zero inventory discrepancies.

### 4. Laporan & Analytics (Module 3) — `/reports`
* **Business Insights**: Daily summary cards, CSS-based hourly traffic charts, and dynamic payment method splits.
* **Comparison Engine**: Real-time percentage delta calculations comparing current vs prior periods.
* **Storefront Telemetry**: Real-time logging of digital storefront page views, WhatsApp clicks, and conversion rates.

### 5. Online Store (Module 4) — `/store/[slug]`
* **Direct Storefronts**: Direct-to-consumer digital storefronts for active merchant inventories, complete with customizable bio settings, dynamic catalog visibility, and WhatsApp bridge checkout.
* **Public Endpoints**: `/api/public/store/:slug` routes allowing anonymous customer catalog viewing and order submissions without authentication barriers.

### 6. AI Business Coach (Module 5) — `/ai`
* **Conversational AI Workspace**: Chat interface with prompt preset bento grids and spring-physics slide layouts.
* **pgvector Similarity Search**: Backed by PostgreSQL `pgvector` HNSW indexing and deterministic embeddings to perform rapid semantic knowledge matching over merchant datasets.

---

## 🛠️ Tech Stack

### Frontend (`app/`)
* **Framework**: [Nuxt 3](https://nuxt.com/) (Vue 3 Composition API with `<script setup>`, TypeScript).
* **UI & Theme**: `@nuxt/ui` v4 (Tailwind CSS v4) styled with strict semantic tokens (`text-default`, `bg-elevated`, `border-default`).
* **Design Engine**: `motion-v` for physical spring transitions, layout morphing, and tactile active compression states.
* **API Client**: `useApiClient` composable with automatic JWT header attachment.

### Backend (`backend/`)
* **Language & Framework**: [Go 1.26](https://golang.org/), [Echo v4](https://echo.labstack.com/).
* **Database Driver & Pool**: [pgx/v5](https://github.com/jackc/pgx) with `pgxpool.Pool`.
* **SQL Query Builder**: [squirrel](https://github.com/Masterminds/squirrel) (PostgreSQL dollar placeholder format).
* **Validation**: [go-playground/validator/v10](https://github.com/go-playground/validator).
* **Authentication**: `golang-jwt/jwt/v5` with Supabase JWT token verification.

### Database (`supabase/`)
* **Database Engine**: [PostgreSQL](https://www.postgresql.org/) (hosted via Supabase).
* **Extensions**: `pgcrypto`, `pgvector`.
* **Security**: Row-Level Security (RLS) policies as defense-in-depth, security-definer triggers, and atomic transaction RPCs.

---

## ⚙️ Local Development

### Prerequisites
* **Node.js**: >= 20.x (`pnpm` or `npm`)
* **Go**: >= 1.23
* **Supabase Account / Local Postgres Instance**

---

### 1. Backend Setup (`backend/`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file and fill in your connection credentials:
   ```bash
   cp .env.example .env
   ```
   ```env
   PORT=8080
   DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
   SUPABASE_JWT_SECRET=your-supabase-jwt-secret
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3010,http://127.0.0.1:3000,http://127.0.0.1:3010
   ENVIRONMENT=development
   ```
3. Run the Go backend in development mode:
   ```bash
   make dev
   # or: go run ./cmd/api
   ```
4. Verify health endpoint:
   ```bash
   curl http://localhost:8080/api/health
   ```

---

### 2. Frontend Setup (`app/`)

1. Install root dependencies:
   ```bash
   npm install
   ```
2. Configure root `.env` file:
   ```env
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   API_BASE_URL=http://localhost:8080
   ```
3. Start the Nuxt development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 3010
   ```
4. Open your browser at [http://127.0.0.1:3010/](http://127.0.0.1:3010/).

---

## 🧪 Testing & Verification

### Go Backend Tests
```bash
cd backend
make test
# or: go test ./... -v -count=1
```

### Go Vet & Compile Check
```bash
cd backend
make vet
make build
```

### Frontend Typecheck & Build
```bash
npm run typecheck
npm run build
```

---

## 📜 Monorepo Agent Guides

For AI agents and developers working on specific parts of this monorepo:
* **Root Guide**: [`AGENTS.md`](./AGENTS.md)
* **Backend Service Guide**: [`backend/AGENTS.md`](./backend/AGENTS.md)
* **Frontend App Guide**: [`app/AGENTS.md`](./app/AGENTS.md)
