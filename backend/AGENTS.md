# Go Backend Agent Guidelines (`backend/`)

Authoritative reference for AI agents working in the **Go Backend Service** (`backend/`).

---

## 🏛️ Architecture & Layering

The Go backend follows a strict 3-tier modular architecture:

```
cmd/api/main.go                 # Application bootstrap & dependency wiring
internal/
├── handler/                    # HTTP Transport Layer (Echo v4 handlers)
├── service/                    # Business Logic Layer (validations, orchestration)
├── repo/                       # Data Access Layer (pgxpool + squirrel SQL builder)
├── model/                      # Domain Structs & Request/Response Types
├── middleware/                 # Auth (JWT), CORS, ErrorHandler, Validator
├── apperror/                   # Domain Application Error Definitions
└── config/                     # Environment Configuration (envconfig)
```

---

## 🔒 Security & Tenant Isolation

1. **JWT Verification**: The `middleware.Auth(jwtSecret)` middleware parses Supabase JWT bearer tokens, verifies the signature, and sets `merchant_id` (as `uuid.UUID`) in the Echo context.
2. **Context Helper**: Use `middleware.GetMerchantID(c)` in handlers to retrieve the authenticated merchant's UUID.
3. **Mandatory Tenant Filtering**: Every SQL query accessing tenant data in `internal/repo/` must include `WHERE merchant_id = $N` (or join through a relation scoped to `merchant_id`).
4. **Public Routes**: Place unauthenticated routes (such as customer storefront catalog views or anonymous event tracking) under `e.Group("/api/public")`.

---

## 🧱 Layer Implementation Rules

### 1. Handler Layer (`internal/handler/`)
- Handlers are **thin transport adapters**:
  1. Extract `merchantID := middleware.GetMerchantID(c)` (for protected routes).
  2. Parse/bind request: `c.Bind(&req)`.
  3. Validate input: `c.Validate(&req)`.
  4. Invoke service: `svc.DoSomething(c.Request().Context(), merchantID, req)`.
  5. Return JSON: `c.JSON(http.StatusOK, result)`.
- Handlers do **not** execute direct SQL or complex business computations.

### 2. Service Layer (`internal/service/`)
- Services contain **business logic and domain validations**:
  - Check business invariants (e.g. `sell_price >= buy_price`, `stock_qty >= 0`, `cart non-empty`).
  - Return `*apperror.AppError` on domain rule violations.
  - Coordinate multi-repo operations (e.g. creating a product and logging an initial stock movement).

### 3. Repository Layer (`internal/repo/`)
- Repositories encapsulate **database interactions**:
  - Accept `context.Context` as the first argument.
  - Use `github.com/Masterminds/squirrel` with `PlaceholderFormat(squirrel.Dollar)` for PostgreSQL queries.
  - Scan rows into structs from `internal/model/`.
  - Delegate critical transactional operations to PostgreSQL RPC functions (`pos_checkout_atomic`, `refresh_merchant_analytics`, `track_storefront_event`, `match_merchant_knowledge`).

### 4. Error Handling (`internal/apperror/`)
- Use predefined error constructors:
  - `apperror.ErrNotFound("Resource")` → HTTP 404
  - `apperror.ErrValidation("Message")` → HTTP 422
  - `apperror.ErrConflict("Message")` → HTTP 409
  - `apperror.ErrUnauthorized` → HTTP 401
  - `apperror.ErrForbidden` → HTTP 403
  - `apperror.ErrInsufficientStock` → HTTP 422
  - `apperror.ErrInsufficientPay` → HTTP 422
- Centralized handler `middleware.CustomHTTPErrorHandler` automatically formats errors into standard JSON `{ code, message, details }`.

---

## 🧪 Testing & Verification

Write unit tests for business services in `internal/service/*_test.go`:

```bash
# Run tests
make test
# or: go test ./... -v -count=1

# Vet code
make vet

# Build binary
make build
```
