# Jemput SIS — Sistem Pemanggilan Jemputan Realtime

## Latar Belakang

Proses penjemputan siswa saat ini: orang tua menyerahkan kartu jemput ke guru
piket, guru piket memanggil nama + kelas siswa lewat mic/speaker sekolah.
Panggilan yang keras dan berulang mengganggu kegiatan belajar mengajar di
kelas-kelas lain.

**Tujuan**: mengganti pemanggilan via speaker dengan website realtime yang
dipakai guru piket (memanggil) dan guru kelas (menerima panggilan), tanpa
suara yang terdengar ke seluruh sekolah.

**Skala**: sekolah menengah, 10–25 kelas. WiFi sekolah stabil dan bisa
diakses HP/tablet di semua titik.

## Alur Pengguna

1. Orang tua menyerahkan kartu (kartu polos, hanya berisi nama — tidak ada
   barcode/QR) ke guru piket.
2. Guru piket membuka `/piket` di HP/tablet, mencari nama siswa dari daftar,
   memilih, menekan "Panggil".
3. Panggilan langsung muncul realtime di tablet kelas terkait (`/kelas`),
   disertai bunyi notifikasi + getar untuk menarik perhatian guru kelas yang
   sedang mengajar.
4. Guru kelas melihat/mendengar panggilan, menyuruh siswa keluar kelas.
   Tidak ada konfirmasi balik ke guru piket (alur satu arah).
5. Kartu panggilan hilang otomatis dari layar kelas setelah durasi tertentu
   (mis. 60 detik), tanpa perlu ditekan/dihapus manual.

Tidak ada kebutuhan riwayat/log panggilan — sistem murni pengganti
speaker, bukan alat pencatatan/audit.

## Arsitektur

- **Frontend**: Next.js, dideploy ke Vercel (free tier).
- **Backend/DB**: Supabase (Postgres + Realtime), free tier.
- Guru piket insert baris ke tabel `calls` → Supabase Realtime mendorong
  perubahan ke semua client `/kelas` yang subscribe ke kelas terkait →
  kartu panggilan muncul di device kelas itu. Tidak perlu server
  WebSocket/queue custom.

### Mengapa pendekatan ini (bukan alternatif)

- **Custom Node.js + WebSocket server**: kontrol penuh tapi butuh hosting &
  maintenance server sendiri (VPS, restart saat crash) — beban operasional
  tidak sepadan untuk kebutuhan sederhana ini.
- **Polling sederhana** (cek server tiap beberapa detik tanpa realtime
  engine): paling mudah dibangun, tapi ada jeda beberapa detik sebelum
  notifikasi muncul — kurang cocok untuk "menggantikan speaker" yang perlu
  terasa instan.

## Data Model

**`students`**
| kolom | tipe | keterangan |
|---|---|---|
| id | uuid | primary key |
| name | text | nama siswa |
| class | text | mis. "1B" |

Dikelola lewat halaman admin (tambah/edit/hapus manual, tanpa import file
untuk versi awal).

**`calls`**
| kolom | tipe | keterangan |
|---|---|---|
| id | uuid | primary key |
| student_name | text | disalin saat panggilan dibuat |
| class | text | dipakai untuk filter subscribe realtime |
| created_at | timestamptz | dipakai untuk menentukan "antrian aktif" |

Tidak ada kolom status/konfirmasi (alur satu arah). Tidak ada tabel riwayat
terpisah — baris `calls` boleh menumpuk di database (volume kecil, ribuan
baris per tahun bukan masalah untuk Postgres), tapi query `/kelas` HANYA
mengambil baris dengan `created_at` dalam beberapa menit terakhir sehingga
tampil sebagai "antrian aktif".

## Komponen Halaman

### `/piket` — Guru Piket
- Kotak pencarian nama siswa dengan autocomplete dari tabel `students`.
- Tombol "Panggil" — insert baris ke `calls`, tampilkan konfirmasi singkat
  ("Berhasil memanggil Sasa — 1B").
- Tombol disabled sesaat setelah diklik untuk mencegah double-submit.
- Kalau insert gagal (mis. jaringan bermasalah): tampilkan pesan error,
  guru piket bisa coba lagi. Tidak ada state tersembunyi yang nyangkut.

### `/kelas` — Guru Kelas
- Saat pertama dibuka: pilih kelas dari dropdown daftar kelas. Pilihan
  disimpan di localStorage device tersebut sehingga tidak perlu dipilih
  ulang setiap hari (device ditaruh tetap di kelas yang sama).
- Setelah kelas dipilih: subscribe realtime ke baris `calls` dengan
  `class` yang cocok.
- Tampilan: layar antrian besar berisi kartu nama siswa yang dipanggil,
  terbaru di atas. Device diletakkan menyala terus di kelas.
- Saat kartu baru masuk: mainkan bunyi notifikasi + getar (`navigator.vibrate`
  bila didukung device).
- Kartu otomatis hilang dari tampilan setelah durasi tertentu (mis. 60
  detik) — murni logika client-side (filter waktu), tidak menghapus baris
  di database.
- Reconnect handling: jika koneksi sempat putus lalu kembali, client
  re-fetch antrian aktif (baris beberapa menit terakhir) sebelum
  resubscribe realtime, supaya panggilan yang terjadi saat terputus tidak
  hilang begitu saja.

### `/admin` — Kelola Data Siswa
- Dilindungi password sederhana (satu password bersama, disimpan sebagai
  environment variable, dicek lewat halaman login ringan — bukan sistem
  akun per-user).
- Form tambah siswa (nama + kelas).
- Daftar siswa existing dengan aksi edit/hapus.

## Testing

Sistem ini realtime lintas device, sehingga pengujian utamanya manual
end-to-end:
1. Buka `/piket` di satu device, `/kelas` (pilih kelas yang sama) di device
   lain — pastikan panggilan muncul realtime disertai bunyi + getar.
2. Pastikan kartu hilang otomatis dari `/kelas` setelah durasi yang
   ditentukan.
3. Uji skenario WiFi putus-sambung di device `/kelas` — pastikan panggilan
   yang terjadi saat terputus tetap muncul setelah reconnect.
4. Uji CRUD siswa di `/admin`, termasuk proteksi password.

## Di Luar Scope (Versi Awal)

- Import daftar siswa dari Excel/CSV (bisa ditambahkan nanti bila
  dibutuhkan).
- Riwayat/log panggilan untuk pelaporan atau audit.
- Konfirmasi "siswa sudah keluar" dari guru kelas ke guru piket.
- Barcode/QR pada kartu jemput.
- Mode offline / dukungan WiFi yang tidak stabil.
- Multi guru piket dengan role/akun terpisah.
