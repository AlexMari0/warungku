# WarungKu — Premium Multi-Module SME Operating System

**WarungKu** is a highly optimized, professional multi-module operating system built specifically for Indonesian small merchant shops (*warungs*). It consolidates inventory control, cash register (POS) operations, direct-to-consumer digital storefronts, advanced reporting, and AI-driven business coaching under a single, cohesive workflow.

Designed with a premium, high-fidelity **Obsidian-Black** and technical gray styling system, WarungKu integrates atomic transaction safety with a highly interactive user experience.

---

## 🚀 Core Modules

### 1. Auth & Identity Flow
* **Standardized Sessions**: Clean sign-in, sign-up, password reset, and session tracking middleware.
* **Hybrid Execution**: Seamless session state switching between an offline-first **Demo Mode** and a live **Remote Database Mode** via Supabase.

### 2. Stock & Inventory (Module 1) — `/stock`
* **Tactile Cataloging**: Real-time product inventory lists, categories, and physical unit tracking in an asymmetric dashboard structure.
* **Asset Valuation**: Automated, real-time asset currency calculation with standard tooltip descriptors.
* **Smart Thresholds**: Dynamic, warm-rose low-stock alerts highlighting critical inventory thresholds.

### 3. Kasir Digital / POS (Module 2) — `/pos`
* **Atomic Checkout**: Direct digital cart, multi-payment options, customer loyalty points, and interactive receipt preview modals.
* **Relational Safety**: Relies on a single atomic Postgres database transaction to enforce all-or-nothing constraints, guaranteeing zero inventory discrepancies.

### 4. Laporan & Analytics (Module 3) — `/reports`
* **Business Insights**: Daily summary cards, CSS-based hourly traffic charts, and dynamic payment method splits.
* **Online Conversion Tracking**: Real-time logging of digital storefront page views, clicks, and checkout rates.

### 5. Online Store (Module 4) — `/store/[slug]`
* **Direct Storefronts**: direct-to-consumer digital storefronts for active merchant inventories, complete with customizable bio settings, dynamic catalog visibility, and Whatsapp bridge checkout.
* **Public RLS Policy**: Secure anonymous guest checkout and catalog verification.

### 6. AI Business Coach (Module 5) — `/ai`
* **Interactive AI Chat**: Dual-state conversational workspace with spring-physics layouts.
* **Vector Knowledge Base**: Deployed Nuxt 3 backend API backed by PostgreSQL `pgvector` indexing and deterministic embeddings to execute rapid similarity queries over merchant data.

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: [Nuxt 3](https://nuxt.com/) (Vue 3 Composition API with `<script setup>`, TypeScript).
* **UI & Theme**: `@nuxt/ui` v4 (Tailwind CSS v4) styled with strict semantic tokens (`text-default`, `bg-elevated`, `border-default`).
* **Design Engine**: `motion-v` for physical spring transitions, layout morphing, and tactile active compression states.
* **Database & RLS**: [Supabase](https://supabase.com/) (Postgres relational schemas, Row-Level Security, and Secure RPC functions).

---

## 🎨 Premium Dark Mode (Obsidian Neutral)

WarungKu features a custom-designed dark theme optimized for technical readability and sleek digital aesthetics. Driven by a unified `zinc` neutral palette, it overrides default variables inside the central stylesheet (`app/assets/css/main.css`):

```css
.dark {
  --ui-bg: #09090b;          /* Pitch-black obsidian base */
  --ui-bg-elevated: #18181b; /* Technical card/dialog containers */
  --ui-bg-muted: #27272a;    /* Hover overlays and borders */
  --ui-bg-accented: #3f3f46; /* Strong active states */
  --ui-border: #27272a;      /* Sharp thin borders */
  --ui-border-muted: #1f1f23;/* Very soft layout separators */
}
```

---

## ⚙️ Local Development

### 1. Installation
Install core packages and dependencies:
```bash
pnpm install
```

### 2. Configure Environments
Create a local `.env` file in the root directory mapping your Supabase secrets:
```env
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### 3. Launch Development Server
```bash
pnpm dev -- --host 127.0.0.1 --port 3010
```
Visit the local instance at [http://127.0.0.1:3010/](http://127.0.0.1:3010/).

### 4. Build for Production
```bash
pnpm build
```

---

## 🧪 Integration & E2E Verification Suites

Core business features are validated against live environments using automated integration test scripts in `/tests/integration/`:

* **POS Transaction Test**:
  ```bash
  node tests/integration/pos_checkout.test.mjs
  ```
  *Tests happy-path commits, insufficient inventory rollbacks, and payment validation checks.*

* **Reports & Analytics Aggregator Test**:
  ```bash
  node tests/integration/analytics.test.mjs
  ```
  *Validates background reporting aggregates populated by post-checkout database events.*

* **Storefront E2E Test**:
  ```bash
  node tests/integration/storefront.test.mjs
  ```
  *Validates merchant online settings publication and anonymous guest checkout RLS policies.*

* **AI Coach Test**:
  ```bash
  node tests/integration/ai_coach.test.mjs
  ```
  *Validates AI coaching session creation, telemetry log inserts, and feedback ratings.*
