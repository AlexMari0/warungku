import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

// Parse .env manual parsing to guarantee zero external dependency issues
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env')
const envFile = fs.readFileSync(envPath, 'utf8')
const env = {}
envFile.split('\n').forEach((line) => {
  const [key, ...values] = line.split('=')
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim()
  }
})

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_KEY not found in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Seeder configuration
const MERCHANT_EMAIL = 'test_1779208029340@warungku.com'
const MERCHANT_PASSWORD = 'TestPassword123!'

async function seed() {
  console.log('🏁 Starting WarungKu Database Seeding Process...')

  // 1. Authenticate
  console.log(`🔑 Logging in as merchant: ${MERCHANT_EMAIL}...`)
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: MERCHANT_EMAIL,
    password: MERCHANT_PASSWORD,
  })

  if (authErr) {
    console.error('❌ Authentication failed:', authErr.message)
    process.exit(1)
  }

  const merchantId = authData.user.id
  console.log(`✅ Authenticated successfully! Merchant ID: ${merchantId}`)

  // 2. Clear Existing Data (Topologically Safe Cascade Purge)
  console.log('\n🗑️ Purging existing records to ensure clean seeder execution...')

  // Fetch existing product IDs of this merchant to clear dependent stock_movements / storefront_products
  const { data: existingProds, error: fetchProdsErr } = await supabase
    .from('products')
    .select('id')
    .eq('merchant_id', merchantId)
  
  if (fetchProdsErr) {
    console.warn('⚠️ Warning: Could not fetch existing products:', fetchProdsErr.message)
  }
  const productIds = (existingProds || []).map(p => p.id)

  // Fetch existing order IDs to clear dependent payments / order_items
  const { data: existingOrders, error: fetchOrdersErr } = await supabase
    .from('orders')
    .select('id')
    .eq('merchant_id', merchantId)

  if (fetchOrdersErr) {
    console.warn('⚠️ Warning: Could not fetch existing orders:', fetchOrdersErr.message)
  }
  const orderIds = (existingOrders || []).map(o => o.id)

  // Fetch existing storefront IDs of this merchant to clear dependent online_orders
  const { data: existingSfs, error: fetchSfsErr } = await supabase
    .from('storefronts')
    .select('id')
    .eq('merchant_id', merchantId)

  if (fetchSfsErr) {
    console.warn('⚠️ Warning: Could not fetch existing storefronts:', fetchSfsErr.message)
  }
  const sfIds = (existingSfs || []).map(sf => sf.id)

  const tablesToClear = [
    { name: 'payment_method_summary', query: () => supabase.from('payment_method_summary').delete().eq('merchant_id', merchantId) },
    { name: 'product_sales_summary', query: () => supabase.from('product_sales_summary').delete().eq('merchant_id', merchantId) },
    { name: 'hourly_traffic', query: () => supabase.from('hourly_traffic').delete().eq('merchant_id', merchantId) },
    { name: 'daily_summaries', query: () => supabase.from('daily_summaries').delete().eq('merchant_id', merchantId) },
    { name: 'payments', query: () => orderIds.length > 0 ? supabase.from('payments').delete().in('order_id', orderIds) : null },
    { name: 'order_items', query: () => orderIds.length > 0 ? supabase.from('order_items').delete().in('order_id', orderIds) : null },
    { name: 'orders', query: () => supabase.from('orders').delete().eq('merchant_id', merchantId) },
    { name: 'stock_movements', query: () => productIds.length > 0 ? supabase.from('stock_movements').delete().in('product_id', productIds) : null },
    { name: 'storefront_products', query: () => productIds.length > 0 ? supabase.from('storefront_products').delete().in('product_id', productIds) : null },
    { name: 'online_orders', query: () => sfIds.length > 0 ? supabase.from('online_orders').delete().in('storefront_id', sfIds) : null },
    { name: 'storefronts', query: () => supabase.from('storefronts').delete().eq('merchant_id', merchantId) },
    { name: 'products', query: () => supabase.from('products').delete().eq('merchant_id', merchantId) },
    { name: 'categories', query: () => supabase.from('categories').delete().eq('merchant_id', merchantId) },
    { name: 'customers', query: () => supabase.from('customers').delete().eq('merchant_id', merchantId) },
    { name: 'suppliers', query: () => supabase.from('suppliers').delete().eq('merchant_id', merchantId) },
  ]

  for (const table of tablesToClear) {
    const q = table.query()
    if (!q) {
      console.log(`  ✓ Table already empty: ${table.name}`)
      continue
    }
    const { error } = await q
    if (error) {
      console.warn(`⚠️ Warning: Error clearing table ${table.name}:`, error.message)
    } else {
      console.log(`  ✓ Cleared table: ${table.name}`)
    }
  }

  console.log('✅ Purge complete! Database is clean.')

  // 3. Seed Supplier
  console.log('\n📦 Seeding Supplier...')
  const { data: supplier, error: supErr } = await supabase
    .from('suppliers')
    .insert({
      merchant_id: merchantId,
      name: 'UD Sumber Makmur',
      phone: '08123456001',
      address: 'Jl. Pasar Baru No. 12, Jakarta Pusat',
      payment_terms: 'Cash on Delivery (COD)'
    })
    .select().single()

  if (supErr) throw new Error(`Supplier seeding failed: ${supErr.message}`)
  console.log(`  ✓ Supplier created: ${supplier.name}`)

  // 4. Seed Categories
  console.log('\n🏷️ Seeding Categories...')
  const categoriesToSeed = [
    { name: 'Sembako', color: '#10b981', sort_order: 1 },
    { name: 'Minuman', color: '#0284c7', sort_order: 2 },
    { name: 'Makanan Ringan', color: '#f59e0b', sort_order: 3 },
    { name: 'Rokok', color: '#ef4444', sort_order: 4 }
  ]

  const categoriesMap = {}
  for (const cat of categoriesToSeed) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        merchant_id: merchantId,
        name: cat.name,
        color: cat.color,
        sort_order: cat.sort_order
      })
      .select().single()

    if (error) throw new Error(`Category seeding failed for ${cat.name}: ${error.message}`)
    categoriesMap[cat.name] = data.id
    console.log(`  ✓ Category created: ${data.name} (ID: ${data.id})`)
  }

  // 5. Seed Products (Realistic stock, pricing, structures)
  console.log('\n🛒 Seeding Products...')
  const productsToSeed = [
    // Sembako
    { name: 'Beras Sentra Ramos 5kg', cat: 'Sembako', sku: 'SEM-BRS-RAM', barcode: '8992222111001', buy: 68000, sell: 75000, qty: 85, min: 5, unit: 'karung' },
    { name: 'Minyak Goreng Bimoli 2L', cat: 'Sembako', sku: 'SEM-MYK-BIM', barcode: '8992222111002', buy: 32000, sell: 36500, qty: 100, min: 8, unit: 'pouch' },
    { name: 'Gula Pasir Gulaku 1kg', cat: 'Sembako', sku: 'SEM-GLA-GUL', barcode: '8992222111003', buy: 14500, sell: 17000, qty: 110, min: 10, unit: 'pcs' },
    // Minuman
    { name: 'Aqua 600ml', cat: 'Minuman', sku: 'MIN-AQA-600', buy: 2500, sell: 3500, qty: 240, min: 24, unit: 'botol' },
    { name: 'Teh Botol Sosro 350ml', cat: 'Minuman', sku: 'MIN-TBS-350', buy: 3000, sell: 4500, qty: 180, min: 12, unit: 'botol' },
    { name: 'Kopi Kapal Api Sachet', cat: 'Minuman', sku: 'MIN-KAP-SCT', buy: 1200, sell: 2000, qty: 300, min: 30, unit: 'pcs' },
    // Makanan Ringan
    { name: 'Indomie Goreng Spesial', cat: 'Makanan Ringan', sku: 'MAK-IND-GOR', barcode: '8998888111222', buy: 2800, sell: 3500, qty: 350, min: 40, unit: 'pcs' },
    { name: 'Roma Kelapa 300g', cat: 'Makanan Ringan', sku: 'MAK-ROM-KEL', buy: 8500, sell: 10500, qty: 120, min: 10, unit: 'pcs' },
    { name: 'Chiki Balls Keju', cat: 'Makanan Ringan', sku: 'MAK-CHK-BAL', buy: 4000, sell: 5500, qty: 140, min: 15, unit: 'pcs' },
    // Rokok
    { name: 'Sampoerna Mild 16', cat: 'Rokok', sku: 'ROK-SAM-MLD', buy: 28000, sell: 31000, qty: 90, min: 5, unit: 'pack' },
    { name: 'Djarum Super 12', cat: 'Rokok', sku: 'ROK-DJR-SPR', buy: 21000, sell: 23500, qty: 80, min: 5, unit: 'pack' },
    { name: 'Gudang Garam Filter 12', cat: 'Rokok', sku: 'ROK-GGF-12', buy: 22000, sell: 24500, qty: 80, min: 5, unit: 'pack' }
  ]

  const productsList = []
  for (const prod of productsToSeed) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        merchant_id: merchantId,
        category_id: categoriesMap[prod.cat],
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode || null,
        buy_price: prod.buy,
        sell_price: prod.sell,
        stock_qty: prod.qty,
        min_stock: prod.min,
        unit: prod.unit,
        is_active: true
      })
      .select().single()

    if (error) throw new Error(`Product seeding failed for ${prod.name}: ${error.message}`)
    productsList.push(data)
    console.log(`  ✓ Product created: ${data.name} | Sell: Rp ${data.sell_price} | Stock: ${data.stock_qty}`)

    // Create Initial Stock Purchase Movement (Audit Log)
    const { error: moveErr } = await supabase
      .from('stock_movements')
      .insert({
        product_id: data.id,
        supplier_id: supplier.id,
        type: 'purchase',
        quantity: prod.qty,
        qty_before: 0,
        qty_after: prod.qty,
        unit_cost: prod.buy,
        reference_type: 'adjustment',
        notes: 'Stok awal ditambahkan via Data Seeder Sistem'
      })

    if (moveErr) console.warn(`  ⚠️ Warning: Initial stock movement failed for ${data.name}:`, moveErr.message)
  }

  // 6. Seed Customers
  console.log('\n👥 Seeding Customers...')
  const customersToSeed = [
    { name: 'Budi Santoso', phone: '08123456789', loyalty_points: 15 },
    { name: 'Siti Aminah', phone: '08139876543', loyalty_points: 42 },
    { name: 'Joko Widodo', phone: '08111222333', loyalty_points: 110 },
    { name: 'Dewi Lestari', phone: '08187654321', loyalty_points: 25 },
    { name: 'Rudi Hermawan', phone: '08571234567', loyalty_points: 8 }
  ]

  const customersList = []
  for (const cust of customersToSeed) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        merchant_id: merchantId,
        name: cust.name,
        phone: cust.phone,
        total_debt: 0,
        loyalty_points: cust.loyalty_points
      })
      .select().single()

    if (error) throw new Error(`Customer seeding failed for ${cust.name}: ${error.message}`)
    customersList.push(data)
    console.log(`  ✓ Customer created: ${data.name} | Points: ${data.loyalty_points}`)
  }

  // 7. Seed Storefront Details (Module 4)
  console.log('\n🛍️ Seeding Online Storefront Setup...')
  const { data: storefrontData, error: sfErr } = await supabase
    .from('storefronts')
    .insert({
      merchant_id: merchantId,
      slug: 'warung-makmur-jaya',
      display_name: 'Warung Makmur Jaya',
      description: 'Menjual sembako, minuman dingin, mie instan, dan kebutuhan sehari-hari Anda dengan harga murah!',
      banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop',
      theme_color: 'emerald',
      is_published: true
    })
    .select().single()

  if (sfErr) {
    console.warn(`  ⚠️ Warning: Storefront seeding failed:`, sfErr.message)
  } else {
    console.log(`  ✓ Storefront setup: /store/${storefrontData.slug}`)

    // Link top 5 products to the storefront
    const storefrontProducts = productsList.slice(0, 5).map((p, idx) => ({
      storefront_id: storefrontData.id,
      product_id: p.id,
      is_featured: idx < 2,
      sort_order: idx + 1,
      custom_description: `Produk fresh berkualitas di Warung Makmur Jaya: ${p.name}.`
    }))

    const { error: sfpErr } = await supabase
      .from('storefront_products')
      .insert(storefrontProducts)

    if (sfpErr) {
      console.warn(`  ⚠️ Warning: Storefront products link failed:`, sfpErr.message)
    } else {
      console.log(`  ✓ Linked top 5 products to online storefront catalog`)
    }
  }

  // 8. Generate 60+ Transaction orders spread across the last 30 days
  console.log('\n📊 Generating 75+ Historical Orders distributed over the past 30 days...')
  
  // Track running stock locally to log correct stock movement before/after boundaries
  const productStocks = {}
  productsList.forEach(p => {
    productStocks[p.id] = p.stock_qty
  })

  const orderDates = []
  const now = new Date()
  
  // Distribute transactions across the last 30 days (average of ~2.5 orders per day)
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const numOrders = Math.floor(Math.random() * 3) + 1 // 1 to 3 orders per day
    for (let oIdx = 0; oIdx < numOrders; oIdx++) {
      const orderDate = new Date(now.getTime())
      orderDate.setDate(now.getDate() - dayOffset)
      
      // Determine hour based on realistic peak distributions:
      // Peak 1: Lunch (11:30 - 13:30)
      // Peak 2: Evening (16:30 - 20:30)
      // Off-peak: Rest of the day
      const rand = Math.random()
      let hour = 8
      if (rand < 0.25) {
        hour = 11 + Math.floor(Math.random() * 3) // Peak 1
      } else if (rand < 0.7) {
        hour = 16 + Math.floor(Math.random() * 5) // Peak 2
      } else {
        hour = 8 + Math.floor(Math.random() * 11) // General hours 08:00 - 19:00
      }
      
      orderDate.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0)
      
      orderDates.push({ date: orderDate, dayStr: orderDate.toISOString().split('T')[0] })
    }
  }

  // Sort orderDates chronologically to write linear transaction history logs
  orderDates.sort((a, b) => a.date.getTime() - b.date.getTime())

  let totalOrdersSeeded = 0
  let orderNumberCounter = 1

  for (const od of orderDates) {
    const transactionDate = od.date
    const datePrefix = od.dayStr.replace(/-/g, '')
    const paddedCounter = String(orderNumberCounter++).padStart(4, '0')
    const orderNumber = `WK-${datePrefix}-${paddedCounter}`

    // 50% chance of guest buyer, 50% chance of registered customer
    const isGuest = Math.random() < 0.5
    const customer = isGuest ? null : customersList[Math.floor(Math.random() * customersList.length)]

    // Select 1 to 3 random items
    const numItems = Math.floor(Math.random() * 3) + 1
    const selectedProds = []
    const availableProds = [...productsList]

    for (let i = 0; i < numItems; i++) {
      const pIdx = Math.floor(Math.random() * availableProds.length)
      selectedProds.push(availableProds.splice(pIdx, 1)[0])
    }

    let subtotal = 0
    const itemsPayload = []

    for (const prod of selectedProds) {
      // 1 to 3 items for general, 1 to 2 for sembako
      const isSembako = prod.sku.startsWith('SEM')
      const qty = isSembako ? (Math.random() < 0.8 ? 1 : 2) : (Math.floor(Math.random() * 3) + 1)
      
      const itemSubtotal = qty * prod.sell_price
      subtotal += itemSubtotal

      itemsPayload.push({
        product_id: prod.id,
        quantity: qty,
        unit_price: prod.sell_price,
        discount: 0,
        subtotal: itemSubtotal
      })
    }

    // Apply occasional discount (15% chance of Rp 1.000 or Rp 2.000 discount)
    const discountAmount = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1000 : 2000) : 0
    const totalAmount = Math.max(0, subtotal - discountAmount)

    // Insert Order
    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        merchant_id: merchantId,
        customer_id: customer ? customer.id : null,
        order_number: orderNumber,
        status: 'paid',
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: isGuest ? null : 'Penjualan POS Pelanggan Setia',
        created_at: transactionDate.toISOString()
      })
      .select().single()

    if (orderErr) {
      console.warn(`  ⚠️ Warning: Failed to insert order ${orderNumber}:`, orderErr.message)
      continue
    }

    // Insert Order Items & stock movements
    for (const item of itemsPayload) {
      const { error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: insertedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal
        })

      if (itemErr) {
        console.warn(`    ⚠️ Warning: Failed to insert order item for product ${item.product_id}:`, itemErr.message)
        continue
      }

      // Decrement running stock in DB and write stock_movement ledger
      const curStock = productStocks[item.product_id] || 50
      const nextStock = curStock - item.quantity
      productStocks[item.product_id] = nextStock

      // Direct update product stock
      await supabase
        .from('products')
        .update({ stock_qty: nextStock })
        .eq('id', item.product_id)

      // Direct append stock movement
      await supabase
        .from('stock_movements')
        .insert({
          product_id: item.product_id,
          type: 'sale',
          quantity: -item.quantity,
          qty_before: curStock,
          qty_after: nextStock,
          unit_cost: null,
          reference_id: insertedOrder.id,
          reference_type: 'order',
          notes: 'Penjualan Kasir POS',
          created_at: transactionDate.toISOString()
        })
    }

    // Insert Payments
    // QRIS vs Cash distribution
    const payMethod = Math.random() < 0.65 ? 'cash' : (Math.random() < 0.6 ? 'qris' : (Math.random() < 0.5 ? 'gopay' : 'dana'))
    let amountPaid = totalAmount
    let changeAmount = 0

    if (payMethod === 'cash') {
      // Round up to nearest Rp 5.000 or Rp 10.000
      const nearest5k = Math.ceil(totalAmount / 5000) * 5000
      amountPaid = Math.random() < 0.7 ? nearest5k : Math.ceil(totalAmount / 10000) * 10000
      changeAmount = amountPaid - totalAmount
    }

    const { error: payErr } = await supabase
      .from('payments')
      .insert({
        order_id: insertedOrder.id,
        method: payMethod,
        amount: amountPaid,
        change_amount: changeAmount,
        status: 'completed',
        paid_at: transactionDate.toISOString()
      })

    if (payErr) {
      console.warn(`    ⚠️ Warning: Failed to insert payment for order ${orderNumber}:`, payErr.message)
    } else {
      totalOrdersSeeded++
    }
  }

  console.log(`✅ Transaction generator completed: Created ${totalOrdersSeeded} orders!`)

  // 9. Rebuild Daily Analytics aggregates
  console.log('\n⚡ Triggering refresh_merchant_analytics RPC loops across past 30 days to pre-compile stats charts...')
  
  // Extract unique transaction days
  const uniqueDays = [...new Set(orderDates.map(od => od.dayStr))]
  console.log(`  🔍 Rebuilding analytics summaries for ${uniqueDays.length} days...`)

  for (const day of uniqueDays) {
    const { error: rpcErr } = await supabase.rpc('refresh_merchant_analytics', {
      p_merchant_id: merchantId,
      p_date: day
    })

    if (rpcErr) {
      console.warn(`    ⚠️ Warning: Analytics aggregation failed for date ${day}:`, rpcErr.message)
    } else {
      console.log(`    ✓ Rebuilt analytics data for: ${day}`)
    }
  }

  console.log('\n🎉 WARUNGKU DATABASE SEEDING COMPLETED SUCCESSFULLY!')
  console.log('----------------------------------------------------')
  console.log(`📧 Account: ${MERCHANT_EMAIL}`)
  console.log(`📂 Categories Seeded: ${Object.keys(categoriesMap).length}`)
  console.log(`📦 Products Seeded: ${productsList.length}`)
  console.log(`👥 Customers Seeded: ${customersList.length}`)
  console.log(`🧾 POS Orders Seeded: ${totalOrdersSeeded}`)
  console.log(`🗓️ Analytics Profiles Seeded: ${uniqueDays.length} days`)
  console.log('----------------------------------------------------')
  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌ Seeding Aborted Due to Unhandled Exception:')
  console.error(err)
  process.exit(1)
})
