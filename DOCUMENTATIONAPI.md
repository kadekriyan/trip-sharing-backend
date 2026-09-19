# Dokumentasi Lengkap REST API — Trip Sharing Platform

> **Versi API**: `1.0.0`  
> **Base URL**: `http://localhost:3001/api` *(atau domain production backend)*  
> **Konvensi ID**: **Full UUID v4 (`String`)**  
> **Konvensi Casing**: **`camelCase`** pada seluruh payload request dan response JSON.  
> **Dokumen ini ditujukan sebagai referensi integrasi langsung untuk Frontend (Next.js / React / Mobile).**

---

## Daftar Isi

1. [Standar Format Request & Response](#1-standar-format-request--response)
2. [Autentikasi & Pengguna (`/api/auth`)](#2-autentikasi--pengguna-apiauth)
3. [Katalog Destinasi Wisata (`/api/destinations`)](#3-katalog-destinasi-wisata-apidestinations)
4. [Jadwal Trip & Ketersediaan Kursi (`/api/trips`)](#4-jadwal-trip--ketersediaan-kursi-apitrips)
5. [Pemesanan Tiket & Auto-Grouping (`/api/bookings`)](#5-pemesanan-tiket--auto-grouping-apibookings)
6. [Pembayaran & Midtrans Snap Gateway (`/api/payments`)](#6-pembayaran--midtrans-snap-gateway-apipayments)
7. [Layanan Unggah Berkas & Gambar (`/api/upload`)](#7-layanan-unggah-berkas--gambar-apiupload)
8. [Blog & Artikel Wisata (`/api/blogs`)](#8-blog--artikel-wisata-apiblogs)
9. [Wilayah Operasional / Area (`/api/areas`)](#9-wilayah-operasional--area-apiareas)
10. [Driver / Pengemudi (`/api/drivers`)](#10-driver--pengemudi-apidrivers)
11. [Armada / Kendaraan Fisik (`/api/vehicles` & `/api/armada`)](#11-armada--kendaraan-fisik-apivehicles--apiarmada)
12. [Partisipan Traveler (`/api/participants`)](#12-partisipan-traveler-apiparticipants)
13. [Dashboard & Manajemen Admin (`/api/admin`)](#13-dashboard--manajemen-admin-apiadmin)
14. [Pengaturan Sistem & Dynamic SEO (`/api/settings` & `/api/admin/settings`)](#14-pengaturan-sistem--dynamic-seo-apisettings--apiadminsettings)
15. [Panduan Integrasi Frontend (Next.js Client Example)](#15-panduan-integrasi-frontend-nextjs-client-example)

---

## 1. Standar Format Request & Response

### Header Wajib
```http
Content-Type: application/json
Accept: application/json
```
Untuk endpoint yang membutuhkan login:
```http
Authorization: Bearer <jwt_access_token>
```

### Struktur Standar Response Sukses
Semua endpoint mengembalikan struktur envelope konsisten:
```json
{
  "success": true,
  "message": "Pesan deskriptif keberhasilan",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 48,
    "totalPages": 5
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```
*(Catatan: Field `meta` bersifat opsional dan otomatis hadir pada endpoint dengan paginasi).*

### Struktur Standar Response Error
```json
{
  "success": false,
  "message": "Pesan deskriptif kegagalan",
  "details": { },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

### Daftar HTTP Status Code Umum
| Code | Status | Keterangan |
| :--- | :--- | :--- |
| `200` | OK | Request berhasil diproses |
| `201` | Created | Resource baru berhasil dibuat |
| `400` | Bad Request | Validasi input gagal / parameter tidak valid |
| `401` | Unauthorized | Token JWT hilang, kedaluwarsa, atau kredensial salah |
| `403` | Forbidden | Hak akses tidak mencukupi (bukan role yang berwenang) |
| `404` | Not Found | Resource tidak ditemukan |
| `409` | Conflict | Terjadi konflik (misal: kapasitas grup armada sudah penuh 6 pax) |
| `500` | Internal Server Error | Kesalahan pada server backend |

---

## 2. Autentikasi & Pengguna (`/api/auth`)

### 2.1 Registrasi Traveler Baru
Mendaftarkan akun traveler baru ke dalam sistem.

- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Auth**: Public (Tanpa token)

#### Request Body
```json
{
  "fullName": "Budi Traveler",
  "email": "budi@example.com",
  "password": "Password123!",
  "phoneNumber": "+6281234567890",
  "nationality": "Indonesia"
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "email": "budi@example.com",
      "role": "participant"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 2.2 Login Traveler / Admin
Autentikasi akun untuk memperoleh token akses JWT.

- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth**: Public

#### Request Body
```json
{
  "email": "budi@example.com",
  "password": "Password123!"
}
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "email": "budi@example.com",
      "role": "participant"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 2.3 Profil Pengguna yang Sedang Login (`Me`)
Mengambil data profil lengkap traveler atau admin aktif.

- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Auth**: `Bearer <token>`

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Authenticated user",
  "data": {
    "id": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
    "fullName": "Budi Traveler",
    "name": "Budi Traveler",
    "email": "budi@example.com",
    "phoneNumber": "+6281234567890",
    "nationality": "Indonesia",
    "role": "traveler",
    "createdAt": "2026-09-03T04:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 3. Katalog Destinasi Wisata (`/api/destinations`)

### 3.1 Daftar Katalog Destinasi (Filter & Paginasi)
Menampilkan daftar destinasi wisata aktif dengan filter dan pengurutan.

- **Method**: `GET`
- **Path**: `/api/destinations`
- **Auth**: Public

#### Query Parameters
| Parameter | Tipe | Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `search` | `string` | — | Pencarian teks pada judul, deskripsi, dan lokasi |
| `location` | `string` | — | Filter lokasi (contoh: `Jawa Timur`, `Bali`) |
| `duration` | `number` | — | Filter durasi hari (contoh: `2`) |
| `sortBy` | `string` | `popular` | Opsi: `popular`, `price_asc`, `price_desc`, `rating` |
| `page` | `number` | `1` | Nomor halaman |
| `limit` | `number` | `10` | Jumlah item per halaman |

#### Contoh Request
```http
GET /api/destinations?search=bromo&sortBy=price_asc&page=1&limit=6
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destinations retrieved",
  "data": [
    {
      "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
      "title": "Bromo Sunrise & Midnight Safari",
      "name": "Bromo Sunrise & Midnight Safari",
      "slug": "bromo-sunrise-midnight-safari",
      "tagline": "Jelajahi keajaiban kawah Bromo dan lautan pasir bersama grup seru.",
      "description": "Paket trip sharing midnight menuju Bromo dengan armada Toyota HiAce VIP.",
      "location": "Probolinggo, Jawa Timur",
      "durationDays": 2,
      "durationNights": 1,
      "pricePerPax": 850000,
      "priceTransportOnly": 550000,
      "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
      "galleryImages": [
        "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800",
        "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=800"
      ],
      "inclusions": ["Tiket Masuk Bromo", "Jeep 4x4", "Snack & Air Mineral", "Driver as Guide"],
      "exclusions": ["Sewa Kuda", "Pengeluaran Pribadi"],
      "highlights": ["Sunrise Penanjakan 1", "Kawah Bromo", "Pasir Berbisik", "Bukit Teletubbies"],
      "rating": 4.9,
      "totalReviews": 128,
      "isPopular": true,
      "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)",
      "maxGroupCapacity": 6,
      "itinerary": [
        { "day": 1, "title": "Penjemputan & Perjalanan", "activities": ["23:00 Kumpul di meeting point", "23:30 Berangkat menuju rest area Bromo"] },
        { "day": 2, "title": "Sunrise & Eksplorasi Bromo", "activities": ["03:30 Naik Jeep ke Sunrise Point", "06:00 Kawah Bromo", "12:00 Kembali ke Malang"] }
      ],
      "isActive": true,
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 6,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 3.2 Detail Destinasi (by Slug / ID)
Mengambil informasi lengkap destinasi beserta jadwal trip aktif dan status grup armada.

- **Method**: `GET`
- **Path**: `/api/destinations/:idOrSlug` *(atau `/api/destinations/slug/:slug`)*
- **Auth**: Public

#### Contoh Request
```http
GET /api/destinations/bromo-sunrise-midnight-safari
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destination retrieved",
  "data": {
    "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
    "title": "Bromo Sunrise & Midnight Safari",
    "slug": "bromo-sunrise-midnight-safari",
    "tagline": "Jelajahi keajaiban kawah Bromo dan lautan pasir bersama grup seru.",
    "description": "Paket trip sharing midnight menuju Bromo dengan armada Toyota HiAce VIP.",
    "location": "Probolinggo, Jawa Timur",
    "durationDays": 2,
    "durationNights": 1,
    "pricePerPax": 850000,
    "priceTransportOnly": 550000,
    "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
    "galleryImages": [
      "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800"
    ],
    "inclusions": ["Tiket Masuk Bromo", "Jeep 4x4", "Driver as Guide"],
    "exclusions": ["Sewa Kuda"],
    "highlights": ["Sunrise Penanjakan", "Kawah Bromo"],
    "rating": 4.9,
    "totalReviews": 128,
    "isPopular": true,
    "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)",
    "maxGroupCapacity": 6,
    "itinerary": [
      { "day": 1, "title": "Kumpul Meeting Point", "activities": ["23:00 Kumpul di Stasiun"] }
    ],
    "activeTrips": [
      {
        "id": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "departureDate": "2026-09-10T23:00:00.000Z",
        "returnDate": "2026-09-11T13:00:00.000Z",
        "pricePerPax": 850000,
        "status": "scheduled",
        "groups": [
          {
            "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
            "groupNumber": 1,
            "capacity": 6,
            "currentParticipants": 4,
            "status": "open",
            "driver": {
              "id": "d0912384-1234-4bc1-9022-771199aabb01",
              "fullName": "Pak Joko Santoso",
              "vehicleModel": "Toyota HiAce (6-Seater VIP)",
              "plateNumber": "N 1234 XY"
            }
          }
        ]
      }
    ]
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 4. Jadwal Trip & Ketersediaan Kursi (`/api/trips`)

### 4.1 Pantau Ketersediaan Kursi & Status Grup Armada
Digunakan untuk mengecek sisa kursi pada trip sebelum traveler melakukan pembayaran.

- **Method**: `GET`
- **Path**: `/api/trips/:id/availability`
- **Auth**: Public

#### Contoh Request
```http
GET /api/trips/3a09e112-9c44-48f1-9011-8a9d12340001/availability
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Trip availability retrieved",
  "data": {
    "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
    "departureDate": "2026-09-10T23:00:00.000Z",
    "groups": [
      {
        "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
        "groupNumber": 1,
        "capacity": 6,
        "currentParticipants": 4,
        "availableSlots": 2,
        "status": "open",
        "vehicleModel": "Toyota HiAce (6-Seater VIP)"
      }
    ]
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 5. Pemesanan Tiket & Auto-Grouping (`/api/bookings`)

### 5.1 Cari Booking Group Tersedia
Mencari grup yang masih membuka slot kursi pada destinasi dan tanggal tertentu.

- **Method**: `GET`
- **Path**: `/api/bookings/groups`
- **Auth**: Public

#### Query Parameters
| Parameter | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `destinationId` | `string (UUID)` | Ya | UUID Destinasi |
| `departureDate` | `string (ISO)` | Ya | Format: `YYYY-MM-DD` |

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Available groups retrieved",
  "data": [
    {
      "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "groupNumber": 1,
      "status": "open",
      "currentParticipants": 4,
      "maxParticipants": 6,
      "pricePerPerson": 850000
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 5.2 Buat Pemesanan Publik (Auto Assign Group & Booking Code)
Dapat dipanggil oleh traveler yang login maupun guest traveler (tanpa login).

- **Method**: `POST`
- **Path**: `/api/bookings`
- **Auth**: Opsional (`Bearer <token>` jika login)
- **Bot Protection**: Menyertakan `captchaToken` atau `g-recaptcha-response` (Google reCAPTCHA v2/v3 / fallback hCaptcha)

#### Parameter Body & Validasi Keamanan Input Traveler
| Parameter | Tipe | Wajib | Keterangan & Validasi Keamanan |
| :--- | :--- | :--- | :--- |
| `tripId` / `destinationId` | `string` | Ya (salah satu) | UUID Trip atau Destinasi (mendukung format id maupun slug) |
| `fullName` / `full_name` | `string` | Ya | Nama lengkap traveler (min: 2, max: 100 karakter, auto-trimmed) |
| `phoneNumber` / `phone_number` | `string` | Ya | Nomor telepon/WhatsApp aktif (7–20 karakter, regex format aman `/^[+0-9\s\-()]+$/`) |
| `email` | `string` | Opsional | Alamat email traveler (format email valid RFC, max: 255) |
| `dateOfBirth` / `date_of_birth` | `string (ISO)` | Opsional | Tanggal lahir format `YYYY-MM-DD` (tidak wajib diisi, `<= now`, `>= 1900-01-01`) |
| `gender` | `string` | Opsional | Jenis kelamin: `'male'`, `'female'`, atau `'other'` |
| `nationality` / `country` | `string` | Opsional | Kewarganegaraan / negara asal (max: 100 karakter) |
| `healthNotes` / `health_notes` | `string` | Opsional | Catatan kesehatan khusus atau riwayat alergi (max: 1000 karakter) |
| `preferredLanguage` | `string` | Opsional | Bahasa pengantar pilihan (contoh: `'id'`, `'en'`) |
| `pickupLocation` | `string` | Opsional | Titik penjemputan spesifik (max: 255 karakter) |
| `pickupLatitude` | `number` | Opsional | Koordinat latitude jemput (range: `-90` s.d `90`) |
| `pickupLongitude` | `number` | Opsional | Koordinat longitude jemput (range: `-180` s.d `180`) |
| `pickupNotes` | `string` | Opsional | Instruksi penjemputan (max: 1000 karakter) |
| `packageType` / `package_type` | `string` | Opsional | Tipe paket: `'ALL_IN'` (All-Inclusive) atau `'TRANSPORT_ONLY'` (Hanya Transportasi). Default: `'ALL_IN'`. |
| `captchaToken` | `string` | Opsional | Token bot verification reCAPTCHA / hCaptcha |

#### Request Body
```json
{
  "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
  "fullName": "Siti Rahmawati",
  "email": "siti.rahma@example.com",
  "phoneNumber": "+6281987654321",
  "dateOfBirth": "1998-07-20",
  "nationality": "Indonesia",
  "gender": "female",
  "packageType": "ALL_IN",
  "healthNotes": "Alergi seafood ringan",
  "pickupLocation": "Hotel Santika Premiere Malang, Jl. Letjen Sutoyo No.79",
  "pickupLatitude": -7.962145,
  "pickupLongitude": 112.634125,
  "pickupNotes": "Tunggu di lobi timur dekat drop-off point",
  "captchaToken": "03AFcWeA7..."
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Pemesanan berhasil dibuat. Silakan lanjutkan ke pembayaran.",
  "data": {
    "participant": {
      "id": "c19208a1-5512-48ea-9201-7fa112345678",
      "bookingCode": "TRV-8921",
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
      "groupNumber": 1,
      "fullName": "Siti Rahmawati",
      "email": "siti.rahma@example.com",
      "pickupLocation": "Hotel Santika Premiere Malang, Jl. Letjen Sutoyo No.79",
      "pickupLatitude": -7.962145,
      "pickupLongitude": 112.634125,
      "pickupNotes": "Tunggu di lobi timur dekat drop-off point",
      "totalAmount": 900000,
      "paymentStatus": "pending",
      "checkInStatus": "pending",
      "createdAt": "2026-09-03T04:00:00.000Z"
    },
    "groupOccupancy": {
      "currentParticipants": 5,
      "capacity": 6,
      "isFull": false
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 5.3 Pemesanan Rombongan / Bulk Multi-Booking & Agregasi Pembayaran
Memproses pemesanan lebih dari 1 peserta/trip dalam satu transaksi checkout (ACID Transaction), dengan 1 kali verifikasi Captcha dan 1 token pembayaran agregat Midtrans Snap.

- **Method**: `POST`
- **Path**: `/api/bookings/bulk` *(atau `/api/bookings/batch`)*
- **Auth**: Opsional (`Bearer <token>` jika login)
- **Bot Protection**: Menyertakan `captchaToken` atau `g-recaptcha-response` di root payload (1x per request).

#### Parameter Body
| Parameter | Tipe | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `captchaToken` | `string` | Opsional | Token reCAPTCHA / hCaptcha |
| `bookings` | `array<object>` | Ya | Array daftar data booking peserta (min: 1, max: 20 peserta) |
| `bookings[i].tripId` / `destinationId` | `string` | Ya | UUID Trip atau Destinasi (mendukung format id maupun slug) |
| `bookings[i].bookingGroupId` | `string` | Opsional | ID Grup tertentu yang ingin dituju (opsional) |
| `bookings[i].fullName` | `string` | Ya | Nama lengkap traveler (min: 2, max: 100 karakter) |
| `bookings[i].phoneNumber` | `string` | Ya | Nomor telepon/WhatsApp aktif (7–20 karakter) |
| `bookings[i].email` | `string` | Opsional | Email traveler (format valid RFC, max: 255) |
| `bookings[i].dateOfBirth` | `string (ISO)` | Opsional | Tanggal lahir `YYYY-MM-DD` (`<= now`, `>= 1900-01-01`) |
| `bookings[i].gender` | `string` | Opsional | `'male'`, `'female'`, atau `'other'` |
| `bookings[i].nationality` | `string` | Opsional | Kewarganegaraan / negara asal |
| `bookings[i].healthNotes` | `string` | Opsional | Catatan kesehatan khusus atau riwayat alergi |
| `bookings[i].pickupLocation` | `string` | Opsional | Titik/alamat penjemputan spesifik |
| `bookings[i].pickupLatitude` | `number` | Opsional | Latitude jemput (`-90` s.d `90`) |
| `bookings[i].pickupLongitude` | `number` | Opsional | Longitude jemput (`-180` s.d `180`) |
| `bookings[i].pickupNotes` | `string` | Opsional | Catatan khusus penjemputan |
| `bookings[i].packageType` / `package_type` | `string` | Opsional | Tipe paket: `'ALL_IN'` atau `'TRANSPORT_ONLY'`. Default: `'ALL_IN'`. |

#### Request Body
```json
{
  "captchaToken": "03AFcWeA7...",
  "bookings": [
    {
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "fullName": "Siti Rahmawati",
      "email": "siti.rahma@example.com",
      "phoneNumber": "+6281987654321",
      "dateOfBirth": "1998-07-20",
      "gender": "female",
      "nationality": "Indonesia",
      "packageType": "ALL_IN",
      "healthNotes": "Alergi makanan laut",
      "pickupLocation": "Hotel Santika Premiere Malang, Jl. Letjen Sutoyo No.79",
      "pickupLatitude": -7.962145,
      "pickupLongitude": 112.634125,
      "pickupNotes": "Lobi depan"
    },
    {
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "fullName": "Budi Santoso",
      "email": "budi.santoso@example.com",
      "phoneNumber": "+6281233445566",
      "dateOfBirth": "1995-03-15",
      "gender": "male",
      "nationality": "Indonesia",
      "packageType": "TRANSPORT_ONLY",
      "pickupLocation": "Stasiun Malang Kota Baru",
      "pickupNotes": "Pintu Timur"
    }
  ]
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Pemesanan berhasil dibuat untuk 2 peserta.",
  "data": {
    "bulkBookingId": "blk-9a812345-bcde-4123-8901-abcdef123456",
    "totalAmount": 1700000,
    "paymentStatus": "pending",
    "participants": [
      {
        "id": "c19208a1-5512-48ea-9201-7fa112345678",
        "bookingCode": "TRV-8921",
        "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
        "groupNumber": 1,
        "fullName": "Siti Rahmawati",
        "email": "siti.rahma@example.com",
        "price": 850000
      },
      {
        "id": "d29319b2-6623-49fb-8312-8ab223456789",
        "bookingCode": "TRV-8922",
        "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
        "groupNumber": 1,
        "fullName": "Budi Santoso",
        "email": "budi.santoso@example.com",
        "price": 850000
      }
    ],
    "payment": {
      "id": "pay-bulk-9a812345",
      "amount": 1700000,
      "snapToken": "d4a1b029-4412-4212-8811-abcdef012345",
      "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/d4a1b029-4412-4212-8811-abcdef012345",
      "orderId": "BULK-TRIP-1756872000000-8812"
    }
  },
  "timestamp": "2026-09-15T04:00:00.000Z"
}
```

#### Response Error Kuota Kursi Kurang (`409 Conflict`)
```json
{
  "success": false,
  "message": "Kapasitas kursi trip \"Bromo Midnight Safari\" tidak mencukupi untuk 4 peserta rombongan ini (Sisa kursi: 2).",
  "details": {},
  "timestamp": "2026-09-15T04:00:00.000Z"
}
```

---

### 5.4 Riwayat Pemesanan Saya (`My Bookings`)
Mengambil tiket dan e-voucher traveler.

- **Method**: `GET`
- **Path**: `/api/bookings/my-bookings`
- **Auth**: `Bearer <token>` ATAU Query Params (`email` & `bookingCode`)

#### Opsi 1: Dengan Login JWT
```http
GET /api/bookings/my-bookings
Authorization: Bearer <token>
```

#### Opsi 2: Guest Lookup (Tanpa Login)
```http
GET /api/bookings/my-bookings?email=siti.rahma@example.com&bookingCode=TRV-8921
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "User bookings retrieved",
  "data": [
    {
      "id": "c19208a1-5512-48ea-9201-7fa112345678",
      "bookingCode": "TRV-8921",
      "destination": {
        "title": "Bromo Sunrise & Midnight Safari",
        "slug": "bromo-sunrise-midnight-safari",
        "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
        "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)"
      },
      "trip": {
        "id": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "departureDate": "2026-09-10T23:00:00.000Z",
        "returnDate": "2026-09-11T13:00:00.000Z"
      },
      "group": {
        "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
        "groupNumber": 1,
        "capacity": 6,
        "currentParticipants": 5,
        "driver": {
          "fullName": "Pak Joko Santoso",
          "phoneNumber": "+6281233445566",
          "vehicleModel": "Toyota HiAce (6-Seater VIP)",
          "plateNumber": "N 1234 XY"
        }
      },
      "totalAmount": 900000,
      "paymentStatus": "paid",
      "checkInStatus": "pending",
      "voucherQrCode": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TRV-8921"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 5.5 Unduh / Tampilkan Faktur Resmi & Invoice Detail (`/api/bookings/:identifier/invoice`)
Mengambil data faktur/invoice resmi yang komprehensif untuk bukti transaksi, laporan keuangan traveler, e-invoice PDF generator, atau rekonsiliasi pembayaran. Mendukung query fleksibel menggunakan `bookingCode`, `participantId`, `paymentId`, maupun `midtransOrderId`.

- **Method**: `GET`
- **Path**: `/api/bookings/:identifier/invoice` *(alias: `/api/bookings/invoice/:identifier`)*
- **Auth**: Opsional (`Bearer <token>` untuk verifikasi kepemilikan akun, atau Public via kode booking yang valid)
- **URL Parameter**:
  - `:identifier`: Kode booking (contoh `TRV-8921`), UUID Partisipan, UUID Payment, atau Order ID Midtrans.

#### Contoh Request
```http
GET /api/bookings/TRV-8921/invoice
```
atau
```http
GET /api/bookings/c19208a1-5512-48ea-9201-7fa112345678/invoice
Authorization: Bearer <jwt_access_token>
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Invoice retrieved successfully",
  "data": {
    "invoice": {
      "invoiceNumber": "INV-20260903-TRV-8921",
      "invoiceDate": "2026-09-03T04:00:00.000Z",
      "dueDate": "2026-09-03T04:00:00.000Z",
      "paidAt": "2026-09-03T04:15:30.000Z",
      "status": "PAID",
      "paymentStatus": "paid",
      "checkInStatus": "pending",
      "bookingCode": "TRV-8921",
      "participantId": "c19208a1-5512-48ea-9201-7fa112345678",
      "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001"
    },
    "issuer": {
      "companyName": "Trip Sharing Platform Indonesia",
      "legalName": "PT Trip Sharing Nusantara",
      "tagline": "Teman Berbagi Perjalanan Wisata Indonesia",
      "website": "https://tripsharing.id",
      "supportEmail": "support@tripsharing.id",
      "supportPhone": "+62 812-3456-7890",
      "address": "Jl. Ijen No. 88, Oro-oro Dowo, Kec. Klojen, Kota Malang, Jawa Timur 65119"
    },
    "customer": {
      "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "fullName": "Siti Rahmawati",
      "email": "siti.rahma@example.com",
      "phoneNumber": "+6281987654321",
      "country": "Indonesia",
      "nationality": "Indonesia",
      "dateOfBirth": "1998-07-20",
      "gender": "female"
    },
    "tripDetails": {
      "destinationId": "7fa1bc82-0193-4a11-891d-724bc29a0001",
      "destinationName": "Bromo Sunrise & Midnight Safari",
      "destinationSlug": "bromo-sunrise-midnight-safari",
      "destinationCoverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
      "departureDate": "2026-09-10T23:00:00.000Z",
      "returnDate": "2026-09-11T13:00:00.000Z",
      "duration": "2 Hari 1 Malam",
      "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)",
      "pickupLocation": "Hotel Santika Premiere Malang, Jl. Letjen Sutoyo No.79",
      "pickupLatitude": -7.962145,
      "pickupLongitude": 112.634125,
      "pickupNotes": "Tunggu di lobi timur dekat drop-off point",
      "groupNumber": 1,
      "vehicleModel": "Toyota HiAce (6-Seater VIP)",
      "vehiclePlateNumber": "N 1234 XY",
      "driverName": "Pak Joko Santoso",
      "driverPhone": "+6281233445566"
    },
    "pricing": {
      "currency": "IDR",
      "items": [
        {
          "itemNumber": 1,
          "description": "Paket Trip Sharing - Bromo Sunrise & Midnight Safari (1 Pax)",
          "category": "Trip Package",
          "quantity": 1,
          "unitPrice": 850000,
          "amount": 850000
        }
      ],
      "basePrice": 850000,
      "adminFee": 0,
      "taxAmount": 0,
      "discountAmount": 0,
      "totalAmount": 850000
    },
    "paymentDetails": {
      "paymentId": "91a02b11-7782-4ef1-8901-bca123456789",
      "paymentMethod": "Midtrans Snap Gateway",
      "midtransOrderId": "TRIP-TRV-8921",
      "midtransTransactionId": "5e10034a-bc12-421e-9988-112233445566",
      "paymentStatus": "paid",
      "transactionTime": "2026-09-03T04:05:00.000Z",
      "completionTime": "2026-09-03T04:15:30.000Z",
      "paymentProofUrl": null
    },
    "verification": {
      "voucherQrCode": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TRV-8921",
      "invoiceUrl": "http://localhost:3001/api/bookings/TRV-8921/invoice"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 5.6 Aturan Pemisahan Armada Otomatis Berdasarkan Geopolitik / Kewarganegaraan (Nationality Segregation Logic)

Untuk menjaga keamanan, keharmonisan, dan kenyamanan peserta selama perjalanan wisata bersama (trip sharing), sistem mengimplementasikan **Auto-Segregation Algorithm** yang memisahkan unit armada fisik (Mobil #1, Mobil #2, dst.) bagi traveler dari negara-negara yang memiliki sensitivitas/konflik geopolitik historis.

#### 1. Matriks 9 Aturan Konflik Kewarganegaraan (Simetris / Dwiarah)
| No | Pasangan Negara A | Pasangan Negara B | Keterangan & Sensitivitas |
| :---: | :--- | :--- | :--- |
| 1 | **Armenia** (`AM`) | **Azerbaijan** (`AZ`) | Konflik wilayah Kaukasus |
| 2 | **India** (`IN`) | **Pakistan** (`PK`) | Sensitivitas perbatasan Asia Selatan |
| 3 | **Serbia** (`RS`) | **Kosovo** (`XK`) / **Bosnia and Herzegovina** (`BA`) | Sensitivitas wilayah Balkan |
| 4 | **Morocco / Maroko** (`MA`) | **Algeria / Aljazair** (`DZ`) | Sensitivitas geopolitik Afrika Utara |
| 5 | **Turkey / Turki** (`TR`) | **Greece / Yunani** (`GR`) / **Cyprus / Siprus** (`CY`) | Sensitivitas Mediterania Timur |
| 6 | **United Kingdom / Inggris** (`GB`) | **Argentina** (`AR`) | Sensitivitas kedaulatan Kepulauan Falkland |
| 7 | **Russia / Rusia** (`RU`) | **Ukraine / Ukraina** (`UA`) | Konflik aktif Eropa Timur |
| 8 | **China / Tiongkok** (`CN`) | **Taiwan** (`TW`) / **Hong Kong** (`HK`) | Sensitivitas politik & kedaulatan |
| 9 | **China / Tiongkok** (`CN`) | **Japan / Jepang** (`JP`) / **South Korea / Korsel** (`KR`) | Sensitivitas regional Asia Timur |

#### 2. Algoritma Alokasi Armada pada Backend (`POST /api/bookings` & `/bulk`)
1. **Normalisasi Kewarganegaraan**: Bersihkan input string `nationality` dan petakan ke nama kanonikal ISO/Inggris resmi (misal: `"PK"` / `"pakistan"` $\to$ `"Pakistan"`, `"Inggris"` / `"UK"` $\to$ `"United Kingdom"`, `"Korsel"` $\to$ `"South Korea"`).
2. **Evaluasi Grup Armada Terbuka (`groups`)**:
   - Ambil daftar seluruh grup armada yang berstatus `open` pada trip tersebut.
   - Filter grup yang masih memiliki sisa kapasitas cukup (`capacity - currentParticipants >= requestedSeats`).
   - Periksa apakah di dalam grup tersebut terdapat peserta dari negara yang berkonflik dengan traveler pendaftar baru (`findConflictingCountriesInGroup`).
3. **Penetapan Grup**:
   - **Grup Kompatibel Ditemukan**: Masukkan traveler ke grup tersebut.
   - **Tidak Ada Grup Kompatibel** (semua grup penuh atau memiliki penumpang berkonflik):
     - Sistem secara otomatis membuka/membuat grup armada baru (misal: Mobil #2 / Mobil #3) untuk traveler tersebut.
     - Kapasitas armada baru tersebut tetap dapat diisi oleh traveler dari negara-negara netral lainnya (seperti Indonesia, Malaysia, Jerman, dll.).
4. **Wewenang Administrator**:
   - Pada panel admin (`/api/admin/participants/move-group`), admin tetap memiliki wewenang penuh untuk memindahkan peserta antar-armada (*manual override*), dengan sistem menyajikan peringatan dini (*warning badge*).

---

## 6. Pembayaran & Midtrans Snap Gateway (`/api/payments`)

### 6.1 Generate Midtrans Snap Token
Membuat sesi transaksi Snap untuk membuka popup pembayaran di frontend.

- **Method**: `POST`
- **Path**: `/api/payments/:participantId/snap-token` *(atau `/api/payments/participants/:participantId/transaction`)*
- **Auth**: Opsional

#### Contoh Request
```http
POST /api/payments/c19208a1-5512-48ea-9201-7fa112345678/snap-token
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Payment transaction created",
  "data": {
    "paymentId": "91a02b11-7782-4ef1-8901-bca123456789",
    "snapToken": "d4a1b029-4412-4212-8811-abcdef012345",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/d4a1b029-4412-4212-8811-abcdef012345",
    "orderId": "TRIP-c19208a1-5512-48ea-9201-7fa112345678-1756872000000",
    "amount": 900000,
    "currency": "IDR"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 6.2 Midtrans Webhook Notification
Endpoint penerima notifikasi otomatis dari Midtrans (dilindungi verifikasi SHA-512 signature).

- **Method**: `POST`
- **Path**: `/api/payments/webhook`
- **Auth**: Public (Midtrans IPN)

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Status pembayaran berhasil diperbarui.",
  "data": {
    "status": "ok"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 6.3 Simulasi Pembayaran Sandbox / Development
Endpoint simulasi untuk mengubah status pembayaran dan peserta secara langsung tanpa melewati payment gateway Midtrans Sandbox (sangat berguna untuk testing alur e2e, demo, dan local development).

- **Method**: `POST`
- **Path**: `/api/payments/:id/simulate` *(atau `/api/payments/participants/:participantId/simulate`)*
- **Auth**: Opsional
- **URL Parameter**:
  - `:id`: ID pembayaran (`payment.id`), ID peserta (`participant.id`), atau `orderId` (`TRIP-...`).

#### Request Body
```json
{
  "action": "settle"
}
```
*Opsi value `action`:*
- `"settle"` / `"settlement"` / `"capture"` / `"success"`: Mengubah payment jadi `completed` dan status peserta jadi `paid` (serta mengirim email konfirmasi pembayaran).
- `"expire"` / `"expired"`: Mengubah payment jadi `failed` dan status peserta jadi `cancelled`.
- `"cancel"` / `"cancelled"`: Mengubah payment jadi `failed` dan status peserta jadi `cancelled`.
- `"deny"` / `"denied"` / `"failure"`: Mengubah payment jadi `failed` dan status peserta jadi `cancelled`.
- *(Default jika body kosong `{}` adalah `"settle"`)*.

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Simulasi pembayaran berhasil diproses: completed",
  "data": {
    "id": "91a02b11-7782-4ef1-8901-bca123456789",
    "participant_id": "c19208a1-5512-48ea-9201-7fa112345678",
    "booking_group_id": "88112233-4455-6677-8899-aabbccddeeff",
    "amount": "900000",
    "status": "completed",
    "midtrans_order_id": "TRIP-c19208a1-5512-48ea-9201-7fa112345678-1756872000000",
    "completion_time": "2026-09-07T06:50:00.000Z",
    "created_at": "2026-09-07T06:45:00.000Z",
    "updated_at": "2026-09-07T06:50:00.000Z"
  },
  "timestamp": "2026-09-07T06:50:00.000Z"
}
```

---

## 7. Layanan Unggah Berkas & Gambar (`/api/upload`)

Layanan multipart file upload terintegrasi untuk menyimpan gambar aset destinasi wisata, foto galeri, dan artikel CMS. Berkas yang diunggah disimpan di server dan disajikan secara statis via URL `/uploads/...`.

> **Catatan Khusus:** Profil Driver & Armada **tidak memerlukan** upload berkas gambar profil.

---

### 7.1 Unggah Berkas Gambar Tunggal (Single Upload)
Digunakan untuk mengunggah 1 gambar cover destinasi, thumbnail artikel, atau aset lainnya.

- **Method**: `POST`
- **Path**: `/api/upload` *(atau `/api/upload/image`, `/api/upload/file`, `/api/admin/upload`)*
- **Auth**: Opsional / Admin
- **Content-Type**: `multipart/form-data`
- **Query Params**:
  - `folder` *(opsional, string)*: Subdirektori penyimpanan (`destinations`, `articles`, atau `general` - default: `general`).

#### Form Data Fields
- `image` atau `file` *(File)*: Berkas gambar (format JPG, PNG, WEBP, GIF; maksimal 10 MB).

#### Contoh cURL / FormData Request
```bash
curl -X POST "http://localhost:3001/api/upload?folder=destinations" \
  -F "image=@/path/to/kawah-ijen.webp"
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Berkas gambar berhasil diunggah",
  "data": {
    "url": "http://localhost:3001/uploads/destinations/kawah-ijen-1756872000000-123456.webp",
    "path": "/uploads/destinations/kawah-ijen-1756872000000-123456.webp",
    "filename": "kawah-ijen-1756872000000-123456.webp",
    "originalName": "kawah-ijen.webp",
    "mimetype": "image/webp",
    "size": 245120
  },
  "timestamp": "2026-09-07T08:30:00.000Z"
}
```

---

### 7.2 Unggah Berkas Gambar Majemuk (Multiple Upload)
Digunakan untuk mengunggah banyak foto galeri destinasi atau dokumentasi sekaligus (maksimal 10 berkas per request).

- **Method**: `POST`
- **Path**: `/api/upload/multiple` *(atau `/api/upload/files`)*
- **Auth**: Opsional / Admin
- **Content-Type**: `multipart/form-data`
- **Query Params**:
  - `folder` *(opsional, string)*: Subdirektori penyimpanan (contoh: `destinations`).

#### Form Data Fields
- `images` atau `files` *(File[])*: Array berkas gambar.

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "2 berkas gambar berhasil diunggah",
  "data": [
    {
      "url": "http://localhost:3001/uploads/destinations/gallery-1-1756872000000-111111.webp",
      "path": "/uploads/destinations/gallery-1-1756872000000-111111.webp",
      "filename": "gallery-1-1756872000000-111111.webp",
      "originalName": "gallery-1.webp",
      "mimetype": "image/webp",
      "size": 182300
    },
    {
      "url": "http://localhost:3001/uploads/destinations/gallery-2-1756872000000-222222.webp",
      "path": "/uploads/destinations/gallery-2-1756872000000-222222.webp",
      "filename": "gallery-2-1756872000000-222222.webp",
      "originalName": "gallery-2.webp",
      "mimetype": "image/webp",
      "size": 194100
    }
  ],
  "timestamp": "2026-09-07T08:30:00.000Z"
}
```

---

## 8. Blog & Artikel Wisata (`/api/blogs`)

### 8.1 Daftar Artikel Blog Terbit
Menampilkan artikel blog/tips wisata dengan filter kategori, pencarian, dan paginasi.

- **Method**: `GET`
- **Path**: `/api/blogs` *(atau `/api/articles`)*
- **Auth**: Public

#### Query Parameters
| Parameter | Tipe | Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `category` | `string` | — | Filter kategori (contoh: `Travel Tips`, `Destinasi`) |
| `search` | `string` | — | Pencarian judul atau cuplikan artikel |
| `page` | `number` | `1` | Nomor halaman |
| `limit` | `number` | `6` | Jumlah artikel per halaman |

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Articles retrieved",
  "data": [
    {
      "id": "5128ca01-8891-4da2-b101-771122334455",
      "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru",
      "slug": "5-alasan-mengapa-trip-sharing-lebih-hemat-seru",
      "excerpt": "Temukan bagaimana konsep berbagi armada 6-seater dapat menghemat biaya perjalanan Anda hingga 60%.",
      "content": "Isi lengkap artikel...",
      "coverImage": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
      "category": "Travel Tips",
      "author": {
        "name": "Admin Editorial",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "Lead Travel Writer"
      },
      "readTimeMinutes": 4,
      "tags": ["Tips", "Hemat", "Trip Sharing"],
      "publishedAt": "2026-08-30T10:00:00.000Z",
      "views": 1420,
      "isPublished": true,
      "createdAt": "2026-08-30T09:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 6,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 7.2 Detail Artikel Blog (by Slug)
Mengambil isi lengkap artikel dan otomatis menambah jumlah pembaca (`viewCount`).

- **Method**: `GET`
- **Path**: `/api/blogs/:slug`
- **Auth**: Public

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Article retrieved",
  "data": {
    "id": "5128ca01-8891-4da2-b101-771122334455",
    "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru",
    "slug": "5-alasan-mengapa-trip-sharing-lebih-hemat-seru",
    "content": "Isi artikel lengkap format markdown atau HTML...",
    "category": "Travel Tips",
    "author": {
      "name": "Admin Editorial",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      "role": "Lead Travel Writer"
    },
    "readTimeMinutes": 4,
    "views": 1421,
    "publishedAt": "2026-08-30T10:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 9. Wilayah Operasional / Area (`/api/areas`)

Modul Area digunakan untuk mengelompokkan Driver dan Armada berdasarkan wilayah operasional (seperti *Malang*, *Banyuwangi*, *Surabaya*, *Bali*, *Jogja*). Driver dan Armada dapat dikaitkan dengan Area, dan endpoint Driver serta Armada dapat difilter berdasarkan Area.

### 9.1 Daftar Seluruh Area (`GET /api/areas`)
Menampilkan daftar seluruh wilayah operasional aktif maupun non-aktif beserta ringkasan jumlah driver (`driversCount`) dan armada (`vehiclesCount`) yang terhubung.

- **Method**: `GET`
- **Path**: `/api/areas`
- **Auth**: Public (Tanpa token)
- **Query Params**:
  - `isActive` / `is_active` *(opsional, boolean)*: `true` / `false`.
  - `city` *(opsional, string)*: Filter nama kota (contoh: `"Malang"`).
  - `province` *(opsional, string)*: Filter nama provinsi (contoh: `"Jawa Timur"`).
  - `search` *(opsional, string)*: Pencarian nama area, slug, kota, atau provinsi.

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Daftar area berhasil diambil",
  "data": [
    {
      "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
      "name": "Malang Raya",
      "slug": "malang-raya",
      "city": "Malang",
      "province": "Jawa Timur",
      "description": "Wilayah operasional Kota Malang, Kabupaten Malang, dan Kota Batu.",
      "isActive": true,
      "is_active": true,
      "driversCount": 8,
      "vehiclesCount": 6,
      "createdAt": "2026-09-15T08:00:00.000Z",
      "updatedAt": "2026-09-15T08:00:00.000Z"
    },
    {
      "id": "a1b2c3d4-0002-48ea-9201-7fa112340002",
      "name": "Banyuwangi",
      "slug": "banyuwangi",
      "city": "Banyuwangi",
      "province": "Jawa Timur",
      "description": "Wilayah operasional Banyuwangi, Ijen, dan Baluran.",
      "isActive": true,
      "is_active": true,
      "driversCount": 4,
      "vehiclesCount": 3,
      "createdAt": "2026-09-15T08:00:00.000Z",
      "updatedAt": "2026-09-15T08:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-15T08:00:00.000Z"
}
```

---

### 9.2 Detail Area (`GET /api/areas/:id`)
Mengambil detail wilayah operasional berdasarkan UUID atau Slug.

- **Method**: `GET`
- **Path**: `/api/areas/:id` *(contoh: `/api/areas/malang-raya` atau `/api/areas/a1b2c3d4-0001-48ea-9201-7fa112340001`)*
- **Auth**: Public

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Detail area berhasil diambil",
  "data": {
    "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
    "name": "Malang Raya",
    "slug": "malang-raya",
    "city": "Malang",
    "province": "Jawa Timur",
    "description": "Wilayah operasional Kota Malang, Kabupaten Malang, dan Kota Batu.",
    "isActive": true,
    "is_active": true,
    "driversCount": 8,
    "vehiclesCount": 6,
    "createdAt": "2026-09-15T08:00:00.000Z",
    "updatedAt": "2026-09-15T08:00:00.000Z"
  },
  "timestamp": "2026-09-15T08:00:00.000Z"
}
```

---

### 9.3 Tambah Area Baru (`POST /api/areas`)
- **Method**: `POST`
- **Path**: `/api/areas` *(atau `/api/admin/areas`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Request Body
```json
{
  "name": "Bali Selatan",
  "slug": "bali-selatan",
  "city": "Denpasar",
  "province": "Bali",
  "description": "Area operasional Denpasar, Kuta, Jimbaran, dan Nusa Dua.",
  "isActive": true
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Area berhasil ditambahkan",
  "data": {
    "id": "a1b2c3d4-0003-48ea-9201-7fa112340003",
    "name": "Bali Selatan",
    "slug": "bali-selatan",
    "city": "Denpasar",
    "province": "Bali",
    "description": "Area operasional Denpasar, Kuta, Jimbaran, dan Nusa Dua.",
    "isActive": true,
    "is_active": true,
    "driversCount": 0,
    "vehiclesCount": 0,
    "createdAt": "2026-09-15T08:30:00.000Z",
    "updatedAt": "2026-09-15T08:30:00.000Z"
  },
  "timestamp": "2026-09-15T08:30:00.000Z"
}
```

---

### 9.4 Edit Area (`PATCH` atau `PUT /api/areas/:id`)
- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/areas/:id` *(atau `/api/admin/areas/:id`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Request Body
```json
{
  "name": "Bali Raya & Nusa Penida",
  "city": "Denpasar",
  "isActive": true
}
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Area berhasil diperbarui",
  "data": {
    "id": "a1b2c3d4-0003-48ea-9201-7fa112340003",
    "name": "Bali Raya & Nusa Penida",
    "slug": "bali-raya-nusa-penida",
    "city": "Denpasar",
    "province": "Bali",
    "isActive": true,
    "is_active": true,
    "updatedAt": "2026-09-15T08:45:00.000Z"
  },
  "timestamp": "2026-09-15T08:45:00.000Z"
}
```

---

### 9.5 Hapus Area (`DELETE /api/areas/:id`)
- **Method**: `DELETE`
- **Path**: `/api/areas/:id` *(atau `/api/admin/areas/:id`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Area berhasil dihapus",
  "data": {
    "id": "a1b2c3d4-0003-48ea-9201-7fa112340003",
    "deleted": true
  },
  "timestamp": "2026-09-15T08:50:00.000Z"
}
```

---

## 10. Driver / Pengemudi (`/api/drivers`)

### 10.1 Daftar Driver Tersedia
Menampilkan daftar personil pengemudi aktif yang siap bertugas mengantar perjalanan trip sharing. Dapat difilter berdasarkan wilayah operasional (`areaId` atau `area`).

- **Method**: `GET`
- **Path**: `/api/drivers`
- **Auth**: Public
- **Query Params**:
  - `is_available` / `isAvailable` *(opsional, boolean)*: `true` / `false`.
  - `status` *(opsional, string)*: Filter status driver (`active`, `on_duty`, `off_duty`, `inactive`).
  - `areaId` / `area_id` *(opsional, string)*: Filter berdasarkan ID area operasional.
  - `area` *(opsional, string)*: Filter berdasarkan nama atau slug area (contoh: `?area=malang-raya` atau `?area=Malang`).
  - `search` *(opsional, string)*: Pencarian nama driver, nomor HP, SIM, plat armada, atau nama area.

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Drivers retrieved",
  "data": [
    {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "fullName": "Pak Joko Santoso",
      "name": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566",
      "phone": "+6281233445566",
      "email": "joko@driver.local",
      "licenseNumber": "SIM-A-99218201",
      "licenseExpiryDate": "2029-08-30T00:00:00.000Z",
      "rating": 5.0,
      "isAvailable": true,
      "status": "active",
      "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
      "area": {
        "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
        "name": "Malang Raya",
        "slug": "malang-raya",
        "city": "Malang",
        "province": "Jawa Timur"
      },
      "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
      "vehicle": {
        "id": "veh-7711-4bc1-9022-882299aabb01",
        "name": "Toyota HiAce Premio Luxury",
        "plateNumber": "N 1234 XY",
        "vehicleType": "Minivan",
        "capacity": 6,
        "status": "active",
        "isAvailable": true
      },
      "vehicleModel": "Toyota HiAce Premio Luxury",
      "plateNumber": "N 1234 XY",
      "user": {
        "id": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
        "name": "Pak Joko Santoso",
        "phone": "+6281233445566",
        "email": "joko@driver.local",
        "profileImageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      },
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 11. Armada / Kendaraan Fisik (`/api/vehicles` & `/api/armada`)

### 11.1 Daftar Seluruh Armada Tersedia
Menampilkan katalog kendaraan fisik (armada) yang terdaftar dalam sistem beserta status ketersediaan, driver yang terpasang (*assigned*), dan wilayah operasional (`area`).

- **Method**: `GET`
- **Path**: `/api/vehicles` *(atau `/api/armada`)*
- **Auth**: Public
- **Query Params**:
  - `status` *(opsional)*: Filter status (`active`, `maintenance`, `inactive`).
  - `isAvailable` / `is_available` *(opsional, boolean)*: `true` / `false`.
  - `vehicleType` / `vehicle_type` *(opsional)*: Tipe armada (misal: `Minivan`, `SUV`, `Bus`).
  - `areaId` / `area_id` *(opsional, string)*: Filter berdasarkan ID area operasional.
  - `area` *(opsional, string)*: Filter berdasarkan nama atau slug area (contoh: `?area=malang-raya` atau `?area=Malang`).
  - `search` *(opsional)*: Pencarian nama armada, nomor plat, atau nama area.

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicles retrieved successfully",
  "data": [
    {
      "id": "veh-7711-4bc1-9022-882299aabb01",
      "name": "Toyota HiAce Premio Luxury",
      "plateNumber": "N 1234 XY",
      "plate_number": "N 1234 XY",
      "vehicleType": "Minivan",
      "vehicle_type": "Minivan",
      "capacity": 6,
      "transmission": "Manual",
      "fuelType": "Diesel",
      "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "Luggage Space"],
      "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
      "status": "active",
      "isAvailable": true,
      "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
      "area": {
        "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
        "name": "Malang Raya",
        "slug": "malang-raya",
        "city": "Malang",
        "province": "Jawa Timur"
      },
      "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
      "driver": {
        "id": "d0912384-1234-4bc1-9022-771199aabb01",
        "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
        "fullName": "Pak Joko Santoso",
        "phoneNumber": "+6281233445566",
        "email": "joko@driver.local",
        "licenseNumber": "SIM-A-99218201",
        "rating": 5.0,
        "isAvailable": true,
        "status": "active",
        "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      },
      "createdAt": "2026-09-01T08:00:00.000Z",
      "updatedAt": "2026-09-01T08:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 11.2 Detail Armada Kendaraan
- **Method**: `GET`
- **Path**: `/api/vehicles/:id` *(atau `/api/armada/:id`)*
- **Auth**: Public

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicle retrieved successfully",
  "data": {
    "id": "veh-7711-4bc1-9022-882299aabb01",
    "name": "Toyota HiAce Premio Luxury",
    "plateNumber": "N 1234 XY",
    "vehicleType": "Minivan",
    "capacity": 6,
    "transmission": "Manual",
    "fuelType": "Diesel",
    "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "Luggage Space"],
    "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    "status": "active",
    "isAvailable": true,
    "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
    "area": {
      "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
      "name": "Malang Raya",
      "slug": "malang-raya",
      "city": "Malang",
      "province": "Jawa Timur"
    },
    "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
    "driver": {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "fullName": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566",
      "licenseNumber": "SIM-A-99218201",
      "rating": 5.0
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 11.3 Tambah Armada Baru (`POST /api/vehicles` atau `POST /api/armada`)
Mendaftarkan armada baru ke dalam sistem, termasuk penentuan jumlah kursi/seat (`capacity`) dan wilayah operasional (`areaId`).

- **Method**: `POST`
- **Path**: `/api/vehicles` *(atau `/api/armada`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Parameter Body
| Parameter | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Ya | Nama kendaraan/armada (contoh: `"Toyota HiAce Premio Luxury"`) |
| `plateNumber` / `plate_number` | `string` | Ya | Nomor plat polisi unik (contoh: `"N 1234 XY"`) |
| `capacity` | `number (integer)` | Opsional | **Jumlah kursi / seat armada** (range: `1`–`60`, default: `6`) |
| `vehicleType` / `vehicle_type` | `string` | Opsional | Tipe kendaraan (contoh: `"Minivan"`, `"SUV"`, `"Bus"`, default: `"Minivan"`) |
| `transmission` | `string` | Opsional | Transmisi (contoh: `"Manual"`, `"Automatic"`) |
| `fuelType` / `fuel_type` | `string` | Opsional | Jenis bahan bakar (contoh: `"Diesel"`, `"Bensin"`) |
| `facility` | `array<string>` | Opsional | Daftar fasilitas (contoh: `["AC", "Audio/Radio", "Reclining Seat"]`) |
| `coverImage` / `cover_image` | `string (URL)` | Opsional | URL foto armada |
| `status` | `string` | Opsional | Status (`"active"`, `"maintenance"`, `"inactive"`) |
| `isAvailable` / `is_available` | `boolean` | Opsional | Status ketersediaan (`true`/`false`) |
| `areaId` / `area_id` | `string (UUID)` | Opsional | ID Wilayah Operasional (Area) |
| `driverId` / `driver_id` | `string (UUID)` | Opsional | ID Driver yang langsung dipasangkan (opsional) |

#### Request Body
```json
{
  "name": "Isuzu Elf Long Giga",
  "plateNumber": "DK 7890 AB",
  "capacity": 14,
  "vehicleType": "Minibus",
  "transmission": "Manual",
  "fuelType": "Diesel",
  "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "Karaoke Mic"],
  "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
  "status": "active",
  "isAvailable": true,
  "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001"
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": "veh-8822-4bc1-9022-771199aabb02",
    "name": "Isuzu Elf Long Giga",
    "plateNumber": "DK 7890 AB",
    "capacity": 14,
    "vehicleType": "Minibus",
    "transmission": "Manual",
    "fuelType": "Diesel",
    "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "Karaoke Mic"],
    "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    "status": "active",
    "isAvailable": true,
    "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
    "area": {
      "id": "a1b2c3d4-0001-48ea-9201-7fa112340001",
      "name": "Malang Raya",
      "slug": "malang-raya"
    },
    "driverId": null,
    "driver": null,
    "createdAt": "2026-09-14T08:00:00.000Z",
    "updatedAt": "2026-09-14T08:00:00.000Z"
  },
  "timestamp": "2026-09-14T08:00:00.000Z"
}
```

---

### 11.4 Edit Armada & Ubah Jumlah Kursi (`PATCH` atau `PUT /api/vehicles/:id`)
Mengubah data armada, termasuk memperbarui kapasitas seat (`capacity`), area operasional (`areaId`), fasilitas, tipe, nama, plat nomor, atau status armada.

- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/vehicles/:id` *(atau `/api/armada/:id`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Request Body (Contoh Ubah Kapasitas Seat Menjadi 12)
```json
{
  "capacity": 12,
  "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "WiFi"],
  "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
  "status": "active"
}
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "id": "veh-8822-4bc1-9022-771199aabb02",
    "name": "Isuzu Elf Long Giga",
    "plateNumber": "DK 7890 AB",
    "capacity": 12,
    "vehicleType": "Minibus",
    "status": "active",
    "isAvailable": true,
    "areaId": "a1b2c3d4-0001-48ea-9201-7fa112340001",
    "updatedAt": "2026-09-14T08:15:00.000Z"
  },
  "timestamp": "2026-09-14T08:15:00.000Z"
}
```

---

### 11.5 Pasang / Ubah Driver Armada (`POST /api/vehicles/:id/assign-driver`)
Memasangkan driver ke armada tertentu (atau melepas driver dengan mengirimkan `driverId: null`).

- **Method**: `POST` *(atau `PATCH /api/vehicles/:id/driver`)*
- **Path**: `/api/vehicles/:id/assign-driver`
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Request Body
```json
{
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01"
}
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Driver assigned to vehicle successfully",
  "data": {
    "id": "veh-7711-4bc1-9022-882299aabb01",
    "name": "Toyota HiAce Premio Luxury",
    "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
    "driver": {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "fullName": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566"
    }
  },
  "timestamp": "2026-09-14T08:10:00.000Z"
}
```

---

### 11.6 Hapus Armada (`DELETE /api/vehicles/:id`)
Menghapus armada dari sistem. Sistem akan otomatis menolak penghapusan jika armada masih ditugaskan pada grup perjalanan yang aktif (`open`, `waiting`, `confirmed`).

- **Method**: `DELETE`
- **Path**: `/api/vehicles/:id` *(atau `/api/armada/:id`)*
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicle deleted successfully",
  "data": {
    "id": "veh-8822-4bc1-9022-771199aabb02",
    "deleted": true
  },
  "timestamp": "2026-09-14T08:20:00.000Z"
}
```

---

## 12. Partisipan Traveler (`/api/participants`)

### 12.1 Data Partisipan Saya
Mengambil daftar identitas traveler yang terdaftar di akun pengguna yang login.

- **Method**: `GET`
- **Path**: `/api/participants/me`
- **Auth**: `Bearer <token>`

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Participants retrieved",
  "data": [
    {
      "id": "c19208a1-5512-48ea-9201-7fa112345678",
      "bookingCode": "TRV-8921",
      "fullName": "Budi Traveler",
      "phoneNumber": "+6281234567890",
      "nationality": "Indonesia",
      "paymentStatus": "paid",
      "checkInStatus": "pending"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 13. Dashboard & Manajemen Admin (`/api/admin`)

> **Catatan Keamanan**: Seluruh endpoint admin di bawah ini **WAJIB** menyertakan header `Authorization: Bearer <admin_jwt_token>` dengan akun ber-role `'admin'`.

---

### 13.1 Analytics & Metrik Dashboard
- **Method**: `GET`
- **Path**: `/api/admin/metrics`

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Metrics retrieved successfully",
  "data": {
    "totalRevenue": 24500000,
    "revenueGrowthPercentage": 14.8,
    "activeTripsCount": 12,
    "averageOccupancyRate": 83.3,
    "totalParticipants": 94,
    "totalBookings": 102,
    "availableSeats": 18,
    "pendingPaymentsCount": 4
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.2 Riwayat Audit Log Admin
- **Method**: `GET`
- **Path**: `/api/admin/audit-logs?page=1&limit=20`

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Audit logs retrieved",
  "data": [
    {
      "id": "90123a11-8821-4ea1-9122-ccbba1234567",
      "adminEmail": "admin@tripsharing.id",
      "action": "MOVE_PARTICIPANT",
      "targetResource": "BookingGroup",
      "targetId": "f128c9a0-4412-4eb2-a102-bcde91230002",
      "details": "Memindahkan peserta Siti Rahmawati (TRV-8921) dari Grup 1 ke Grup 2.",
      "ipAddress": "180.252.164.12",
      "createdAt": "2026-09-02T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.3 Tambah Peserta Offline / Manual ke Grup
- **Method**: `POST`
- **Path**: `/api/admin/participants/manual` *(atau `/api/admin/participants`)*

#### Request Body
```json
{
  "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
  "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
  "fullName": "Andi Pratama (Offline Booking)",
  "phoneNumber": "+6281399887766",
  "email": "andi@example.com",
  "nationality": "Indonesia",
  "gender": "male",
  "dateOfBirth": "1996-07-22",
  "packageType": "ALL_IN",
  "pickupLocation": "Hotel Tentrem Yogyakarta, Jl. P. Mangkubumi No. 52, Jetis",
  "pickupNotes": "Lobi Utama / Depan Resepsionis",
  "paymentStatus": "paid",
  "totalAmount": 850000,
  "notes": "Peserta walk-in kantor operasional"
}
```

#### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Peserta manual berhasil ditambahkan ke armada.",
  "data": {
    "id": "d1283a01-4412-4ef1-a101-512398471234",
    "bookingCode": "TRV-4192",
    "fullName": "Andi Pratama (Offline Booking)",
    "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230001",
    "packageType": "ALL_IN",
    "pickupLocation": "Hotel Tentrem Yogyakarta, Jl. P. Mangkubumi No. 52, Jetis",
    "pickupNotes": "Lobi Utama / Depan Resepsionis",
    "paymentStatus": "paid"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.4 Pindahkan Peserta Antar Grup Armada (Move Group)
Memindahkan peserta ke kendaraan/grup lain. Otomatis menolak dengan `409 Conflict` jika grup tujuan sudah berkapasitas 6 orang.

- **Method**: `POST` *(atau `PATCH /api/admin/participants/:id/move`)*
- **Path**: `/api/admin/participants/move-group`

#### Request Body
```json
{
  "participantId": "c19208a1-5512-48ea-9201-7fa112345678",
  "targetGroupId": "f128c9a0-4412-4eb2-a102-bcde91230002",
  "reason": "Permintaan traveler untuk gabung rombongan keluarga di Mobil 2."
}
```

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Peserta berhasil dipindahkan ke Grup 2.",
  "data": {
    "participant": {
      "id": "c19208a1-5512-48ea-9201-7fa112345678",
      "bookingGroupId": "f128c9a0-4412-4eb2-a102-bcde91230002"
    },
    "newGroup": {
      "id": "f128c9a0-4412-4eb2-a102-bcde91230002",
      "groupNumber": 2,
      "currentParticipants": 3,
      "maxParticipants": 6,
      "status": "open"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

#### Response Error Grup Penuh (`409 Conflict`)
```json
{
  "success": false,
  "message": "Grup tujuan sudah penuh (Kapasitas Maksimal 6 Orang). Silakan pilih grup lain.",
  "details": {},
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.5 Manajemen Master Destinasi Admin (`CRUD`)

#### 10.5.1 Daftar Seluruh Destinasi Admin (`GET /api/admin/destinations`)
Mengambil semua data destinasi (aktif maupun non-aktif) dalam format standar `camelCase` yang siap di-filter di halaman admin (`d.title`, `d.location`, `d.pricePerPax`, dll).

- **Method**: `GET`
- **Path**: `/api/admin/destinations`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destinations retrieved",
  "data": [
    {
      "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
      "title": "Bromo Sunrise & Midnight Safari",
      "name": "Bromo Sunrise & Midnight Safari",
      "slug": "bromo-sunrise-midnight-safari",
      "tagline": "Jelajahi keajaiban kawah Bromo dan lautan pasir bersama grup seru.",
      "description": "Paket trip sharing midnight menuju Bromo dengan armada Toyota HiAce VIP.",
      "location": "Probolinggo, Jawa Timur",
      "durationDays": 2,
      "durationNights": 1,
      "pricePerPax": 850000,
      "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
      "galleryImages": [
        "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800"
      ],
      "inclusions": ["Tiket Masuk Bromo", "Jeep 4x4", "Driver as Guide"],
      "exclusions": ["Sewa Kuda"],
      "highlights": ["Sunrise Penanjakan", "Kawah Bromo"],
      "rating": 4.9,
      "totalReviews": 128,
      "isPopular": true,
      "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)",
      "maxGroupCapacity": 6,
      "isActive": true,
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.5.2 Buat Destinasi Baru (`POST /api/admin/destinations`)
- **Method**: `POST`
- **Path**: `/api/admin/destinations`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "title": "Kawah Ijen Blue Fire Experience",
  "tagline": "Saksikan fenomena api biru langka di dunia.",
  "description": "Pendakian midnight menyaksikan api biru abadi dan danau kawah toska Ijen.",
  "location": "Banyuwangi, Jawa Timur",
  "durationDays": 2,
  "durationNights": 1,
  "pricePerPax": 750000,
  "priceTransportOnly": 450000,
  "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
  "galleryImages": [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800"
  ],
  "inclusions": ["Tiket Masuk Ijen", "Masker Gas & Senter", "Local Guide"],
  "exclusions": ["Troli Ijen", "Tips"],
  "highlights": ["Blue Fire", "Sunrise Kawah Ijen"],
  "meetingPoint": "Stasiun Banyuwangi Kota",
  "maxGroupCapacity": 6,
  "isActive": true
}
```

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Destination created successfully",
  "data": {
    "id": "8bc12a91-4412-4ee1-9901-ccddeeff0002",
    "title": "Kawah Ijen Blue Fire Experience",
    "slug": "kawah-ijen-blue-fire-experience",
    "location": "Banyuwangi, Jawa Timur",
    "pricePerPax": 750000,
    "priceTransportOnly": 450000,
    "durationDays": 2,
    "isActive": true
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.5.3 Detail Destinasi Admin (`GET /api/admin/destinations/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/destinations/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destination retrieved",
  "data": {
    "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
    "title": "Bromo Sunrise & Midnight Safari",
    "slug": "bromo-sunrise-midnight-safari",
    "tagline": "Jelajahi keajaiban kawah Bromo dan lautan pasir bersama grup seru.",
    "description": "Paket trip sharing midnight menuju Bromo dengan armada Toyota HiAce VIP.",
    "location": "Probolinggo, Jawa Timur",
    "durationDays": 2,
    "durationNights": 1,
    "pricePerPax": 850000,
    "priceTransportOnly": 550000,
    "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
    "galleryImages": [],
    "inclusions": ["Tiket Masuk Bromo", "Jeep 4x4"],
    "exclusions": ["Sewa Kuda"],
    "highlights": ["Sunrise Penanjakan"],
    "meetingPoint": "Stasiun Malang Kota Baru (Pintu Timur)",
    "maxGroupCapacity": 6,
    "isActive": true,
    "createdAt": "2026-09-01T10:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.5.4 Edit / Update Destinasi (`PATCH` atau `PUT /api/admin/destinations/:id`)
Dapat mengirimkan sebagian (parsial) atau seluruh field destinasi.

- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/admin/destinations/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Contoh Update Harga, Gambar, & Status Aktif)
```json
{
  "title": "Bromo Sunrise & Midnight Safari (VIP Edition)",
  "pricePerPax": 900000,
  "priceTransportOnly": 600000,
  "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1600",
  "location": "Probolinggo & Pasuruan, Jawa Timur",
  "isPopular": true,
  "isActive": true
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destination updated",
  "data": {
    "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
    "title": "Bromo Sunrise & Midnight Safari (VIP Edition)",
    "slug": "bromo-sunrise-midnight-safari-vip-edition",
    "location": "Probolinggo & Pasuruan, Jawa Timur",
    "durationDays": 2,
    "durationNights": 1,
    "pricePerPax": 900000,
    "priceTransportOnly": 600000,
    "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1600",
    "isPopular": true,
    "isActive": true,
    "updatedAt": "2026-09-03T04:30:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.5.5 Hapus Destinasi (`DELETE /api/admin/destinations/:id`)
Menghapus destinasi dari database. Otomatis menolak jika sudah terdapat partisipan/booking yang terdaftar demi integritas data.

- **Method**: `DELETE`
- **Path**: `/api/admin/destinations/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Destination deleted",
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

##### Response Error Jika Memiliki Peserta Booking Aktif (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Destinasi tidak dapat dihapus karena sudah memiliki peserta booking yang terdaftar.",
  "details": {},
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.6 Manajemen Master Jadwal Trip Admin (`CRUD`)

#### 10.6.1 List Jadwal Trip (`GET /api/admin/trips`)
Mengambil seluruh data jadwal trip keberangkatan wisata dengan filter opsional `destinationId` / `destination_id` dan `status`.

- **Method**: `GET`
- **Path**: `/api/admin/trips`
- **Auth**: `Bearer <admin_jwt_token>`
- **Query Params**:
  - `destination_id` / `destinationId` *(opsional, string)*: Filter berdasarkan ID destinasi.
  - `status` *(opsional, string)*: Filter status (`planning`, `published`, `scheduled`, `active`, `departed`, `completed`, `cancelled`).

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Trips retrieved",
  "data": [
    {
      "id": "938e1459-c2c9-41c0-9538-7be727db4ba1",
      "destination_id": "dest-ijen-01",
      "departure_date": "2026-09-18T00:00:00.000Z",
      "return_date": "2026-09-21T10:00:00.000Z",
      "guide_id": "guide-uuid-123",
      "max_participants": 6,
      "current_participants": 0,
      "status": "planning",
      "notes": "Keberangkatan via Banyuwangi",
      "destination": {
        "id": "dest-ijen-01",
        "name": "Kawah Ijen Blue Fire",
        "slug": "kawah-ijen-blue-fire"
      },
      "guide": {
        "id": "guide-uuid-123",
        "name": "Budi Santoso",
        "phone": "081234567890"
      },
      "booking_groups": []
    }
  ],
  "timestamp": "2026-09-07T06:30:00.000Z"
}
```

---

#### 10.6.2 Buat Jadwal Trip Baru (`POST /api/admin/trips`)
Mendaftarkan jadwal keberangkatan trip baru. Mendukung payload `camelCase` dan `snake_case`.

- **Method**: `POST`
- **Path**: `/api/admin/trips`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "destinationId": "dest-ijen-01",
  "departureDate": "2026-09-18T00:00:00.000Z",
  "returnDate": "2026-09-21T10:00:00.000Z",
  "maxParticipants": 6,
  "status": "planning",
  "notes": "Meeting point di Stasiun Karangasem"
}
```
*(Atau format snake_case: `destination_id`, `departure_date`, `return_date`, `max_participants`, `guide_id`)*

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "id": "938e1459-c2c9-41c0-9538-7be727db4ba1",
    "destination_id": "dest-ijen-01",
    "departure_date": "2026-09-18T00:00:00.000Z",
    "return_date": "2026-09-21T10:00:00.000Z",
    "guide_id": null,
    "max_participants": 6,
    "current_participants": 0,
    "status": "planning",
    "notes": "Meeting point di Stasiun Karangasem",
    "created_at": "2026-09-07T06:30:00.000Z",
    "updated_at": "2026-09-07T06:30:00.000Z",
    "destination": { "id": "dest-ijen-01", "name": "Kawah Ijen Blue Fire" },
    "guide": null
  },
  "timestamp": "2026-09-07T06:30:00.000Z"
}
```

---

#### 10.6.3 Detail Jadwal Trip (`GET /api/admin/trips/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/trips/:id`
- **Auth**: `Bearer <admin_jwt_token>`

---

#### 10.6.4 Update Jadwal Trip (`PATCH /api/admin/trips/:id` atau `PUT /api/admin/trips/:id`)
Memperbarui jadwal keberangkatan, tanggal kepulangan, kapasitas, status, catatan, atau pemandu. Mendukung format payload `camelCase` maupun `snake_case`.

- **Method**: `PATCH` / `PUT`
- **Path**: `/api/admin/trips/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "departureDate": "2026-09-18T00:00:00.000Z",
  "returnDate": "2026-09-21T10:00:00.000Z",
  "maxParticipants": 12,
  "status": "planning",
  "notes": "Jadwal telah dikonfirmasi pemandu"
}
```
*(Field yang didukung: `destinationId` / `destination_id`, `departureDate` / `departure_date`, `returnDate` / `return_date`, `maxParticipants` / `max_participants`, `guideId` / `guide_id`, `status`, `notes`)*

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Trip updated",
  "data": {
    "id": "938e1459-c2c9-41c0-9538-7be727db4ba1",
    "destination_id": "dest-ijen-01",
    "departure_date": "2026-09-18T00:00:00.000Z",
    "return_date": "2026-09-21T10:00:00.000Z",
    "guide_id": null,
    "max_participants": 12,
    "status": "planning",
    "notes": "Jadwal telah dikonfirmasi pemandu",
    "updated_at": "2026-09-07T06:31:00.000Z"
  },
  "timestamp": "2026-09-07T06:31:00.000Z"
}
```

---

#### 10.6.5 Hapus Jadwal Trip (`DELETE /api/admin/trips/:id`)
Menghapus jadwal trip yang belum memiliki peserta aktif.

- **Method**: `DELETE`
- **Path**: `/api/admin/trips/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Trip deleted",
  "timestamp": "2026-09-07T06:32:00.000Z"
}
```

---

### 10.7 Manajemen Blog & Artikel Admin (`CRUD`)

#### 10.7.1 Daftar Seluruh Artikel Admin (`GET /api/admin/blogs` atau `GET /api/admin/articles`)
Mengambil semua data artikel (baik yang sudah publish maupun draft / non-aktif) dalam format standar `camelCase`.

- **Method**: `GET`
- **Path**: `/api/admin/blogs` *(atau `/api/admin/articles`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Articles retrieved",
  "data": [
    {
      "id": "5128ca01-8891-4da2-b101-771122334455",
      "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru",
      "slug": "5-alasan-mengapa-trip-sharing-lebih-hemat-seru",
      "excerpt": "Temukan bagaimana konsep berbagi armada 6-seater dapat menghemat biaya perjalanan Anda hingga 60%.",
      "content": "Isi lengkap artikel...",
      "coverImage": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
      "category": "Travel Tips",
      "author": {
        "name": "Admin Editorial",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "Lead Travel Writer"
      },
      "readTimeMinutes": 4,
      "tags": ["Tips", "Hemat", "Trip Sharing"],
      "publishedAt": "2026-08-30T10:00:00.000Z",
      "views": 1420,
      "viewCount": 1420,
      "isPublished": true,
      "isActive": true,
      "seoTitle": "5 Alasan Trip Sharing Lebih Hemat",
      "seoDescription": "Tips hemat liburan bersama trip sharing.",
      "createdAt": "2026-08-30T09:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.7.2 Buat Artikel Blog Baru (`POST /api/admin/blogs` atau `POST /api/admin/articles`)
Membuat artikel blog baru. Mendukung pengaturan status publikasi aktif/non-aktif melalui `isActive` atau `isPublished`.

- **Method**: `POST`
- **Path**: `/api/admin/blogs` *(atau `/api/admin/articles`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "title": "Panduan Lengkap Mendaki Kawah Ijen untuk Pemula",
  "category": "Destinasi",
  "excerpt": "Semua yang perlu Anda persiapkan sebelum menyaksikan keindahan Blue Fire Ijen.",
  "content": "Isi lengkap artikel panduan mendaki...",
  "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
  "readTimeMinutes": 6,
  "tags": ["Ijen", "Blue Fire", "Panduan", "Hiking"],
  "authorName": "Admin Editorial",
  "authorAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
  "authorRole": "Senior Travel Guide",
  "seoTitle": "Panduan Mendaki Kawah Ijen Blue Fire",
  "seoDescription": "Tips dan panduan mendaki kawah Ijen Banyuwangi.",
  "isActive": true
}
```

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Article created successfully",
  "data": {
    "id": "a9120384-5512-4ee1-9901-778899aabb01",
    "title": "Panduan Lengkap Mendaki Kawah Ijen untuk Pemula",
    "slug": "panduan-lengkap-mendaki-kawah-ijen-untuk-pemula",
    "category": "Destinasi",
    "excerpt": "Semua yang perlu Anda persiapkan sebelum menyaksikan keindahan Blue Fire Ijen.",
    "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
    "readTimeMinutes": 6,
    "tags": ["Ijen", "Blue Fire", "Panduan", "Hiking"],
    "isPublished": true,
    "isActive": true,
    "publishedAt": "2026-09-04T12:00:00.000Z",
    "createdAt": "2026-09-04T12:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.7.3 Detail Artikel Blog Admin (`GET /api/admin/blogs/:id` atau `GET /api/admin/articles/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/blogs/:id` *(atau `/api/admin/articles/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Article retrieved",
  "data": {
    "id": "5128ca01-8891-4da2-b101-771122334455",
    "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru",
    "slug": "5-alasan-mengapa-trip-sharing-lebih-hemat-seru",
    "excerpt": "Temukan bagaimana konsep berbagi armada 6-seater dapat menghemat biaya perjalanan Anda hingga 60%.",
    "content": "Isi lengkap artikel...",
    "coverImage": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
    "category": "Travel Tips",
    "author": {
      "name": "Admin Editorial",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      "role": "Lead Travel Writer"
    },
    "readTimeMinutes": 4,
    "tags": ["Tips", "Hemat", "Trip Sharing"],
    "views": 1420,
    "isPublished": true,
    "isActive": true,
    "publishedAt": "2026-08-30T10:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.7.4 Edit / Update Artikel Blog (`PATCH` atau `PUT /api/admin/blogs/:id` atau `/api/admin/articles/:id`)
Dapat memperbarui konten, judul, gambar cover, tag, serta mengaktifkan/menonaktifkan publikasi artikel (`isActive: true/false` atau `isPublished: true/false`).

- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/admin/blogs/:id` *(atau `/api/admin/articles/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Contoh Update Judul & Toggle Status Aktif/Nonaktif)
```json
{
  "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru (Update 2026)",
  "category": "Travel Tips",
  "readTimeMinutes": 5,
  "isActive": true
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Article updated",
  "data": {
    "id": "5128ca01-8891-4da2-b101-771122334455",
    "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru (Update 2026)",
    "slug": "5-alasan-mengapa-trip-sharing-lebih-hemat-seru-update-2026",
    "category": "Travel Tips",
    "readTimeMinutes": 5,
    "isPublished": true,
    "isActive": true,
    "updatedAt": "2026-09-04T12:30:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.7.5 Hapus Artikel Blog (`DELETE /api/admin/blogs/:id` atau `/api/admin/articles/:id`)
Menghapus artikel secara permanen dari database.

- **Method**: `DELETE`
- **Path**: `/api/admin/blogs/:id` *(atau `/api/admin/articles/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Article deleted",
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 12.8 Manajemen Driver / Personil Pengemudi Admin (`CRUD & Pairing`)

#### 12.8.1 Daftar Seluruh Driver Admin (`GET /api/admin/drivers`)
Mengambil semua data personil driver yang terdaftar, status ketersediaan, serta data armada fisik yang saat ini terpasang.

- **Method**: `GET`
- **Path**: `/api/admin/drivers`
- **Auth**: `Bearer <admin_jwt_token>`
- **Query Params**:
  - `is_available` *(opsional, boolean)*: Filter status ketersediaan.
  - `status` *(opsional, string)*: Filter status (`active`, `inactive`, `on_trip`).
  - `search` *(opsional, string)*: Pencarian nama driver, nomor HP, atau nomor SIM.

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Drivers retrieved",
  "data": [
    {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "fullName": "Pak Joko Santoso",
      "name": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566",
      "phone": "+6281233445566",
      "email": "joko@driver.local",
      "licenseNumber": "SIM-A-99218201",
      "licenseExpiryDate": "2029-08-30T00:00:00.000Z",
      "rating": 5.0,
      "isAvailable": true,
      "status": "active",
      "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
      "vehicle": {
        "id": "veh-7711-4bc1-9022-882299aabb01",
        "name": "Toyota HiAce Premio Luxury",
        "plateNumber": "N 1234 XY",
        "vehicleType": "Minivan",
        "capacity": 6,
        "status": "active",
        "isAvailable": true
      },
      "user": {
        "id": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
        "name": "Pak Joko Santoso",
        "phone": "+6281233445566",
        "email": "joko@driver.local",
        "profileImageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      },
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 12.8.2 Daftarkan Driver Baru (`POST /api/admin/drivers`)
Mendaftarkan personil driver baru. Admin dapat langsung menautkan armada (`vehicleId`) secara opsional. Jika akun user belum ada, sistem otomatis membuatkan akun user ber-role `'driver'`.

- **Method**: `POST`
- **Path**: `/api/admin/drivers`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "fullName": "Pak Budi Hartono",
  "phoneNumber": "+6281355667788",
  "email": "budi.driver@example.com",
  "licenseNumber": "SIM-A-77889900",
  "licenseExpiryDate": "2029-08-30",
  "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
  "photoUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
  "isAvailable": true
}
```

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Driver created successfully",
  "data": {
    "id": "d1283a01-5512-4ee1-9901-778899aabb02",
    "userId": "u1283a01-5512-4ee1-9901-778899aabb02",
    "fullName": "Pak Budi Hartono",
    "phoneNumber": "+6281355667788",
    "email": "budi.driver@example.com",
    "licenseNumber": "SIM-A-77889900",
    "licenseExpiryDate": "2029-08-30T00:00:00.000Z",
    "rating": 5.0,
    "isAvailable": true,
    "vehicleId": "veh-7711-4bc1-9022-882299aabb01"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 12.8.3 Detail Driver (`GET /api/admin/drivers/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/drivers/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Driver retrieved",
  "data": {
    "id": "d0912384-1234-4bc1-9022-771199aabb01",
    "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
    "fullName": "Pak Joko Santoso",
    "phoneNumber": "+6281233445566",
    "email": "joko@driver.local",
    "licenseNumber": "SIM-A-99218201",
    "licenseExpiryDate": "2029-08-30T00:00:00.000Z",
    "rating": 5.0,
    "isAvailable": true,
    "vehicle": {
      "id": "veh-7711-4bc1-9022-882299aabb01",
      "name": "Toyota HiAce Premio Luxury",
      "plateNumber": "N 1234 XY",
      "vehicleType": "Minivan"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 12.8.4 Edit / Update Driver (`PATCH` atau `PUT /api/admin/drivers/:id`)
- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/admin/drivers/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "fullName": "Pak Joko Santoso, S.Pd",
  "phoneNumber": "+6281233445577",
  "licenseExpiryDate": "2030-05-15",
  "isAvailable": true
}
```

---

#### 12.8.5 Pasangkan / Lepas Armada ke Driver (`POST` atau `PATCH /api/admin/drivers/:id/assign-vehicle`)
Memasangkan unit kendaraan fisik ke driver, atau melepaskan kendaraan (`vehicleId: null`).

- **Method**: `POST` *(atau `PATCH /api/admin/drivers/:id/vehicle`)*
- **Path**: `/api/admin/drivers/:id/assign-vehicle`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Memasangkan Armada)
```json
{
  "vehicleId": "veh-7711-4bc1-9022-882299aabb01"
}
```

##### Request Body (Melepaskan Armada)
```json
{
  "vehicleId": null
}
```

---

#### 12.8.6 Hapus Driver (`DELETE /api/admin/drivers/:id`)
Menghapus data driver. Otomatis dilindungi jika driver sedang ditugaskan pada jadwal trip atau grup armada aktif.

- **Method**: `DELETE`
- **Path**: `/api/admin/drivers/:id`
- **Auth**: `Bearer <admin_jwt_token>`

---

### 12.9 Manajemen Master Armada / Kendaraan Fisik Admin (`CRUD & Pairing`)

Modul independen untuk mengelola kendaraan fisik (armada bus / minivan / SUV), plat nomor, kapasitas, fasilitas, dan status operasional armada.

#### 12.9.1 Daftar Seluruh Armada Admin (`GET /api/admin/vehicles` atau `GET /api/admin/armada`)
- **Method**: `GET`
- **Path**: `/api/admin/vehicles` *(alias `/api/admin/armada`)*
- **Auth**: `Bearer <admin_jwt_token>`
- **Query Params**:
  - `status` *(opsional)*: Filter status (`active`, `maintenance`, `inactive`).
  - `isAvailable` / `is_available` *(opsional, boolean)*: Filter ketersediaan.
  - `search` *(opsional, string)*: Pencarian nama armada atau nomor plat.

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicles retrieved successfully",
  "data": [
    {
      "id": "veh-7711-4bc1-9022-882299aabb01",
      "name": "Toyota HiAce Premio Luxury",
      "plateNumber": "N 1234 XY",
      "plate_number": "N 1234 XY",
      "vehicleType": "Minivan",
      "capacity": 6,
      "transmission": "Manual",
      "fuelType": "Diesel",
      "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger"],
      "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
      "status": "active",
      "isAvailable": true,
      "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
      "driver": {
        "id": "d0912384-1234-4bc1-9022-771199aabb01",
        "fullName": "Pak Joko Santoso",
        "phoneNumber": "+6281233445566",
        "rating": 5.0
      }
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 12.9.2 Tambah Armada Kendaraan Baru (`POST /api/admin/vehicles` atau `POST /api/admin/armada`)
- **Method**: `POST`
- **Path**: `/api/admin/vehicles` *(alias `/api/admin/armada`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "name": "Toyota HiAce Premio Luxury 2026",
  "plateNumber": "N 7788 VIP",
  "vehicleType": "Minivan",
  "capacity": 6,
  "transmission": "Manual",
  "fuelType": "Diesel",
  "facility": ["AC", "Audio/Radio", "Reclining Seat", "USB Charger", "Luggage Space"],
  "coverImage": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
  "status": "active",
  "isAvailable": true
}
```

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Armada berhasil ditambahkan",
  "data": {
    "id": "veh-9901-4bc1-9022-882299aabb99",
    "name": "Toyota HiAce Premio Luxury 2026",
    "plateNumber": "N 7788 VIP",
    "vehicleType": "Minivan",
    "capacity": 6,
    "status": "active",
    "isAvailable": true
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 12.9.3 Detail Armada Admin (`GET /api/admin/vehicles/:id` atau `GET /api/admin/armada/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/vehicles/:id` *(alias `/api/admin/armada/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

---

#### 12.9.4 Update Armada Kendaraan (`PATCH` atau `PUT /api/admin/vehicles/:id`)
- **Method**: `PATCH` *(alias `PUT`)*
- **Path**: `/api/admin/vehicles/:id` *(alias `/api/admin/armada/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Contoh Update Status Pemeliharaan)
```json
{
  "name": "Toyota HiAce Premio Luxury",
  "status": "maintenance",
  "isAvailable": false
}
```

---

#### 12.9.5 Pasangkan / Lepas Driver ke Armada (`POST` atau `PATCH /api/admin/vehicles/:id/assign-driver`)
Memasangkan personil pengemudi ke armada, atau melepaskan penugasan pengemudi (`driverId: null`).

- **Method**: `POST` *(atau `PATCH /api/admin/vehicles/:id/driver`)*
- **Path**: `/api/admin/vehicles/:id/assign-driver` *(alias `/api/admin/armada/:id/assign-driver`)*
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Memasangkan Driver)
```json
{
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01"
}
```

##### Request Body (Melepaskan Driver)
```json
{
  "driverId": null
}
```

---

#### 12.9.6 Hapus Armada Kendaraan (`DELETE /api/admin/vehicles/:id`)
Menghapus unit armada fisik. Dilindungi jika armada sedang terpasang pada grup perjalanan aktif.

- **Method**: `DELETE`
- **Path**: `/api/admin/vehicles/:id` *(alias `/api/admin/armada/:id`)*
- **Auth**: `Bearer <admin_jwt_token>`

---

### 12.10 Manajemen Grup Armada & Penugasan Driver/Armada (`/api/admin/groups`)

Modul ini digunakan oleh admin untuk mengelola unit rombongan mobil (`BookingGroup`), mengatur kapasitas, mengubah status, serta memasangkan personil Driver maupun unit Armada Fisik ke grup perjalanan tertentu.

#### 12.10.1 Daftar Seluruh Grup Armada (`GET /api/admin/groups`)
Mengambil semua data grup/armada mobil beserta relasi trip, destinasi, data driver yang ditugaskan, data armada fisik, dan daftar partisipan di dalamnya.

- **Method**: `GET`
- **Path**: `/api/admin/groups`
- **Query Params**:
  - `tripId` *(opsional)*: Filter berdasarkan ID Trip.
  - `driverId` *(opsional)*: Filter berdasarkan ID Driver.
  - `vehicleId` *(opsional)*: Filter berdasarkan ID Armada/Vehicle.
  - `status` *(opsional)*: Filter status (`open`, `waiting`, `full`, `confirmed`, `completed`, `cancelled`).
  - `search` *(opsional)*: Pencarian nama destinasi, nama driver, plat nomor, atau tipe kendaraan.
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Booking groups retrieved successfully",
  "data": [
    {
      "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
      "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
      "groupNumber": 1,
      "status": "open",
      "currentParticipants": 2,
      "maxParticipants": 6,
      "pricePerPerson": 850000,
      "totalPrice": 5100000,
      "createdAt": "2026-09-01T10:00:00.000Z",
      "updatedAt": "2026-09-01T10:00:00.000Z",
      "trip": {
        "id": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "destinationId": "7fa1bc82-0193-4a11-891d-724bc29a0001",
        "departureDate": "2026-10-01T00:00:00.000Z",
        "returnDate": "2026-10-03T00:00:00.000Z",
        "status": "scheduled",
        "destination": {
          "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
          "name": "Bromo Sunrise & Midnight Safari",
          "slug": "bromo-sunrise-midnight-safari",
          "location": "Probolinggo, Jawa Timur",
          "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200"
        }
      },
      "driver": {
        "id": "d0912384-1234-4bc1-9022-771199aabb01",
        "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
        "licenseNumber": "SIM-A-99218201",
        "vehicleType": "Toyota HiAce Premio",
        "plateNumber": "N 1234 XY",
        "rating": 5.0,
        "isAvailable": true,
        "fullName": "Pak Joko Santoso",
        "phoneNumber": "+6281233445566",
        "email": "joko@driver.local",
        "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      },
      "vehicle": {
        "id": "veh-7711-4bc1-9022-882299aabb01",
        "name": "Toyota HiAce Premio Luxury",
        "plateNumber": "N 1234 XY",
        "vehicleType": "Minivan",
        "capacity": 6,
        "status": "active",
        "isAvailable": true
      },
      "participants": [
        {
          "id": "c19208a1-5512-48ea-9201-7fa112345678",
          "bookingCode": "TRV-8921",
          "fullName": "Siti Rahmawati",
          "phoneNumber": "+6281298765432",
          "paymentStatus": "paid",
          "checkInStatus": "pending"
        }
      ]
    }
  ],
  "timestamp": "2026-09-05T13:30:00.000Z"
}
```

---

#### 12.10.2 Buat Grup Armada Baru (`POST /api/admin/groups`)
- **Method**: `POST`
- **Path**: `/api/admin/groups`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
  "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
  "groupNumber": 2,
  "maxParticipants": 6,
  "pricePerPerson": 850000,
  "status": "open"
}
```

---

#### 12.10.3 Detail Grup Armada (`GET /api/admin/groups/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

---

#### 12.10.4 Update Properti Grup Armada (`PATCH /api/admin/groups/:id`)
- **Method**: `PATCH`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "maxParticipants": 6,
  "status": "waiting",
  "pricePerPerson": 800000,
  "vehicleId": "veh-7711-4bc1-9022-882299aabb01"
}
```

---

#### 12.10.5 Penugasan / Pemindahan Driver ke Grup (`PATCH` atau `POST /api/admin/groups/:id/driver`)
- **Method**: `PATCH` *(atau `POST /api/admin/groups/:id/assign-driver`)*
- **Path**: `/api/admin/groups/:id/driver`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01"
}
```

---

#### 12.10.6 Penugasan / Pemindahan Armada ke Grup (`PATCH` atau `POST /api/admin/groups/:id/vehicle`)
Menugaskan unit armada kendaraan fisik ke grup, atau melepaskan armada dari grup (`vehicleId: null`).

- **Method**: `PATCH` *(atau `POST /api/admin/groups/:id/assign-vehicle`)*
- **Path**: `/api/admin/groups/:id/vehicle`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Menugaskan Armada)
```json
{
  "vehicleId": "veh-7711-4bc1-9022-882299aabb01"
}
```

##### Request Body (Melepaskan Armada dari Grup)
```json
{
  "vehicleId": null
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Armada Toyota HiAce Premio Luxury (N 1234 XY) berhasil dipasangkan ke Grup #1",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
    "vehicleId": "veh-7711-4bc1-9022-882299aabb01",
    "groupNumber": 1,
    "vehicle": {
      "id": "veh-7711-4bc1-9022-882299aabb01",
      "name": "Toyota HiAce Premio Luxury",
      "plateNumber": "N 1234 XY",
      "vehicleType": "Minivan",
      "capacity": 6,
      "status": "active",
      "isAvailable": true
    }
  },
  "timestamp": "2026-09-05T13:35:00.000Z"
}
```

---

#### 12.10.7 Hapus Grup Armada Kosong (`DELETE /api/admin/groups/:id`)
Menghapus grup armada mobil. Otomatis dilindungi jika grup masih memiliki peserta aktif (ditolak dengan status `400 Bad Request`).

- **Method**: `DELETE`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

---

#### 12.10.8 Manifes Penumpang Grup Armada (`GET /api/admin/groups/:id/manifest`)
Mengambil manifes resmi penumpang untuk grup armada tertentu, mencakup rincian trip, destinasi, armada kendaraan, driver, nomor manifes, dan daftar seluruh penumpang beserta `packageType` (`ALL_IN` vs `TRANSPORT_ONLY`), status pembayaran, dan titik penjemputan.

- **Method**: `GET`
- **Path**: `/api/admin/groups/:id/manifest`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Passenger manifest retrieved successfully",
  "data": {
    "manifestNumber": "MNF-BROMO-SUNRISE-MIDNIGHT-SAFARI-GRP1-F128C9",
    "generatedAt": "2026-09-18T07:30:00.000Z",
    "group": {
      "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
      "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "groupNumber": 1,
      "status": "confirmed",
      "currentParticipants": 2,
      "maxParticipants": 6,
      "pricePerPerson": 850000,
      "totalPrice": 5100000,
      "trip": {
        "id": "3a09e112-9c44-48f1-9011-8a9d12340001",
        "destinationId": "7fa1bc82-0193-4a11-891d-724bc29a0001",
        "departureDate": "2026-10-01T00:00:00.000Z",
        "returnDate": "2026-10-03T00:00:00.000Z",
        "status": "scheduled",
        "destination": {
          "id": "7fa1bc82-0193-4a11-891d-724bc29a0001",
          "name": "Bromo Sunrise & Midnight Safari",
          "slug": "bromo-sunrise-midnight-safari",
          "location": "Probolinggo, Jawa Timur"
        }
      },
      "driver": {
        "id": "d0912384-1234-4bc1-9022-771199aabb01",
        "fullName": "Pak Joko Santoso",
        "phoneNumber": "+6281233445566",
        "vehicleType": "Toyota HiAce Premio",
        "plateNumber": "N 1234 XY"
      },
      "vehicle": {
        "id": "veh-7711-4bc1-9022-882299aabb01",
        "name": "Toyota HiAce Premio Luxury",
        "plateNumber": "N 1234 XY",
        "capacity": 6
      },
      "participants": [
        {
          "id": "c19208a1-5512-48ea-9201-7fa112345678",
          "bookingCode": "TRV-8921",
          "fullName": "Siti Rahmawati",
          "phoneNumber": "+6281298765432",
          "packageType": "ALL_IN",
          "paymentStatus": "paid",
          "totalAmount": 850000,
          "pickupLocation": "Hotel Santika Premiere Malang",
          "pickupNotes": "Lobi depan",
          "checkInStatus": "checked_in"
        },
        {
          "id": "d29319b2-6623-49fb-8312-8ab223456789",
          "bookingCode": "TRV-8922",
          "fullName": "Budi Santoso",
          "phoneNumber": "+6281233445566",
          "packageType": "TRANSPORT_ONLY",
          "paymentStatus": "paid",
          "totalAmount": 550000,
          "pickupLocation": "Stasiun Malang Kota Baru",
          "pickupNotes": "Pintu Timur",
          "checkInStatus": "pending"
        }
      ]
    }
  },
  "timestamp": "2026-09-18T07:30:00.000Z"
}
```

---

## 14. Pengaturan Sistem & Dynamic SEO (`/api/settings` & `/api/admin/settings`)

Layanan pengelolaan metadata SEO terpusat (singleton) dan Schema.org JSON-LD untuk integrasi frontend Next.js App Router (SSR `layout.tsx` dan `sitemap.ts`).

### 14.1 Mengambil Pengaturan SEO Global (Public SSR / Frontend)
Digunakan oleh frontend SSR (`layout.tsx`, `sitemap.ts`) untuk mengambil metadata default situs. Jika pengaturan di database belum ada, backend otomatis mengembalikan default object anti-crash.

- **Method**: `GET`
- **Path**: `/api/settings/seo`
- **Auth**: Public (Tanpa token)

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "SEO settings retrieved successfully",
  "data": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "siteTitleDefault": "Share Tour Jogja — Open Trip & Yogyakarta Sharing Tours",
    "siteTitleTemplate": "%s | Share Tour Jogja",
    "metaDescription": "Open trip and sharing tour platform in Yogyakarta & Indonesia. Join small-group travel tours, save up to 60% with cost-sharing, and make new friends.",
    "keywords": [
      "Share Tour Jogja",
      "Open Trip Jogja",
      "Sharing Tour Yogyakarta",
      "Trip Sharing Jogja",
      "Small Group Travel Indonesia"
    ],
    "defaultOgImage": "/images/hero-bromo.png",
    "googleVerificationTag": "google-site-verification-code-xyz",
    "organizationSchemaJson": "{\"@context\":\"https://schema.org\",\"@type\":\"TravelAgency\",\"name\":\"Share Tour Jogja\",\"url\":\"https://sharetourjogja.com\"}",
    "robotsIndex": true,
    "createdAt": "2026-09-16T09:00:00.000Z",
    "updatedAt": "2026-09-16T09:00:00.000Z"
  },
  "timestamp": "2026-09-16T09:00:00.000Z"
}
```

---

### 14.2 Mengambil Pengaturan SEO Global (Admin Panel)
Mengambil konfigurasi SEO global saat ini untuk ditampilkan pada form admin setting.

- **Method**: `GET`
- **Path**: `/api/admin/settings/seo`
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Response Sukses (`200 OK`)
Format data identik dengan endpoint publik di atas.

---

### 14.3 Memperbarui Pengaturan SEO Global (Admin Panel)
Menyimpan dan memperbarui konfigurasi SEO global dan Schema.org JSON-LD.

- **Method**: `PUT` *(atau `PATCH /api/admin/settings/seo`)*
- **Path**: `/api/admin/settings/seo`
- **Auth**: `Bearer <admin_jwt_token>` (Role: `admin`)

#### Request Body
```json
{
  "siteTitleDefault": "Share Tour Jogja — Open Trip & Wisata Yogyakarta",
  "siteTitleTemplate": "%s | Share Tour Jogja",
  "metaDescription": "Platform open trip dan paket tour sharing hemat ke destinasi terbaik di Yogyakarta dan sekitarnya.",
  "keywords": [
    "Share Tour Jogja",
    "Open Trip Jogja",
    "Wisata Hemat Jogja"
  ],
  "defaultOgImage": "/images/og-share-tour.jpg",
  "googleVerificationTag": "google-site-verification-code-updated",
  "organizationSchemaJson": "{\"@context\":\"https://schema.org\",\"@type\":\"TravelAgency\",\"name\":\"Share Tour Jogja\"}",
  "robotsIndex": true
}
```

#### Validasi Khusus:
- `organizationSchemaJson`: Jika diisi string non-kosong, wajib berupa string JSON yang valid (lolos `JSON.parse`).

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "SEO settings updated successfully",
  "data": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "siteTitleDefault": "Share Tour Jogja — Open Trip & Wisata Yogyakarta",
    "siteTitleTemplate": "%s | Share Tour Jogja",
    "metaDescription": "Platform open trip dan paket tour sharing hemat ke destinasi terbaik di Yogyakarta dan sekitarnya.",
    "keywords": [
      "Share Tour Jogja",
      "Open Trip Jogja",
      "Wisata Hemat Jogja"
    ],
    "defaultOgImage": "/images/og-share-tour.jpg",
    "googleVerificationTag": "google-site-verification-code-updated",
    "organizationSchemaJson": "{\"@context\":\"https://schema.org\",\"@type\":\"TravelAgency\",\"name\":\"Share Tour Jogja\"}",
    "robotsIndex": true,
    "createdAt": "2026-09-16T09:00:00.000Z",
    "updatedAt": "2026-09-16T09:15:00.000Z"
  },
  "timestamp": "2026-09-16T09:15:00.000Z"
}
```

---

## 15. Panduan Integrasi Frontend (Next.js Client Example)

### 13.1 HTTP Client Helper (`lib/api.ts`)
```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT Token otomatis
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})
```

### 13.2 Integrasi Midtrans Snap Popup di Next.js
```tsx
'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'

export function PaymentButton({ participantId }: { participantId: string }) {
  useEffect(() => {
    // Load Midtrans Snap JS Script
    const snapScript = 'https://app.sandbox.midtrans.com/snap/snap.js'
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-xxx'

    const script = document.createElement('script')
    script.src = snapScript
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handlePay = async () => {
    try {
      const res = await api.post(`/payments/${participantId}/snap-token`)
      const { snapToken } = res.data.data

      // @ts-expect-error Midtrans Snap global window object
      window.snap.pay(snapToken, {
        onSuccess: function (result: any) {
          alert('Pembayaran Berhasil!')
          window.location.href = '/my-bookings'
        },
        onPending: function (result: any) {
          alert('Menunggu Pembayaran!')
        },
        onError: function (result: any) {
          alert('Pembayaran Gagal!')
        },
      })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses pembayaran')
    }
  }

  return (
    <button
      onClick={handlePay}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition"
    >
      Bayar Sekarang
    </button>
  )
}
```

---
*Dokumen ini diperbarui secara berkala dan disinkronkan dengan skema database PostgreSQL backend.*
