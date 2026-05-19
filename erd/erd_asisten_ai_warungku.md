erDiagram
  ai_sessions {
    uuid id PK
    uuid merchant_id FK
    string title
    jsonb context_snapshot
    timestamp last_active_at
    timestamp created_at
  }

  ai_query_logs {
    uuid id PK
    uuid session_id FK
    uuid merchant_id FK
    text query_text
    text response_text
    string query_type
    int tokens_used
    int latency_ms
    string model_version
    timestamp created_at
  }

  ai_cache {
    uuid id PK
    string cache_key
    uuid merchant_id FK
    text response_text
    string query_type
    int hit_count
    timestamp expires_at
    timestamp created_at
  }

  ai_model_contexts {
    uuid id PK
    uuid merchant_id FK
    string context_type
    jsonb context_data
    date data_period_start
    date data_period_end
    timestamp refreshed_at
  }

  ai_insights {
    uuid id PK
    uuid merchant_id FK
    string type
    string title
    text body
    jsonb data_snapshot
    boolean is_read
    boolean is_dismissed
    timestamp valid_until
    timestamp created_at
  }

  ai_usage_quotas {
    uuid id PK
    uuid merchant_id FK
    string plan_type
    date period_start
    int queries_used
    int queries_limit
    int tokens_used
    timestamp reset_at
  }

  ai_feedback {
    uuid id PK
    uuid query_log_id FK
    uuid merchant_id FK
    string rating
    text feedback_text
    timestamp created_at
  }

  ai_sessions ||--|{ ai_query_logs : "mencatat"
  ai_query_logs ||--o| ai_feedback : "dinilai melalui"
  ai_query_logs }o--o| ai_cache : "di-cache dari"
  ai_model_contexts ||--o{ ai_query_logs : "menjadi konteks"
  ai_model_contexts ||--o{ ai_insights : "memicu"
  ai_usage_quotas ||--o{ ai_query_logs : "membatasi"

---

Modul ini adalah yang paling unik secara arsitektur — ia **tidak memiliki wewenang menulis** ke tabel bisnis manapun (produk, stok, transaksi). Tabel-tabel di sini murni infrastruktur pendukung kerja AI: menyimpan percakapan, menghemat biaya API lewat cache, menyiapkan konteks bisnis, dan mengontrol kuota penggunaan. Berikut penjelasan tiap tabelnya:

---

### `ai_sessions` — Sesi Percakapan

Setiap kali merchant membuka panel "Tanya AI", satu sesi baru dibuat. Kolom `title` di-generate otomatis dari query pertama dalam sesi — mirip perilaku sidebar di Claude.ai — sehingga merchant bisa menemukan kembali percakapan lama seperti "Analisis penjualan bulan Maret" atau "Kenapa stok minyak goreng cepat habis?".

Kolom `context_snapshot` menyimpan snapshot data bisnis dalam format `jsonb` pada saat sesi dibuat: omzet 7 hari terakhir, 5 produk terlaris, jumlah stok kritis, dan ringkasan pelanggan aktif. Snapshot ini dipakai sebagai konteks awal yang disertakan di setiap API call ke Claude selama sesi berlangsung. Menyimpannya sebagai snapshot — bukan query ulang setiap pesan — memastikan AI dalam satu sesi berbicara tentang "kondisi warung hari ini" secara konsisten, bukan kondisi yang terus bergeser seiring transaksi masuk.

---

### `ai_query_logs` — Log Setiap Permintaan AI

Ini tabel audit trail paling penting di modul AI. Setiap interaksi merchant dengan asisten — satu pesan masuk dan satu respons keluar — menghasilkan satu baris di sini. Kolom `query_type` mengkategorikan intent permintaan dengan enum: `analysis` (analisis data), `recommendation` (saran tindakan), `forecast` (prediksi), `content_gen` (buat teks promo), `anomaly` (deteksi kejanggalan).

Kolom `tokens_used` dan `latency_ms` adalah data operasional kritis. `tokens_used` dipakai oleh `ai_usage_quotas` untuk menghitung konsumsi kuota, dan juga menjadi dasar estimasi biaya API per merchant. `latency_ms` digunakan tim engineering untuk memantau degradasi performa — jika rata-rata latency tiba-tiba naik dari 1,2 detik ke 4 detik, ada masalah yang perlu diselidiki. Kolom `model_version` menyimpan versi model yang digunakan (misalnya `claude-sonnet-4-20250514`) sehingga tim produk bisa membandingkan kualitas respons antar versi saat melakukan model upgrade.

---

### `ai_cache` — Cache Respons

Satu panggilan ke Claude API bisa menghabiskan biaya ratusan hingga ribuan token. Jika seribu merchant setiap pagi menanyakan pertanyaan yang hampir identik — *"Bagaimana performa warung saya kemarin?"* — tanpa cache, biaya API akan membengkak secara linear. Tabel ini memotong biaya itu secara drastis.

Kolom `cache_key` adalah hash SHA-256 dari kombinasi `query_type + normalized_query + merchant_segment`. "Segment" penting di sini karena warung dengan omzet Rp 2 juta per hari dan warung dengan omzet Rp 200 ribu per hari tidak bisa berbagi cache yang sama meski pertanyaannya identik — konteks bisnisnya berbeda. Kolom `hit_count` mencatat berapa kali cache ini digunakan dan menjadi sinyal untuk memperpanjang `expires_at` pada cache yang populer. Cache untuk analisis harian berumur pendek (TTL 6 jam), sedangkan cache untuk penjelasan konsep bisnis umum seperti *"Apa itu margin kotor?"* bisa berumur 30 hari.

---

### `ai_model_contexts` — Konteks Bisnis Terstruktur

Ini adalah "bahan bakar" utama yang membuat AI WarungKu bisa memberikan jawaban yang relevan dan spesifik, bukan jawaban generik. Tabel ini menyimpan ringkasan data bisnis per merchant yang diperbarui secara terjadwal oleh background worker, siap dikonsumsi tanpa perlu query ulang ke tabel-tabel besar saat AI membutuhkannya.

Kolom `context_type` berisi enum dengan empat jenis konteks yang berbeda. `business_profile` menyimpan profil warung: jenis usaha, lokasi, tahun berdiri, paket berlangganan, rata-rata omzet bulanan. `recent_trends` menyimpan tren 30 hari terakhir: produk naik penjualan, produk anjlok, pola pelanggan baru vs lama. `inventory_state` menyimpan kondisi stok saat ini: produk kritis, nilai total inventori, perputaran stok per kategori. `customer_behavior` menyimpan pola pelanggan: frekuensi kunjungan rata-rata, produk favorit per segmen, tren hutang pelanggan.

Kolom `context_data` berformat `jsonb` — dipilih bukan teks biasa karena AI perlu angka yang bisa dipakai untuk komputasi, bukan narasi. Saat merchant bertanya *"Prediksi omzet minggu depan"*, prompt yang dikirim ke Claude menyertakan `context_data` dari baris `recent_trends` dalam format terstruktur, bukan hasil prose dari `daily_summaries`. Ini membuat respons AI jauh lebih akurat dan terhindar dari halusinasi angka.

---

### `ai_insights` — Notifikasi Proaktif dari AI

Tidak semua interaksi dengan AI dimulai dari merchant. Tabel ini menyimpan insight yang di-generate AI secara proaktif tanpa merchant bertanya terlebih dahulu — fitur yang membedakan WarungKu dari sekadar chatbot pasif.

Kolom `type` berisi enum: `recommendation` (saran tindakan konkret), `alert` (peringatan kondisi mendesak), `forecast` (prediksi berbasis tren), `tip` (saran bisnis umum). Sebuah background worker berjalan setiap dini hari, membandingkan `ai_model_contexts` terbaru dengan threshold yang telah dikonfigurasi: jika stok tiga produk terlaris akan habis dalam dua hari berdasarkan tren penjualan, worker menghasilkan baris `alert` di tabel ini dan memicu push notification ke HP merchant. Kolom `data_snapshot` menyimpan angka-angka yang menjadi dasar insight sehingga merchant bisa menelusuri dari mana AI mendapatkan kesimpulan tersebut. Kolom `valid_until` memastikan insight kedaluwarsa secara otomatis — insight "stok akan habis Selasa" tidak relevan lagi jika dibuka hari Kamis.

---

### `ai_usage_quotas` — Kendali Kuota per Paket

Tabel ini adalah penjaga gerbang monetisasi AI. Setiap merchant punya satu baris aktif yang mencatat konsumsi API dalam periode berjalan (biasanya satu bulan kalender). Kolom `queries_limit` diisi berdasarkan `plan_type`: paket Gratis mendapat 0 (tidak bisa akses AI), Starter mendapat 150 query/bulan, Pro mendapat kuota tak terbatas dengan soft cap internal, Bisnis mendapat prioritas antrian (tidak diblokir saat beban tinggi).

Sebelum setiap permintaan AI diproses, sistem melakukan satu operasi `SELECT` ke tabel ini untuk memverifikasi `queries_used < queries_limit`. Jika kuota habis, request langsung ditolak dengan pesan ajakan upgrade — tanpa meneruskan permintaan ke Claude API sehingga tidak ada biaya terbuang. Kolom `tokens_used` dipantau oleh tim untuk menghitung Cost Per Active User sebenarnya guna memvalidasi apakah harga paket sudah mengcover biaya operasional AI.

---

### `ai_feedback` — Loop Umpan Balik Kualitas

Setelah setiap respons AI, merchant melihat dua tombol kecil: jempol naik dan jempol turun. Pilihan ini menghasilkan satu baris di `ai_feedback`. Kolom `rating` hanya berisi dua nilai: `helpful` atau `not_helpful`. Kolom `feedback_text` opsional untuk merchant yang mau menulis keluhan atau saran spesifik.

Data ini punya dua fungsi. Jangka pendek, tim produk memantau rasio `helpful` per `query_type` — jika respons tipe `forecast` hanya mendapat 40% rating positif sementara `recommendation` mendapat 85%, ada masalah di prompt engineering untuk prediksi yang perlu diperbaiki. Jangka panjang, data ini menjadi dataset fine-tuning untuk meningkatkan model yang lebih disesuaikan dengan konteks warung Indonesia.

---

### Alur Lengkap: Dari Query Merchant ke Respons AI

Untuk menggambarkan bagaimana ketujuh tabel bekerja bersama dalam satu permintaan, berikut urutan operasi saat merchant mengetik *"Kenapa penjualan saya turun minggu ini?"*:

```
1. Cek ai_usage_quotas — kuota masih ada? Lanjut.

2. Hitung cache_key dari query + merchant_segment.
   Cek ai_cache — ada cache valid? Kembalikan langsung,
   update hit_count. Selesai (hemat API call).

3. Cache miss → ambil konteks dari ai_model_contexts
   (recent_trends + inventory_state merchant ini).

4. Bangun prompt: [system context] + [context_data jsonb]
   + [riwayat ai_query_logs dalam session ini] + [query baru].

5. Kirim ke Claude API → terima respons.

6. INSERT ke ai_query_logs (query, respons, tokens, latency).

7. INSERT ke ai_cache dengan TTL sesuai query_type.

8. UPDATE ai_usage_quotas — tambah queries_used & tokens_used.

9. Tampilkan respons ke merchant + tombol feedback.

10. Jika merchant klik feedback → INSERT ke ai_feedback.
```

Seluruh langkah 1–9 harus selesai dalam waktu yang dirasakan merchant sebagai "cepat". Langkah 2 adalah yang paling krusial untuk performa: cache hit rate yang tinggi (target >40%) berarti sebagian besar pertanyaan umum tidak pernah menyentuh Claude API sama sekali — biaya turun drastis, respons terasa instan.