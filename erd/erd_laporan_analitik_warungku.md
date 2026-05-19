erDiagram
  daily_summaries {
    uuid id PK
    uuid merchant_id FK
    date summary_date
    int total_orders
    decimal total_revenue
    decimal total_cogs
    decimal gross_profit
    decimal total_discount
    int total_items_sold
    decimal avg_transaction
    string top_payment_method
    timestamp refreshed_at
  }

  product_sales_summary {
    uuid id PK
    uuid merchant_id FK
    uuid product_id FK
    string period_type
    date period_start
    int quantity_sold
    decimal revenue
    decimal cogs
    decimal gross_profit
    int return_quantity
  }

  hourly_traffic {
    uuid id PK
    uuid merchant_id FK
    date traffic_date
    int hour_of_day
    int transaction_count
    decimal revenue
  }

  payment_method_summary {
    uuid id PK
    uuid merchant_id FK
    date period_start
    string period_type
    string method
    int transaction_count
    decimal total_amount
  }

  stock_valuation_snapshots {
    uuid id PK
    uuid merchant_id FK
    date snapshot_date
    int total_products
    decimal total_stock_value
    int low_stock_count
    int out_of_stock_count
  }

  report_exports {
    uuid id PK
    uuid merchant_id FK
    string report_type
    string format
    date period_start
    date period_end
    string file_url
    string status
    timestamp created_at
  }

  orders {
    uuid id PK
    uuid merchant_id FK
    decimal total_amount
    timestamp created_at
  }

  products {
    uuid id PK
    uuid merchant_id FK
    string name
    int stock_qty
  }

  orders ||--o{ daily_summaries : "diagregasi ke"
  orders ||--o{ hourly_traffic : "diagregasi ke"
  orders ||--o{ payment_method_summary : "diagregasi ke"
  products ||--o{ product_sales_summary : "dianalisis di"
  products ||--o{ stock_valuation_snapshots : "dinilai di"
  daily_summaries ||--o{ report_exports : "diekspor ke"
  product_sales_summary ||--o{ report_exports : "diekspor ke"

---

Modul ini punya karakter yang sangat berbeda dari Stok dan POS — ia **tidak menulis data bisnis baru**, melainkan mengonsumsi dan merangkum data dari modul lain. Seluruh tabelnya diisi oleh background jobs, bukan oleh aksi pengguna secara langsung. Berikut penjelasan tiap tabel:

---

### `daily_summaries` — Ringkasan Harian (Tabel Utama Dashboard)

Ini tabel yang paling sering dibaca oleh dashboard merchant — setiap kali pemilik warung membuka halaman utama, query pertama yang dieksekusi adalah `SELECT * FROM daily_summaries WHERE merchant_id = ? AND summary_date = TODAY`. Karena dibaca sangat sering, data di sini sengaja **dipre-komputasi** oleh sebuah scheduled job yang berjalan setiap malam pukul 00.05.

Kolom `total_cogs` (Cost of Goods Sold) dihitung dari `order_items.quantity × products.buy_price` — inilah alasan kolom `buy_price` di tabel `products` harus selalu akurat. Dari sini, `gross_profit = total_revenue - total_cogs - total_discount` memberikan gambaran keuntungan kotor harian. Kolom `refreshed_at` mencatat kapan terakhir baris ini diperbarui, berguna untuk menampilkan label "Diperbarui 2 jam lalu" di UI.

---

### `product_sales_summary` — Performa Produk per Periode

Tabel ini menjawab pertanyaan: *"Produk apa yang paling laku minggu ini?"* dan *"Produk mana yang harus saya stop jual karena tidak bergerak?"*. Kolom `period_type` berisi enum `daily`, `weekly`, `monthly` — artinya satu produk bisa punya tiga baris untuk periode yang sama, masing-masing untuk granularitas yang berbeda.

Kolom `return_quantity` mencatat berapa unit produk ini dikembalikan pelanggan dalam periode tersebut, sehingga AI di modul 5 bisa mendeteksi pola retur yang tinggi dan memberi peringatan. Kolom `gross_profit` per produk adalah fondasi fitur rekomendasi AI untuk saran penggantian produk margin rendah.

---

### `hourly_traffic` — Pola Jam Ramai

Menyimpan agregasi per jam dalam satu hari. Kolom `hour_of_day` berisi integer 0–23. Data ini dipakai untuk menampilkan *heatmap* jam puncak penjualan — fitur analitik P2 di PRD — sehingga merchant tahu kapan harus memastikan stok penuh dan pegawai siap. Background job mengagregasi data ini dari `orders.created_at` menggunakan `EXTRACT(HOUR FROM created_at)`.

---

### `payment_method_summary` — Distribusi Metode Bayar

Tabel ringan yang menjawab: *"Berapa persen pelanggan saya bayar pakai QRIS vs cash?"*. Data ini berguna untuk dua hal: pertama, membantu merchant memutuskan apakah layak berlangganan payment gateway berbayar jika QRIS belum banyak dipakai; kedua, menjadi input bagi modul AI untuk rekomendasi promosi (misalnya, buat promo khusus pengguna GoPay jika GoPay sedang underperform).

---

### `stock_valuation_snapshots` — Valuasi Stok Harian

Setiap malam, background job mengambil snapshot kondisi stok seluruh produk. Kolom `total_stock_value` dihitung dari `SUM(stock_qty × buy_price)` — ini adalah nilai aset inventori yang tersimpan di gudang warung. Kolom `low_stock_count` dan `out_of_stock_count` direkam historis sehingga merchant bisa melihat tren: *"Sudah 5 hari berturut-turut ada 3 produk yang sering habis — saya perlu naikkan stok minimum."*

---

### `report_exports` — Log File Ekspor

Setiap kali merchant menekan tombol "Unduh Laporan", sistem tidak langsung menghasilkan file — melainkan membuat satu baris di tabel ini dengan `status = 'queued'`, lalu memasukkan job ke antrian (Redis Queue). Worker yang berjalan di background mengambil job tersebut, menghasilkan PDF atau Excel, mengunggahnya ke Cloudflare R2, dan mengupdate `file_url` serta `status = 'done'`. UI polling setiap 3 detik hingga status berubah, lalu menampilkan tombol unduh. Pendekatan ini mencegah request timeout untuk laporan besar dan memberikan pengalaman yang tidak memblokir pengguna.

---

### Arsitektur: Scheduled Jobs & Refresh Strategy

Ada dua strategi refresh yang dipakai, tergantung urgensi data:

**Nightly batch** (pukul 00.05 setiap hari) mengisi `daily_summaries`, `product_sales_summary`, `stock_valuation_snapshots`, dan `payment_method_summary` untuk hari kemarin. Memproses semua merchant secara paralel dengan worker pool.

**Near real-time** untuk `hourly_traffic` — diupdate setiap 15 menit menggunakan PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` (upsert), sehingga grafik jam ramai di dashboard terasa responsif meski merchant baru saja buka warung pagi ini.

Pemisahan kedua strategi ini penting: mencoba refresh semua tabel secara real-time akan membebani database utama, sementara membiarkan semua data batch-only akan membuat dashboard terasa "basi" dan tidak berguna bagi merchant yang membutuhkan insight hari ini.