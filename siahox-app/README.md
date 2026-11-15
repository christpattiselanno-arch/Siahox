# SI AHOX — Sistem Anti Hoax Kota Ambon

Aplikasi web untuk memeriksa foto, link berita, dan chat WhatsApp. Hasilnya berupa label, skor indikasi hoaks (persen), rincian empat komponen, alasan, sumber, dan disclaimer. Kiriman tersimpan dan bisa ditinjau petugas Diskominfo.

Status: versi uji coba. Belum pernah dijalankan di server sungguhan; yang sudah diuji baru logikanya, dengan AI dan basis data tiruan.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `public/index.html` | Halaman warga |
| `public/petugas.html` | Ruang petugas: antrean aduan dan klarifikasi |
| `api/periksa.js` | Server: menerima kiriman, memanggil AI, menghitung skor, menyimpan |
| `api/klarifikasi.js` | Server: daftar klarifikasi yang terbit |
| `api/config.js` | Server: alamat dan kunci publik Supabase untuk ruang petugas |
| `lib/siahox.js` | Rumus skor, prompt, pemanggilan Gemini dan Claude |
| `supabase/schema.sql` | Tabel, aturan akses, dan penyimpanan foto |
| `.env.example` | Daftar pengaturan yang harus diisi di Vercel |

## Cara memasang

### 1. Supabase (data)

1. Buat proyek baru di supabase.com, pilih wilayah terdekat.
2. Buka SQL Editor, tempel seluruh isi `supabase/schema.sql`, jalankan.
3. Buka Authentication, **matikan pendaftaran publik** (sign up), lalu tambahkan akun petugas satu per satu. Setiap akun yang bisa masuk dianggap petugas.
4. Catat dari pengaturan API: alamat proyek, kunci publik, dan kunci rahasia.

### 2. GitHub (kode)

1. Buat repositori baru bernama `siahox` (privat).
2. Unggah seluruh isi folder ini ke repositori itu. Berkas `.env` tidak boleh ikut.

### 3. Vercel (hosting)

1. Masuk ke vercel.com dengan akun GitHub, pilih Add New > Project, lalu pilih repositori `siahox`.
2. Framework Preset: Other. Pengaturan lain biarkan.
3. Isi Environment Variables sesuai `.env.example`. Yang wajib:
   - `GEMINI_API_KEY` dan/atau `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Tekan Deploy. Halaman warga ada di alamat utama, ruang petugas di `/petugas.html`.

### 4. Uji pertama

1. Masuk ke `/petugas.html`, tambahkan satu klarifikasi.
2. Di halaman warga, kirim pesan yang isinya mirip kabar pada klarifikasi itu. Skor harus tinggi dan klarifikasinya muncul di bagian Sumber.
3. Kembali ke ruang petugas dan periksa bahwa aduannya tercatat.

Jika pemeriksaan gagal, isi `SIAHOX_DEBUG=1` untuk sementara agar pesan galat menampilkan rinciannya, lalu kembalikan ke `0`.

## Cara kerja skor

Setiap komponen dinilai AI 0–100 (seberapa kuat menunjukkan hoaks). Skor akhir adalah rata-rata berbobot dari komponen yang punya data.

| Komponen | Bobot |
|---|---|
| Kecocokan dengan klarifikasi resmi | 40% |
| Kewajaran klaim dan sumber pembanding | 20% |
| Keaslian foto (hanya kiriman foto) | 20% |
| Ciri khas hoaks | 20% |

- 61–100: Kemungkinan HOAKS (atau MENYESATKAN bila sebagian isinya benar)
- 40–60: BELUM DAPAT DIPASTIKAN
- 0–39: Kemungkinan BENAR

Kiriman berkategori bencana, keamanan, SARA, atau kesehatan, dan kiriman berskor 40–60, berstatus "perlu ditinjau" di ruang petugas. Bobot dan ambang ada di `lib/siahox.js` dan sebaiknya disepakati dengan Diskominfo.

## AI

- `AI_UTAMA` menentukan penyedia utama; yang lain menjadi cadangan bila yang utama gagal.
- Dengan Gemini, setiap pemeriksaan memakai dua panggilan: pencarian pembanding di web, lalu penilaian. Matikan pencarian dengan `GEMINI_PENCARIAN=0` untuk menghemat biaya.
- Cadangan Claude menilai tanpa pencarian web.
- Nama model bisa diganti lewat `GEMINI_MODEL` dan `CLAUDE_MODEL` tanpa mengubah kode.

## Privasi dan keamanan

- Kunci AI dan kunci rahasia Supabase hanya ada di server.
- Warga tidak mengakses basis data langsung. Semua lewat server.
- Nomor telepon dalam teks disamarkan sebelum dikirim ke AI dan disimpan.
- Foto dikecilkan dan diubah ke JPEG di perangkat warga, sehingga metadata lokasi terhapus. Foto disimpan di bucket privat dan hanya bisa dibuka petugas.
- Ada batas jumlah pemeriksaan per jam (`BATAS_PER_JAM`) untuk melindungi kuota AI.
- Server menolak membuka tautan ke alamat lokal atau jaringan dalam.

## Belum ada

- Dasbor pimpinan (statistik dan topik yang ramai).
- Pengambilan otomatis berita dari ambon.go.id.
- Halaman publik untuk melihat hasil yang sudah disahkan petugas.
- Pembatasan per pengguna (batas saat ini berlaku untuk seluruh layanan).
