erDiagram
  storefronts {
    uuid id PK
    uuid merchant_id FK
    string slug
    string display_name
    text description
    string banner_url
    string theme_color
    boolean is_published
    string custom_domain
    timestamp created_at
  }

  storefront_products {
    uuid id PK
    uuid storefront_id FK
    uuid product_id FK
    boolean is_featured
    int sort_order
    text custom_description
  }

  online_orders {
    uuid id PK
    uuid storefront_id FK
    uuid customer_id FK
    string customer_name
    string customer_phone
    string status
    decimal total_amount
    string notes
    string wa_message_id
    timestamp created_at
  }

  promotions {
    uuid id PK
    uuid merchant_id FK
    string name
    string type
    decimal value
    decimal min_purchase
    int max_uses
    int used_count
    timestamp valid_from
    timestamp valid_until
    boolean is_active
  }

  loyalty_programs {
    uuid id PK
    uuid merchant_id FK
    decimal points_per_amount
    decimal points_to_rupiah
    int min_redeem_points
    boolean is_active
  }

  loyalty_transactions {
    uuid id PK
    uuid customer_id FK
    uuid merchant_id FK
    uuid order_id FK
    string type
    int points
    int balance_before
    int balance_after
    string notes
    timestamp created_at
  }

  debt_records {
    uuid id PK
    uuid merchant_id FK
    uuid customer_id FK
    uuid order_id FK
    string type
    decimal amount
    decimal balance_before
    decimal balance_after
    date due_date
    string notes
    timestamp created_at
  }

  broadcast_campaigns {
    uuid id PK
    uuid merchant_id FK
    uuid promotion_id FK
    string name
    text message_template
    string target_type
    timestamp scheduled_at
    int sent_count
    string status
    timestamp created_at
  }

  broadcast_recipients {
    uuid id PK
    uuid campaign_id FK
    uuid customer_id FK
    string phone
    string status
    timestamp sent_at
  }

  storefronts ||--|{ storefront_products : "menampilkan"
  storefronts ||--o{ online_orders : "menerima"
  online_orders ||--o{ loyalty_transactions : "memicu"
  online_orders ||--o{ debt_records : "mencatat"
  loyalty_programs ||--o{ loyalty_transactions : "mengatur"
  broadcast_campaigns ||--|{ broadcast_recipients : "dikirim ke"
  broadcast_campaigns }o--|| promotions : "membawa"

---

Modul ini adalah yang paling kaya secara domain bisnis — ia menyentuh tiga area yang sangat berbeda: etalase digital, manajemen relasi pelanggan, dan pemasaran. Berikut penjelasan mendalam tiap tabelnya:

---

### `storefronts` — Konfigurasi Toko Online

Setiap merchant memiliki tepat satu baris di tabel ini. Kolom `slug` adalah identifier URL publik, misalnya `warung-sari-bekasi`, yang membentuk alamat `warungku.id/toko/warung-sari-bekasi`. Kolom ini harus unik secara global (bukan hanya per merchant) dan diindeks karena setiap kunjungan pelanggan ke toko online akan meresolve slug ini terlebih dahulu sebelum memuat halaman.

Kolom `custom_domain` menyimpan domain kustom opsional seperti `toko.warungsari.com` — fitur eksklusif paket Bisnis. Kolom `theme_color` menyimpan hex code yang digunakan untuk mewarnai tombol, header, dan aksen visual halaman toko, sehingga tiap warung terasa punya identitas berbeda meski menggunakan template yang sama. Kolom `is_published` adalah sakelar sederhana yang mengontrol apakah halaman toko bisa diakses publik atau hanya terlihat oleh merchant saat preview.

---

### `storefront_products` — Etalase Produk

Tabel penghubung antara `storefronts` dan `products` (dari modul Stok). Tidak semua produk di database otomatis tampil di toko online — merchant memilih secara eksplisit produk mana yang ingin dipajang. Kolom `is_featured` menandai produk unggulan yang tampil di bagian atas halaman, dan `sort_order` mengontrol urutan tampilannya. Kolom `custom_description` memungkinkan merchant menulis deskripsi marketing yang berbeda dari nama produk standar di sistem — misalnya produk bernama "Kopi Robusta 250g" bisa tampil di toko online dengan deskripsi lebih menarik.

Stok yang ditampilkan di halaman toko online selalu diambil secara real-time dari `products.stock_qty`. Jika stok habis, produk otomatis ditandai "Stok Habis" tanpa merchant perlu melakukan apapun — ini keuntungan nyata dibanding merchant yang mengelola katalog WhatsApp secara manual.

---

### `online_orders` — Pesanan dari Toko Online

Berbeda dari `orders` di modul POS yang mencatat transaksi tunai di kasir, tabel ini menangkap pesanan yang masuk dari halaman toko online. Kolom `wa_message_id` menyimpan ID pesan WhatsApp dari Fonnte/WA Cloud API — ini adalah jembatan antara sistem dan chat WA merchant, memungkinkan notifikasi pesanan baru masuk langsung ke HP merchant tanpa membuka dashboard.

Kolom `status` mengalir melalui siklus: `pending` (baru masuk) → `confirmed` (merchant terima) → `processing` (sedang disiapkan) → `completed` (selesai, bayar, barang diterima) atau `cancelled`. Saat status berubah ke `completed` dan pembayaran dikonfirmasi, sistem memicu dua hal secara otomatis: insert ke `loyalty_transactions` untuk menambah poin pelanggan, dan update `products.stock_qty` melalui `stock_movements` seperti transaksi POS biasa.

---

### `promotions` — Konfigurasi Promo

Tabel ini menyimpan semua jenis promo yang bisa dibuat merchant. Kolom `type` berisi enum: `percentage` (diskon 10%), `fixed_amount` (potongan Rp 5.000), `buy_x_get_y` (beli 2 gratis 1). Kolom `min_purchase` memastikan promo hanya berlaku jika total belanja mencapai ambang tertentu. Kolom `max_uses` dan `used_count` bekerja bersama untuk membatasi kuota promo — jika `used_count >= max_uses`, sistem menolak penerapan promo secara otomatis. Kombinasi `valid_from` dan `valid_until` memungkinkan merchant menjadwalkan promo weekend tanpa harus aktif mengaktifkan/menonaktifkannya secara manual.

---

### `loyalty_programs` — Konfigurasi Program Poin

Setiap merchant punya satu baris konfigurasi di sini. Kolom `points_per_amount` mendefinisikan rasio penghargaan: nilai `1000` berarti pelanggan mendapat 1 poin setiap Rp 1.000 belanja. Kolom `points_to_rupiah` mendefinisikan nilai tukar: nilai `100` berarti 100 poin = Rp 100 saat redemption. Merchant bisa mengubah konfigurasi ini kapan saja, dan perubahan hanya berlaku untuk transaksi baru — riwayat poin yang sudah dikumpulkan pelanggan tidak terpengaruh.

---

### `loyalty_transactions` — Ledger Poin Pelanggan

Sama seperti `stock_movements`, tabel ini bersifat **append-only** — tidak ada baris yang diupdate, hanya ditambah. Kolom `type` berisi enum: `earn` (poin masuk dari belanja), `redeem` (poin ditukar diskon), `expire` (poin kedaluwarsa jika merchant mengaktifkan fitur ini), `referral` (bonus poin dari ajak teman). Kolom `balance_before` dan `balance_after` menyimpan snapshot saldo poin sebelum dan sesudah transaksi — ini membuat audit trail poin menjadi sangat transparan dan mudah direkonstruksi jika ada keluhan pelanggan.

Saldo poin aktif seorang pelanggan selalu dihitung dari baris terakhir di tabel ini (`balance_after` baris terbaru), bukan dari `SUM(points)` seluruh history — ini jauh lebih efisien untuk query real-time.

---

### `debt_records` — Ledger Hutang Pelanggan

Menggunakan desain yang identik dengan `loyalty_transactions` — append-only dengan snapshot `balance_before` dan `balance_after`. Kolom `type` hanya punya dua nilai: `debt` (hutang baru bertambah) dan `payment` (pembayaran masuk, hutang berkurang). Kolom `due_date` opsional — merchant bisa menetapkan tenggat bayar yang digunakan sistem untuk mengirim pengingat otomatis via WhatsApp sehari sebelum jatuh tempo. Kolom `order_id` menautkan hutang ke transaksi POS spesifik sehingga merchant tahu hutang ini berasal dari pembelian apa.

---

### `broadcast_campaigns` & `broadcast_recipients` — Mesin Pemasaran

Dua tabel ini bekerja seperti sistem email marketing, tapi berbasis WhatsApp. `broadcast_campaigns` adalah template kampanye: merchant menulis pesan di `message_template` dengan variabel seperti `{{nama_pelanggan}}` dan `{{poin_saat_ini}}`, memilih segmen target (`all` untuk semua pelanggan atau `segment` untuk filter tertentu seperti "pelanggan yang tidak belanja 30 hari terakhir"), dan menjadwalkan waktu kirim di `scheduled_at`.

Saat jadwal tiba, worker mengekspansi kampanye menjadi baris-baris individual di `broadcast_recipients` — satu baris per nomor penerimaan — lalu mengirimnya secara bertahap melalui Fonnte API untuk menghindari rate limiting WhatsApp. Status setiap pengiriman diupdate di `broadcast_recipients.status`: dari `pending` → `sent` → `delivered` atau `failed`. Agregat `sent_count` di tabel kampanye diupdate setiap batch selesai, memberikan merchant gambaran progres pengiriman secara real-time.

---

### Titik Integrasi Kritis dengan Modul Lain

Modul ini adalah yang paling banyak bergantung pada modul sebelumnya. `storefront_products` membutuhkan `products` dari Stok agar stok real-time bisa ditampilkan. `online_orders` yang selesai memicu `stock_movements` persis seperti transaksi POS biasa. `loyalty_transactions` membaca konfigurasi dari `loyalty_programs` dan merujuk ke `orders` atau `online_orders` sebagai sumber perolehan poin. Tanpa data pelanggan yang matang dari modul POS, fitur segmentasi broadcast tidak akan punya cukup data historis untuk bermakna — inilah mengapa modul ini ada di urutan keempat dalam prioritas implementasi.