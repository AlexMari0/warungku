# Frontend App Agent Guidelines (`app/`)

Authoritative reference for AI agents working in the **Frontend Application** (`app/`).

---

## 🏛️ Frontend Architecture

```
app/
├── assets/css/main.css         # Obsidian dark theme & design tokens
├── components/                 # Reusable UI components (modals, forms, cards, tables)
├── composables/                # State management & Go backend API integration
│   ├── useApiClient.ts         # Shared $fetch wrapper with JWT token injection
│   ├── useProducts.ts          # Products domain composable
│   ├── useCategories.ts        # Categories domain composable
│   ├── useCheckout.ts          # POS checkout composable
│   ├── useCustomers.ts         # Customers domain composable
│   ├── useStockMovements.ts    # Stock movements composable
│   ├── useStorefront.ts        # Online storefront & settings composable
│   ├── useReports.ts           # Reports & analytics composable
│   └── useAICoach.ts           # AI assistant conversation composable
├── layouts/                    # Layout shells (default dashboard, auth, storefront)
├── pages/                      # Thin page orchestrators (< 250 LOC)
├── types/                      # TypeScript domain types & interfaces
└── utils/                      # Formatting helpers & theme swatches
```

---

## 🎨 Visual & Theming Guidelines

1. **Obsidian Palette**: Strictly follow the Obsidian-black technical gray palette (`zinc` neutral base).
   - Base background: `var(--ui-bg)` (`#09090b`)
   - Card/Elevated surface: `var(--ui-bg-elevated)` (`#18181b`)
   - Borders: `var(--ui-border)` (`#27272a`)
   - Text hierarchy: `text-default`, `text-muted`, `text-dimmed`.
2. **Typography**:
   - Primary text: `font-sans` (`Outfit` Google Font).
   - Numerical/Currency values: Always style currency and numeric figures with `font-mono font-medium`.
3. **Tactile Interaction**:
   - Clickable buttons and cards must include active compression states: `active:scale-[0.98] transition-transform`.
   - Use `motion-v` for organic spring physics in entrance and layout transitions.
4. **No Cartoonish Emojis**: Use clean vector icons from the `@nuxt/ui` / `lucide` icon collection (e.g. `i-lucide-package`, `i-lucide-shopping-cart`).

---

## 🔌 API Integration Rules

1. **Use `useApiClient`**:
   ```typescript
   const { apiFetch } = useApiClient()
   const products = await apiFetch<Product[]>('/api/products')
   ```
2. **Never Query PostgREST Directly**:
   - ❌ `supabase.from('products').select('*')`
   - ✅ `apiFetch('/api/products')`
3. **Authentication Boundary**:
   - `useSupabaseClient()` and `useSupabaseUser()` are reserved strictly for auth state (sign in, sign up, logout, password recovery, session cookies).
4. **Error Handling**:
   - Wrap API calls in `try / catch`.
   - Render error messages using `useToast()`.

---

## 🧪 Verification Commands

```bash
# Type check TypeScript
npm run typecheck

# Verify production build
npm run build
```
