erDiagram
  customers {
    uuid id PK
    uuid merchant_id FK
    string name
    string phone
    decimal total_debt
    int loyalty_points
    timestamp created_at
  }

  orders {
    uuid id PK
    uuid merchant_id FK
    uuid customer_id FK
    string order_number
    string status
    decimal subtotal
    decimal discount_amount
    decimal total_amount
    string notes
    timestamp created_at
  }

  order_items {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    decimal unit_price
    decimal discount
    decimal subtotal
  }

  payments {
    uuid id PK
    uuid order_id FK
    string method
    decimal amount
    decimal change_amount
    string reference_number
    string status
    timestamp paid_at
  }

  receipts {
    uuid id PK
    uuid order_id FK
    string receipt_number
    string sent_via
    timestamp sent_at
  }

  products {
    uuid id PK
    string name
    decimal price
    int stock_qty
  }

  customers ||--o{ orders : "bertransaksi"
  orders ||--|{ order_items : "berisi"
  orders ||--|| payments : "dilunasi oleh"
  orders ||--o| receipts : "menghasilkan"
  order_items }o--|| products : "merujuk"

---

Berikut ERD lengkap untuk modul Kasir Digital, dilanjutkan dengan penjelasan tiap tabel:Berikut penjelasan mendalam untuk setiap tabel:

---

### `customers` — Data Pelanggan

Tabel ini menyimpan profil pelanggan yang pernah bertransaksi di warung. Kolom `total_debt` mencatat akumulasi hutang aktif pelanggan, diperbarui setiap kali ada transaksi kredit atau pelunasan. Kolom `loyalty_points` bertambah otomatis setiap transaksi berbayar dan menjadi fondasi untuk fitur program poin di modul 4.5. Relasi ke `orders` bersifat opsional — transaksi tanpa data pelanggan tetap bisa dilakukan (pelanggan anonim).

---

### `orders` — Header Transaksi

Ini adalah tabel inti POS. Setiap baris mewakili satu sesi kasir — satu struk. Kolom `status` menggunakan enum: `pending` (keranjang sedang diisi), `paid` (sudah dilunasi), `cancelled` (dibatalkan). Kolom `order_number` berformat human-readable seperti `WK-20250430-0042` untuk keperluan referensi di struk fisik. `discount_amount` dicatat di level order untuk diskon global, terpisah dari diskon per item di `order_items`.

---

### `order_items` — Rincian Item per Transaksi

Tabel penghubung antara `orders` dan `products`. Setiap baris adalah satu baris di struk. Kolom `unit_price` disalin dari harga produk saat transaksi — bukan FK ke harga — karena harga produk bisa berubah di kemudian hari, sementara riwayat transaksi harus tetap akurat. Ini pola "snapshot price" yang umum dipakai di sistem POS.

---

### `payments` — Data Pembayaran

Sengaja dipisah dari `orders` agar fleksibel mendukung split payment di masa depan (misalnya, Rp 30.000 cash + Rp 20.000 QRIS untuk satu transaksi). Kolom `method` berisi enum: `cash`, `qris`, `gopay`, `ovo`, `dana`, `transfer`. Kolom `reference_number` menyimpan nomor referensi dari payment gateway untuk rekonsiliasi. `change_amount` dihitung di backend dan disimpan untuk audit log.

---

### `receipts` — Log Pengiriman Struk

Tabel ringan yang mencatat apakah struk sudah dikirim dan lewat jalur apa. Kolom `sent_via` berisi enum: `print`, `whatsapp`, `email`. Digunakan untuk fitur "kirim ulang struk" dan analitik preferensi pelanggan.

---

### `products` *(dari modul Stok)*

Ditampilkan di ERD karena `order_items` membutuhkan `product_id` sebagai foreign key. Tabel ini milik Modul 1 (Manajemen Stok) — ini yang menjadikan Stok sebagai fondasi yang harus dibangun lebih dulu dari POS.

---

### Catatan Desain Penting

Ada dua keputusan arsitektur yang perlu diperhatikan saat implementasi. Pertama, gunakan **database transaction** (PostgreSQL `BEGIN/COMMIT`) setiap kali menyimpan satu transaksi kasir — insert ke `orders`, `order_items`, dan `payments` harus atomic: jika salah satu gagal, semuanya rollback. Kedua, tambahkan **index komposit** pada `orders(merchant_id, created_at)` karena query paling sering adalah "tampilkan transaksi hari ini untuk merchant X" — tanpa index ini, laporan harian akan lambat seiring volume data bertambah.