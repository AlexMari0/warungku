// =============================================================================
// WARUNGKU DOMAIN TYPES
// Authoritative TypeScript interfaces matching remote database schemas
// =============================================================================

// ---------------------------------------------------------------------------
// Shared Enums & Primitive Unions
// ---------------------------------------------------------------------------
export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'waste'
export type StockReferenceType = 'order' | 'purchase_order' | 'adjustment'

export type OrderStatus = 'pending' | 'paid' | 'cancelled'
export type PaymentMethod = 'cash' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'transfer'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type ReceiptSentVia = 'print' | 'whatsapp' | 'email'

export type SummaryPeriodType = 'daily' | 'weekly' | 'monthly'

export type OnlineOrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled'

export type AIQueryType = 'analysis' | 'recommendation' | 'forecast' | 'content_gen' | 'anomaly'
export type AIRating = 'helpful' | 'not_helpful'

// ---------------------------------------------------------------------------
// Module 1: Stock & Inventory
// ---------------------------------------------------------------------------
export interface Merchant {
  id: string
  name: string
  created_at: string
}

export interface Category {
  id: string
  merchant_id: string
  name: string
  color: string | null
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  merchant_id: string
  category_id: string | null
  name: string
  sku: string | null
  barcode: string | null
  sell_price: number
  buy_price: number
  stock_qty: number
  min_stock: number
  unit: string
  image_url: string | null
  is_active: boolean
  created_at: string
  // Optional joined properties
  categories?: Pick<Category, 'name' | 'color'> | null
}

export interface StockMovement {
  id: string
  product_id: string
  supplier_id?: string | null
  type: StockMovementType
  quantity: number
  qty_before: number
  qty_after: number
  unit_cost?: number | null
  reference_id?: string | null
  reference_type?: StockReferenceType | null
  notes?: string | null
  created_at: string
  // Optional joined properties
  products?: Pick<Product, 'name' | 'unit' | 'sku'> | null
}

// ---------------------------------------------------------------------------
// Module 2: Kasir Digital / POS
// ---------------------------------------------------------------------------
export interface Customer {
  id: string
  merchant_id: string
  name: string
  phone: string | null
  total_debt: number
  loyalty_points: number
  created_at: string
}

export interface Order {
  id: string
  merchant_id: string
  customer_id: string | null
  order_number: string
  status: OrderStatus
  subtotal: number
  discount_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  // Optional joined relations
  customer?: Customer | null
  order_items?: OrderItem[]
  payments?: Payment[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  // Optional joined relation
  products?: Pick<Product, 'name' | 'sku' | 'image_url' | 'unit'> | null
}

export interface Payment {
  id: string
  order_id: string
  method: PaymentMethod
  amount: number
  change_amount: number
  reference_number?: string | null
  status: PaymentStatus
  paid_at?: string | null
}

export interface Receipt {
  id: string
  order_id: string
  receipt_number: string
  sent_via: ReceiptSentVia
  sent_at: string
}

// Client-side POS Cart Item
export interface CartItem {
  id?: string
  product_id: string
  name: string
  sku?: string | null
  price: number
  unit_price: number
  cost_price: number
  buy_price?: number
  quantity: number
  unit: string
  max_stock: number
  image_url?: string | null
  subtotal: number
  discount: number
}

// ---------------------------------------------------------------------------
// Module 3: Laporan & Analytics
// ---------------------------------------------------------------------------
export interface DailySummary {
  id?: string
  merchant_id?: string
  summary_date?: string
  total_orders?: number
  total_revenue?: number
  total_cogs?: number
  gross_profit?: number
  total_discount?: number
  total_items_sold?: number
  avg_transaction?: number
  top_payment_method?: string | null
  refreshed_at?: string
  storefront_views?: number
  storefront_page_views?: number
  storefront_whatsapp_clicks?: number
  storefront_conversions?: number
}

export interface SummaryComparison {
  total_revenue: number
  gross_profit: number
  total_orders: number
  avg_transaction: number
  storefront_page_views: number
  storefront_whatsapp_clicks: number
  storefront_conversions: number
}

export interface ProductSalesSummary {
  id: string
  merchant_id: string
  product_id: string
  period_type: SummaryPeriodType
  period_start: string
  quantity_sold: number
  revenue: number
  cogs: number
  gross_profit: number
  return_quantity: number
  // Computeds & Joined properties
  name?: string
  sku?: string
  color?: string
  category?: string
  qty?: number
  profit?: number
  products?: {
    name: string
    image_url: string | null
    sku: string | null
    categories?: Pick<Category, 'name' | 'color'> | null
  } | null
}

export interface HourlyTraffic {
  id: string
  merchant_id: string
  summary_date: string
  hour_bucket: number
  order_count: number
  revenue: number
  hour_of_day?: number
  transaction_count?: number
}

export interface PaymentMethodSummary {
  id: string
  merchant_id: string
  period_type: SummaryPeriodType
  period_start: string
  method: PaymentMethod
  transaction_count: number
  total_amount: number
}

// ---------------------------------------------------------------------------
// Module 4: Online Store
// ---------------------------------------------------------------------------
export interface Storefront {
  id: string
  merchant_id: string
  slug: string
  display_name: string
  description: string | null
  banner_url: string | null
  theme_color: string
  is_published: boolean
  custom_domain?: string | null
  created_at: string
}

export interface StorefrontProduct {
  id: string
  storefront_id: string
  product_id: string
  is_featured: boolean
  sort_order: number
  custom_description: string | null
  // Joined relation
  products?: Product | any
}

export interface OnlineOrder {
  id: string
  storefront_id: string
  customer_id?: string | null
  customer_name: string
  customer_phone: string
  status: OnlineOrderStatus
  total_amount: number
  notes?: string | null
  wa_message_id?: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Module 5: AI Assistant & Coach
// ---------------------------------------------------------------------------
export interface AISession {
  id: string
  merchant_id: string
  title: string
  context_snapshot?: Record<string, any> | null
  last_active_at: string
  created_at: string
}

export interface AIQueryLog {
  id: string
  session_id: string
  merchant_id: string
  query_text: string
  response_text: string | null
  query_type: AIQueryType
  tokens_used: number
  latency_ms?: number | null
  model_version: string
  created_at: string
}

export interface AIFeedback {
  id: string
  query_log_id: string
  merchant_id: string
  rating: AIRating
  feedback_text?: string | null
  created_at: string
}

export interface AIMessageUI {
  id: string
  query_text: string
  response_text: string
  query_type: AIQueryType
  created_at: string
  rating?: AIRating | null
  failed?: boolean
  error_text?: string
}
