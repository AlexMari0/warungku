erDiagram
  categories {
    uuid id PK
    uuid merchant_id FK
    string name
    string color
    int sort_order
  }

  products {
    uuid id PK
    uuid merchant_id FK
    uuid category_id FK
    string name
    string sku
    string barcode
    decimal sell_price
    decimal buy_price
    int stock_qty
    int min_stock
    string unit
    string image_url
    boolean is_active
    timestamp created_at
  }

  suppliers {
    uuid id PK
    uuid merchant_id FK
    string name
    string phone
    string address
    string payment_terms
    timestamp created_at
  }

  purchase_orders {
    uuid id PK
    uuid merchant_id FK
    uuid supplier_id FK
    string po_number
    string status
    decimal total_amount
    timestamp received_at
    timestamp created_at
  }

  purchase_order_items {
    uuid id PK
    uuid purchase_order_id FK
    uuid product_id FK
    int qty_ordered
    int qty_received
    decimal unit_cost
    decimal subtotal
  }

  stock_movements {
    uuid id PK
    uuid product_id FK
    uuid supplier_id FK
    string type
    int quantity
    int qty_before
    int qty_after
    decimal unit_cost
    uuid reference_id
    string reference_type
    string notes
    timestamp created_at
  }

  categories ||--o{ products : "mengelompokkan"
  products ||--o{ stock_movements : "dicatat di"
  products ||--o{ purchase_order_items : "dipesan melalui"
  suppliers ||--o{ purchase_orders : "memasok"
  suppliers ||--o{ stock_movements : "dirujuk di"
  purchase_orders ||--|{ purchase_order_items : "berisi"
  purchase_orders ||--o{ stock_movements : "memicu"

---

Berikut penjelasan mendalam tiap tabel beserta keputusan desainnya:

---

### `categories` — Kategori Produk

Tabel paling ringan di modul ini, namun penting untuk navigasi di POS. Kolom `color` menyimpan hex code (`#FF5733`) yang digunakan UI untuk memberi warna berbeda tiap kategori di layar kasir — membantu pemilik warung menemukan produk lebih cepat tanpa mengetik nama. Kolom `sort_order` memungkinkan merchant mengurutkan kategori sesuai preferensi (misalnya: Minuman paling atas karena paling sering dicari).

---

### `products` — Master Produk

Ini tabel paling sering dibaca di seluruh sistem WarungKu — POS, Stok, Laporan, Toko Online, dan AI semuanya bergantung di sini. Ada beberapa keputusan desain penting:

`sell_price` vs `buy_price` dipisah karena `buy_price` (Harga Pokok Pembelian) dibutuhkan untuk menghitung margin laba di modul Laporan, namun tidak pernah ditampilkan ke pelanggan. Kolom `stock_qty` adalah nilai stok *saat ini* — nilainya selalu sinkron dengan hasil akhir semua baris di `stock_movements`. Kolom `min_stock` adalah ambang batas notifikasi: setiap kali `stock_qty` turun menyentuh atau di bawah nilai ini, sistem memicu alert ke merchant via WhatsApp. Kolom `sku` dan `barcode` bersifat opsional tapi diindeks untuk mempercepat pencarian di layar kasir.

---

### `stock_movements` — Ledger Mutasi Stok

Ini tabel paling krusial untuk audit dan rekonsiliasi. Prinsip desainnya adalah **append-only** — tidak ada baris yang diupdate atau dihapus, hanya ditambah. Setiap perubahan stok, dari sumber mana pun, menghasilkan satu baris baru.

Kolom `type` berisi enum: `purchase` (stok masuk dari supplier), `sale` (stok keluar karena transaksi POS), `adjustment` (koreksi manual saat stok opname), `return` (barang retur dari pelanggan), `waste` (barang rusak/kadaluarsa). Kolom `qty_before` dan `qty_after` disimpan eksplisit meski bisa dihitung — ini sengaja untuk mempercepat audit trail tanpa harus mereplay seluruh history. Kolom `reference_id` + `reference_type` adalah pola *polymorphic reference*: bisa menunjuk ke `orders.id` (jika pemicunya adalah transaksi POS) atau ke `purchase_orders.id` (jika pemicunya adalah penerimaan barang dari supplier).

---

### `suppliers` — Data Supplier

Menyimpan kontak dan syarat pembayaran supplier. Kolom `payment_terms` menyimpan teks bebas seperti `"Net 30"` atau `"COD"` — sengaja tidak dijadikan enum agar fleksibel mengikuti kebiasaan supplier lokal yang beragam. Tabel ini juga dirujuk langsung oleh `stock_movements` untuk kasus pengembalian barang ke supplier tanpa membuat Purchase Order terlebih dahulu.

---

### `purchase_orders` — Pemesanan ke Supplier

Merepresentasikan satu dokumen PO (Purchase Order). Kolom `status` mengalir dari `draft` → `sent` → `received` → `cancelled`. Kolom `received_at` diisi saat merchant mengkonfirmasi barang sudah tiba — event inilah yang memicu insert otomatis ke `stock_movements` dengan type `purchase` dan update `stock_qty` di tabel `products`.

---

### `purchase_order_items` — Rincian Item PO

Serupa dengan `order_items` di modul POS, tabel ini adalah penghubung antara PO dan produk. Kolom `qty_ordered` vs `qty_received` dipisah untuk menangani kasus pengiriman parsial — supplier mengirim 80 dari 100 unit yang dipesan, sehingga sistem bisa mencatat selisihnya dan memicu PO susulan.

---

### Alur Data: Dari PO ke Stok

Berikut urutan operasi yang terjadi saat merchant menerima kiriman barang dari supplier, untuk menggambarkan bagaimana keenam tabel bekerja bersama:

```
1. Merchant buat purchase_orders (status: draft)
2. Isi purchase_order_items per produk yang dipesan
3. Kirim PO → status berubah ke 'sent'
4. Barang tiba → merchant konfirmasi penerimaan
5. Sistem update purchase_orders.status = 'received'
6. Sistem update purchase_order_items.qty_received
7. Sistem INSERT ke stock_movements
   (type='purchase', reference_type='purchase_order')
8. Sistem UPDATE products.stock_qty += qty_received
   (dalam satu database transaction)
```

Langkah 7 dan 8 harus berjalan dalam satu `BEGIN/COMMIT` — jika update `stock_qty` gagal, insert ke `stock_movements` juga harus dibatalkan agar tidak ada catatan mutasi tanpa perubahan stok aktual yang terjadi.