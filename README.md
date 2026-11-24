# Sistem Informasi Absensi Mahasiswa Berbasis QR Code

> 🔗 **Live Demo:** `https://<username-github>.github.io/<nama-repo>/` ← *ganti setelah deploy*
> 📦 **Repositori:** `https://github.com/<username-github>/<nama-repo>`

Aplikasi web untuk mengotomatiskan kehadiran kuliah: dosen membuka sesi dan menampilkan QR Code, mahasiswa memindai QR lewat ponsel lalu memasukkan NIM. Rekap kehadiran tampil langsung pada layar dosen.

## Fitur
- **Panel Dosen** – pilih mata kuliah, atur masa berlaku QR (menit), buka sesi & buat QR; menampilkan *Sesi Terakhir*.
- **Halaman Sesi** – QR Code dengan token acak per sesi, rekap kehadiran (Hadir / Terlambat / Belum absen), pembaruan otomatis tiap 10 detik, tombol *Tutup Sesi*.
- **Antarmuka Mahasiswa** (responsif, tanpa login) – form NIM, notifikasi berhasil, dan penolakan (NIM tidak terdaftar, absen ganda, sesi kedaluwarsa/ditutup).
- **Panel Admin** – kelola mata kuliah, data mahasiswa, dan riwayat sesi.
- Status **Terlambat** otomatis bila absen dilakukan > 15 menit setelah sesi dibuka.

## Akun Uji Coba

| Role | Username | Password | Halaman |
|---|---|---|---|
| Admin | `admin` | `admin123` | Panel Admin + Panel Dosen |
| Dosen | `dosen` | `dosen123` | Panel Dosen |
| Mahasiswa | *(tanpa login)* | NIM `2201001` – `2201005` | Dibuka lewat QR Code |

> Autentikasi bersifat demo (sisi klien) untuk keperluan tugas; tidak dimaksudkan untuk produksi.

## Teknologi
Vite · JavaScript (ES Modules) · [`qrcode`](https://www.npmjs.com/package/qrcode) · Firebase Firestore (opsional) · GitHub Actions + GitHub Pages

## Cara Kerja Penyimpanan Data
GitHub Pages hanya hosting statis (tanpa server), sehingga ada dua mode:
1. **Mode Demo Lokal** (default, tanpa konfigurasi) – data di `localStorage`. Cocok untuk mencoba di satu browser/perangkat.
2. **Mode Cloud (Firebase Firestore)** – wajib agar HP mahasiswa dan layar dosen berbagi data secara *real-time* saat live demo.

### Mengaktifkan Firebase
1. Buat proyek di [Firebase Console](https://console.firebase.google.com) → tambahkan **Web app** → salin konfigurasinya.
2. Buka **Build → Firestore Database → Create database**. Pada tab **Rules**, tempel (khusus demo/tugas):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if true; }
     }
   }
   ```
3. Lokal: salin `.env.example` → `.env` dan isi nilainya.
4. Deploy: GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, tambahkan `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.

## Instalasi Lokal
```bash
git clone https://github.com/<username-github>/<nama-repo>.git
cd <nama-repo>
npm install
cp .env.example .env     # opsional; kosongkan untuk mode demo lokal
npm run dev              # http://localhost:5173
npm run build            # hasil di folder dist/
```
Untuk menguji dari HP di jaringan yang sama: `npm run dev -- --host`.

## Deploy ke GitHub Pages
1. Buat repositori **Public**, lalu push seluruh kode ke branch `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` berjalan otomatis; URL live demo muncul di tab **Actions**/**Pages**. Tempel URL itu di bagian atas README ini.

## Struktur Proyek
```
├── .github/workflows/deploy.yml   # CI/CD GitHub Pages
├── src/
│   ├── main.js    # router & seluruh halaman
│   ├── store.js   # adapter data (localStorage / Firestore)
│   ├── seed.js    # akun uji & data awal
│   └── style.css
├── index.html · vite.config.js · package.json
├── .env.example   # template variabel lingkungan (.env di-ignore)
└── .gitignore
```

## Anggota Kelompok 8
Siti Erlin Nur Azizah (NIM) · Indri Chelsie Marysanda Politon (NIM) · Mesak Wil Suawah (NIM)  
<!-- Lengkapi NIM masing-masing anggota -->
