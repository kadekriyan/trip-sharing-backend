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
7. [Blog & Artikel Wisata (`/api/blogs`)](#7-blog--artikel-wisata-apiblogs)
8. [Driver & Armada (`/api/drivers`)](#8-driver--armada-apidrivers)
9. [Partisipan Traveler (`/api/participants`)](#9-partisipan-traveler-apiparticipants)
10. [Dashboard & Manajemen Admin (`/api/admin`)](#10-dashboard--manajemen-admin-apiadmin)
11. [Panduan Integrasi Frontend (Next.js Client Example)](#11-panduan-integrasi-frontend-nextjs-client-example)

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
    "identityNumber": "3578012345670001",
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
- **Bot Protection**: Menyertakan `captchaToken` (hCaptcha)

#### Request Body
```json
{
  "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
  "fullName": "Siti Rahmawati",
  "email": "siti.rahma@example.com",
  "phoneNumber": "+6281987654321",
  "nationality": "Indonesia",
  "identityNumber": "3201123456780002",
  "gender": "female",
  "roomPreference": "Single Supplement",
  "healthNotes": "Alergi seafood ringan",
  "hasInsurance": true,
  "captchaToken": "10000000-aaaa-bbbb-cccc-000000000001"
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

### 5.3 Riwayat Pemesanan Saya (`My Bookings`)
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

## 7. Blog & Artikel Wisata (`/api/blogs`)

### 7.1 Daftar Artikel Blog Terbit
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

## 8. Driver & Armada (`/api/drivers`)

### 8.1 Daftar Driver Tersedia
Menampilkan daftar driver aktif yang siap bertugas mengantar armada trip sharing.

- **Method**: `GET`
- **Path**: `/api/drivers`
- **Auth**: Public

#### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Drivers retrieved",
  "data": [
    {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "userId": "e4b29c62-8e1d-4d7a-b5e1-51283d5a4911",
      "licenseNumber": "SIM-A-99218201",
      "vehicleType": "Toyota HiAce Premio",
      "vehiclePlat": "N 1234 XY",
      "experienceYears": 6,
      "rating": 5.0,
      "isAvailable": true,
      "user": {
        "name": "Pak Joko Santoso",
        "phone": "+6281233445566",
        "profileImageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      }
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 9. Partisipan Traveler (`/api/participants`)

### 9.1 Data Partisipan Saya
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
      "identityNumber": "3578012345670001",
      "paymentStatus": "paid",
      "checkInStatus": "pending"
    }
  ],
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

## 10. Dashboard & Manajemen Admin (`/api/admin`)

> **Catatan Keamanan**: Seluruh endpoint admin di bawah ini **WAJIB** menyertakan header `Authorization: Bearer <admin_jwt_token>` dengan akun ber-role `'admin'`.

---

### 10.1 Analytics & Metrik Dashboard
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
  "paymentStatus": "paid",
  "hasInsurance": true,
  "insuranceFee": 50000,
  "totalAmount": 900000
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

### 10.8 Manajemen Driver & Armada Admin (`CRUD`)

#### 10.8.1 Daftar Seluruh Driver & Armada (`GET /api/admin/drivers`)
Mengambil semua data driver dan armada kendaraan dalam format standar `camelCase`.

- **Method**: `GET`
- **Path**: `/api/admin/drivers`
- **Auth**: `Bearer <admin_jwt_token>`

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
      "vehicleType": "Toyota HiAce Premio",
      "vehicleModel": "Toyota HiAce Premio",
      "vehiclePlat": "N 1234 XY",
      "plateNumber": "N 1234 XY",
      "experienceYears": 6,
      "rating": 5.0,
      "isAvailable": true,
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

#### 10.8.2 Daftarkan Driver & Armada Baru (`POST /api/admin/drivers`)
Mendaftarkan pengemudi dan armada baru. Jika belum memiliki user akun, sistem akan otomatis membuat akun driver.

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
  "vehicleModel": "Toyota HiAce Commuter",
  "plateNumber": "N 5678 AB",
  "experienceYears": 5,
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
    "vehicleModel": "Toyota HiAce Commuter",
    "plateNumber": "N 5678 AB",
    "experienceYears": 5,
    "rating": 5.0,
    "isAvailable": true
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.8.3 Detail Driver & Armada (`GET /api/admin/drivers/:id`)
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
    "vehicleModel": "Toyota HiAce Premio",
    "plateNumber": "N 1234 XY",
    "experienceYears": 6,
    "rating": 5.0,
    "isAvailable": true,
    "user": {
      "name": "Pak Joko Santoso",
      "phone": "+6281233445566"
    }
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.8.4 Edit / Update Driver & Armada (`PATCH` atau `PUT /api/admin/drivers/:id`)
Dapat memperbarui data pengemudi, armada kendaraan, nomor plat, serta status ketersediaan.

- **Method**: `PATCH` atau `PUT`
- **Path**: `/api/admin/drivers/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Contoh Update Kendaraan, Plat, & Ketersediaan)
```json
{
  "fullName": "Pak Joko Santoso, S.Pd",
  "phoneNumber": "+6281233445577",
  "vehicleModel": "Toyota HiAce Premio VIP (6-Seater)",
  "plateNumber": "N 1234 VIP",
  "experienceYears": 7,
  "isAvailable": true
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Driver updated",
  "data": {
    "id": "d0912384-1234-4bc1-9022-771199aabb01",
    "fullName": "Pak Joko Santoso, S.Pd",
    "phoneNumber": "+6281233445577",
    "vehicleModel": "Toyota HiAce Premio VIP (6-Seater)",
    "plateNumber": "N 1234 VIP",
    "experienceYears": 7,
    "isAvailable": true,
    "updatedAt": "2026-09-03T05:00:00.000Z"
  },
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

#### 10.8.5 Hapus Driver & Armada (`DELETE /api/admin/drivers/:id`)
Menghapus data driver. Otomatis dilindungi jika driver sedang ditugaskan pada jadwal trip aktif.

- **Method**: `DELETE`
- **Path**: `/api/admin/drivers/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Driver deleted",
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

##### Response Error Jika Driver Sedang Ditugaskan pada Trip Aktif (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Driver tidak dapat dihapus karena sedang ditugaskan pada jadwal trip aktif.",
  "details": {},
  "timestamp": "2026-09-03T04:00:00.000Z"
}
```

---

### 10.9 Manajemen Grup Armada & Penugasan Driver (`/api/admin/groups`)

Modul ini digunakan oleh admin untuk mengelola unit rombongan/armada mobil (`BookingGroup`), mengatur kapasitas, mengubah status, serta menugaskan (*assign*), memindahkan (*reassign*), atau mencopot (*unassign*) driver dari grup armada tertentu.

#### 10.9.1 Daftar Seluruh Grup Armada (`GET /api/admin/groups`)
Mengambil semua data grup/armada mobil beserta relasi trip, destinasi, data driver yang ditugaskan, dan daftar partisipan di dalamnya.

- **Method**: `GET`
- **Path**: `/api/admin/groups`
- **Query Params**:
  - `tripId` *(opsional)*: Filter berdasarkan ID Trip.
  - `driverId` *(opsional)*: Filter berdasarkan ID Driver.
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
      "participants": [
        {
          "id": "c19208a1-5512-48ea-9201-7fa112345678",
          "bookingCode": "TRV-8921",
          "fullName": "Siti Rahmawati",
          "phoneNumber": "+6281298765432",
          "paymentStatus": "paid",
          "checkInStatus": "pending",
          "user": {
            "id": "u1283a01-4412-4eb2-a102-bcde91230001",
            "name": "Siti Rahmawati",
            "email": "siti@example.com",
            "phone": "+6281298765432"
          },
          "payment": {
            "id": "p9012384-1234-4bc1-9022-771199aabb01",
            "amount": 850000,
            "status": "completed"
          }
        }
      ]
    }
  ],
  "timestamp": "2026-09-05T13:30:00.000Z"
}
```

---

#### 10.9.2 Buat Grup Armada Baru (`POST /api/admin/groups`)
Membuat grup mobil baru di bawah suatu jadwal Trip tertentu secara manual.

- **Method**: `POST`
- **Path**: `/api/admin/groups`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
  "groupNumber": 2,
  "maxParticipants": 6,
  "pricePerPerson": 850000,
  "status": "open"
}
```
*(Catatan: `driverId` dan `groupNumber` bersifat opsional. Jika `groupNumber` dikosongkan, sistem otomatis memberikan nomor urut berikutnya).*

##### Response Sukses (`201 Created`)
```json
{
  "success": true,
  "message": "Booking group created successfully",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230002",
    "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
    "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
    "groupNumber": 2,
    "status": "open",
    "currentParticipants": 0,
    "maxParticipants": 6,
    "pricePerPerson": 850000,
    "totalPrice": 5100000,
    "createdAt": "2026-09-05T13:30:00.000Z",
    "updatedAt": "2026-09-05T13:30:00.000Z",
    "driver": {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "fullName": "Pak Joko Santoso",
      "vehicleType": "Toyota HiAce Premio",
      "plateNumber": "N 1234 XY"
    }
  },
  "timestamp": "2026-09-05T13:30:00.000Z"
}
```

---

#### 10.9.3 Detail Grup Armada (`GET /api/admin/groups/:id`)
- **Method**: `GET`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Booking group retrieved successfully",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
    "tripId": "3a09e112-9c44-48f1-9011-8a9d12340001",
    "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
    "groupNumber": 1,
    "status": "open",
    "currentParticipants": 2,
    "maxParticipants": 6,
    "pricePerPerson": 850000,
    "totalPrice": 5100000,
    "trip": {
      "id": "3a09e112-9c44-48f1-9011-8a9d12340001",
      "destination": {
        "name": "Bromo Sunrise & Midnight Safari"
      }
    },
    "driver": {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "fullName": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566",
      "vehicleType": "Toyota HiAce Premio",
      "plateNumber": "N 1234 XY"
    },
    "participants": []
  },
  "timestamp": "2026-09-05T13:30:00.000Z"
}
```

---

#### 10.9.4 Update Properti Grup Armada (`PATCH /api/admin/groups/:id`)
Dapat memperbarui kapasitas maksimal mobil, status grup, harga per orang, nomor urut grup, maupun penugasan driver.

- **Method**: `PATCH`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body
```json
{
  "maxParticipants": 7,
  "status": "waiting",
  "pricePerPerson": 800000
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Booking group updated successfully",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
    "maxParticipants": 7,
    "status": "waiting",
    "pricePerPerson": 800000,
    "totalPrice": 5600000,
    "updatedAt": "2026-09-05T13:35:00.000Z"
  },
  "timestamp": "2026-09-05T13:35:00.000Z"
}
```

---

#### 10.9.5 Penugasan / Pemindahan / Pencopotan Driver ke Grup (`PATCH` atau `POST /api/admin/groups/:id/driver`)
Menugaskan sopir baru ke mobil, memindahkan driver dari mobil lain, atau mencopot penugasan driver (`driverId: null`).

- **Method**: `PATCH` *(atau `POST /api/admin/groups/:id/assign-driver`)*
- **Path**: `/api/admin/groups/:id/driver`
- **Auth**: `Bearer <admin_jwt_token>`

##### Request Body (Menugaskan / Memindahkan Driver)
```json
{
  "driverId": "d0912384-1234-4bc1-9022-771199aabb01"
}
```

##### Request Body (Mencopot Driver dari Grup)
```json
{
  "driverId": null
}
```

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Driver Pak Joko Santoso successfully assigned to Group #1",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230001",
    "driverId": "d0912384-1234-4bc1-9022-771199aabb01",
    "groupNumber": 1,
    "driver": {
      "id": "d0912384-1234-4bc1-9022-771199aabb01",
      "fullName": "Pak Joko Santoso",
      "phoneNumber": "+6281233445566",
      "vehicleType": "Toyota HiAce Premio",
      "plateNumber": "N 1234 XY",
      "isAvailable": true
    }
  },
  "timestamp": "2026-09-05T13:35:00.000Z"
}
```

---

#### 10.9.6 Hapus Grup Armada Kosong (`DELETE /api/admin/groups/:id`)
Menghapus grup armada mobil. Otomatis dilindungi jika grup masih memiliki peserta aktif (ditolak dengan status `400 Bad Request`).

- **Method**: `DELETE`
- **Path**: `/api/admin/groups/:id`
- **Auth**: `Bearer <admin_jwt_token>`

##### Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Booking group deleted successfully",
  "data": {
    "id": "f128c9a0-4412-4eb2-a102-bcde91230002",
    "deleted": true
  },
  "timestamp": "2026-09-05T13:35:00.000Z"
}
```

##### Response Error Jika Grup Masih Berpenumpang (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Cannot delete booking group with existing participants. Please move or cancel participants first.",
  "details": {},
  "timestamp": "2026-09-05T13:35:00.000Z"
}
```

---

## 11. Panduan Integrasi Frontend (Next.js Client Example)

### 11.1 HTTP Client Helper (`lib/api.ts`)
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

### 11.2 Integrasi Midtrans Snap Popup di Next.js
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
