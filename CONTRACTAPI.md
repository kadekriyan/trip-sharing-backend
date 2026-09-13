# 📘 Trip Sharing Platform — API Architecture & Documentation

Dokumen ini merupakan referensi spesifikasi teknis RESTful API lengkap untuk platform **Trip Sharing Platform**. Seluruh endpoint dirancang untuk mengintegrasikan kebutuhan **Frontend (Next.js 16)** dengan **Backend (Express / NestJS + PostgreSQL / Prisma)**.

---

## 1. Standar & Konvensi Umum API

### 1.1 Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.tripsharing.id/api/v1
```

### 1.2 Headers Standar
Setiap permintaan HTTP mewajibkan header berikut:
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_access_token>   # (Wajib untuk rute yang diproteksi)
```

### 1.3 Struktur Respon Standar

#### A. Respon Sukses (Standard Success Response)
```json
{
  "success": true,
  "message": "Deskripsi sukses (opsional)",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

#### B. Respon Error (Standard Error Response)
```json
{
  "success": false,
  "message": "Pesan error manusiawi",
  "errors": {
    "fieldName": ["Pesan validasi spesifik"]
  },
  "errorCode": "RESOURCE_NOT_FOUND"
}
```

### 1.4 Daftar Status HTTP (HTTP Status Codes)
- `200 OK`: Permintaan berhasil dan data dikembalikan.
- `201 Created`: Data baru berhasil dibuat.
- `400 Bad Request`: Format input atau validasi payload tidak valid.
- `401 Unauthorized`: Token JWT tidak ada atau sudah kedaluwarsa.
- `403 Forbidden`: Hak akses tidak memadai (misal: bukan Admin).
- `404 Not Found`: Entitas atau resource tidak ditemukan.
- `409 Conflict`: Terjadi konflik data (misal: kapasitas grup sudah penuh).
- `422 Unprocessable Entity`: Validasi bisnis gagal (misal: captcha tidak valid).
- `500 Internal Server Error`: Terjadi kegagalan di sisi server backend.

---

## 2. Ringkasan Modul Endpoint

```mermaid
graph LR
    API[REST API v1] --> Auth[1. Auth & Profile]
    API --> Dest[2. Destinations & Trips]
    API --> Booking[3. Bookings & Auto-Grouping]
    API --> Payment[4. Midtrans Snap & Webhook]
    API --> Blog[5. Blog & Travel CMS]
    API --> Admin[6. Admin Operations & Fleet]
```

---

## 3. Detail Spesifikasi Endpoint

---

### MODUL 1: AUTENTIKASI & AKUN (`/auth`)

#### 1.1 Registrasi Traveler Baru
- **Endpoint**: `POST /auth/register`
- **Akses**: Publik
- **Deskripsi**: Mendaftarkan akun member traveler baru.

**Request Body:**
```json
{
  "fullName": "Rian Pratama",
  "email": "rian@example.com",
  "password": "Password123!",
  "phoneNumber": "+6281234567890",
  "nationality": "Indonesia"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "data": {
    "user": {
      "id": "usr-uuid-01",
      "fullName": "Rian Pratama",
      "email": "rian@example.com",
      "phoneNumber": "+6281234567890",
      "role": "traveler",
      "createdAt": "2026-08-31T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 1.2 Login Pengguna (Traveler / Admin)
- **Endpoint**: `POST /auth/login`
- **Akses**: Publik
- **Deskripsi**: Otentikasi email dan password untuk mendapatkan JWT Access Token.

**Request Body:**
```json
{
  "email": "admin@tripsharing.id",
  "password": "SuperSecretPassword123!"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": {
      "id": "usr-uuid-admin",
      "fullName": "Admin Operator",
      "email": "admin@tripsharing.id",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 1.3 Mendapatkan Profil Pengguna Login
- **Endpoint**: `GET /auth/me`
- **Akses**: Authenticated (Traveler / Admin)

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "usr-uuid-01",
    "fullName": "Rian Pratama",
    "email": "rian@example.com",
    "phoneNumber": "+6281234567890",
    "nationality": "Indonesia",
    "role": "traveler"
  }
}
```

---

### MODUL 2: DESTINASI WISATA (`/destinations`)

#### 2.1 Katalog Destinasi (List & Search)
- **Endpoint**: `GET /destinations`
- **Akses**: Publik
- **Query Parameters**:
  - `search` *(string, optional)*: Pencarian nama destinasi / lokasi (contoh: `bromo`).
  - `location` *(string, optional)*: Filter lokasi (contoh: `Jawa Timur`).
  - `duration` *(number, optional)*: Filter durasi hari (contoh: `2`).
  - `sortBy` *(string, optional)*: `popular` | `price_asc` | `price_desc` | `rating` (default: `popular`).
  - `page` *(number, optional)*: Halaman aktif (default: `1`).
  - `limit` *(number, optional)*: Jumlah data per halaman (default: `10`).

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "dest-01",
      "title": "Bromo Sunrise & Midnight Crater Odyssey",
      "slug": "bromo-sunrise-midnight-crater",
      "tagline": "Saksikan magisnya golden hour di lautan pasir Bromo bersama teman perjalanan baru.",
      "description": "Paket trip sharing eksklusif maksimal 6 orang per jeep/mobil menuju kawah Bromo dan Bukit Kingkong.",
      "location": "Probolinggo, Jawa Timur",
      "durationDays": 2,
      "durationNights": 1,
      "pricePerPax": 850000,
      "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800",
      "galleryImages": [
        "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800"
      ],
      "inclusions": [
        "Armada Mobil Toyota HiAce AC",
        "Jeep Bromo 4x4",
        "Tiket Masuk TNBTS",
        "Driver & Guide",
        "Dokumentasi Foto"
      ],
      "exclusions": [
        "Pengeluaran Pribadi",
        "Sewa Kuda"
      ],
      "highlights": [
        "Sunrise di Bukit Kingkong",
        "Kawah Bromo & Pasir Berbisik"
      ],
      "rating": 4.9,
      "totalReviews": 128,
      "isPopular": true,
      "meetingPoint": "Stasiun Malang Kota Baru (ML)",
      "maxGroupCapacity": 6
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### 2.2 Detail Destinasi Berdasarkan Slug
- **Endpoint**: `GET /destinations/:slug`
- **Akses**: Publik
- **Deskripsi**: Mengambil informasi rinci destinasi beserta jadwal trip aktif dan rencana harian (itinerary).

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "dest-01",
    "title": "Bromo Sunrise & Midnight Crater Odyssey",
    "slug": "bromo-sunrise-midnight-crater",
    "tagline": "Saksikan magisnya golden hour di lautan pasir Bromo bersama teman perjalanan baru.",
    "description": "Trip sharing seru dan efisien dengan maksimal 6 peserta per mobil.",
    "location": "Probolinggo, Jawa Timur",
    "durationDays": 2,
    "durationNights": 1,
    "pricePerPax": 850000,
    "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800",
    "meetingPoint": "Stasiun Malang Kota Baru (ML)",
    "maxGroupCapacity": 6,
    "itinerary": [
      {
        "day": 1,
        "title": "Penjemputan & Perjalanan ke Transit Bromo",
        "description": "Kumpul di meeting point, perkenalan sesama rekan trip, dan briefing.",
        "activities": [
          "23:00 - Penjemputan di Stasiun Malang",
          "00:00 - Perjalanan menuju Rest Area Bromo"
        ]
      },
      {
        "day": 2,
        "title": "Sunrise Bromo & Kawah",
        "description": "Eksplorasi sunrise, kawah aktif, dan bukit teletubbies.",
        "activities": [
          "03:30 - Menuju Sunrise Point dengan Jeep 4x4",
          "06:00 - Eksplorasi Kawah Bromo",
          "12:00 - Drop off kembali ke Malang"
        ]
      }
    ],
    "activeTrips": [
      {
        "id": "trip-01",
        "departureDate": "2026-09-05T00:00:00.000Z",
        "returnDate": "2026-09-06T12:00:00.000Z",
        "pricePerPax": 850000,
        "status": "scheduled",
        "groups": [
          {
            "id": "grp-01",
            "groupNumber": 1,
            "capacity": 6,
            "currentParticipants": 4,
            "status": "open",
            "driver": {
              "id": "drv-01",
              "fullName": "Budi Santoso",
              "vehicleModel": "Toyota HiAce Commuter",
              "plateNumber": "N 1234 XY"
            }
          }
        ]
      }
    ]
  }
}
```

---

### MODUL 3: PEMESANAN & AUTO-GROUPING (`/bookings` & `/trips`)

#### 3.1 Cek Ketersediaan Kursi & Grup Trip
- **Endpoint**: `GET /trips/:tripId/availability`
- **Akses**: Publik
- **Deskripsi**: Menampilkan status keterisian grup mobil 6-seater untuk tanggal tertentu.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "tripId": "trip-01",
    "departureDate": "2026-09-05T00:00:00.000Z",
    "groups": [
      {
        "id": "grp-01",
        "groupNumber": 1,
        "capacity": 6,
        "currentParticipants": 4,
        "availableSlots": 2,
        "status": "open",
        "vehicleModel": "Toyota HiAce (6-Seater VIP)"
      },
      {
        "id": "grp-02",
        "groupNumber": 2,
        "capacity": 6,
        "currentParticipants": 2,
        "availableSlots": 4,
        "status": "open",
        "vehicleModel": "Toyota HiAce (6-Seater VIP)"
      }
    ]
  }
}
```

---

#### 3.2 Pembuatan Booking Baru (Traveler Booking + Auto-Grouping + Captcha)
- **Endpoint**: `POST /bookings`
- **Akses**: Publik / Authenticated
- **Deskripsi**: 
  1. Memvalidasi `captchaToken` ke server hCaptcha.
  2. Menerapkan aturan bisnis auto-grouping: mencocokkan grup berstatus `open` yang memiliki kapasitas `< 6`. Jika seluruh grup penuh (atau belum ada), backend secara otomatis membuat `BookingGroup` baru (Group Number + 1).
  3. Mengembalikan ID peserta dan kode booking unik untuk pembayaran Midtrans.

**Request Body:**
```json
{
  "tripId": "trip-01",
  "destinationId": "dest-01",
  "fullName": "Elena Jenkins",
  "email": "elena.j@example.com",
  "phoneNumber": "+6281299887766",
  "nationality": "Indonesia",
  "gender": "female",
  "healthNotes": "Alergi kacang-kacangan",
  "captchaToken": "P1_eyJ0eXAiOiJKV1QiLCJhbGciOi..."
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Pemesanan berhasil dibuat. Silakan lanjutkan ke pembayaran.",
  "data": {
    "participant": {
      "id": "part-uuid-99",
      "bookingCode": "TRV-8921",
      "tripId": "trip-01",
      "bookingGroupId": "grp-01",
      "groupNumber": 1,
      "fullName": "Elena Jenkins",
      "email": "elena.j@example.com",
      "totalAmount": 1250000,
      "paymentStatus": "pending",
      "checkInStatus": "pending",
      "createdAt": "2026-08-31T12:00:00.000Z"
    },
    "groupOccupancy": {
      "currentParticipants": 5,
      "capacity": 6,
      "isFull": false
    }
  }
}
```

---

#### 3.3 Riwayat Booking Saya (My Bookings)
- **Endpoint**: `GET /bookings/my-bookings`
- **Akses**: Authenticated Traveler (atau filter via query `?email=...&bookingCode=...`)

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "part-01",
      "bookingCode": "TRV-8921",
      "destination": {
        "title": "Bromo Sunrise & Midnight Crater Odyssey",
        "slug": "bromo-sunrise-midnight-crater",
        "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800",
        "meetingPoint": "Stasiun Malang Kota Baru (ML)"
      },
      "trip": {
        "departureDate": "2026-09-05T00:00:00.000Z",
        "returnDate": "2026-09-06T12:00:00.000Z"
      },
      "group": {
        "groupNumber": 1,
        "capacity": 6,
        "currentParticipants": 5,
        "driver": {
          "fullName": "Budi Santoso",
          "phoneNumber": "+6281233445566",
          "vehicleModel": "Toyota HiAce Commuter",
          "plateNumber": "N 1234 XY"
        }
      },
      "totalAmount": 1250000,
      "paymentStatus": "paid",
      "checkInStatus": "pending",
      "voucherQrCode": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TRV-8921"
    }
  ]
}
```

---

### MODUL 4: PEMBAYARAN MIDTRANS SNAP & WEBHOOK (`/payments`)

#### 4.1 Inisiasi Midtrans Snap Token
- **Endpoint**: `POST /payments/:participantId/snap-token`
- **Akses**: Publik / Authenticated
- **Deskripsi**: Menghasilkan token Midtrans Snap untuk memunculkan modal overlay pembayaran di frontend.

**Request Body:**
```json
{
  "paymentMethod": "qris"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "snapToken": "66e2c65a-5288-4c92-b43c-662589574d77",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/66e2c65a-5288-4c92-b43c-662589574d77",
    "paymentId": "pay-uuid-01",
    "amount": 1250000,
    "currency": "IDR"
  }
}
```

---

#### 4.2 Webhook Notifikasi Pembayaran (Midtrans Callback)
- **Endpoint**: `POST /payments/webhook`
- **Akses**: Khusus Server Midtrans (Verifikasi Signature Key)
- **Deskripsi**: Menerima HTTP callback dari Midtrans untuk mengupdate status transaksi ke `paid` atau `failed`.

**Request Body (Contoh Payload Midtrans):**
```json
{
  "transaction_time": "2026-08-31 19:30:00",
  "transaction_status": "settlement",
  "transaction_id": "midtrans-trx-987123",
  "status_message": "Midtrans payment notification",
  "status_code": "200",
  "signature_key": "a879f9b76e82c16a505b22b157...",
  "payment_type": "qris",
  "order_id": "TRV-8921",
  "gross_amount": "1250000.00",
  "currency": "IDR"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Status pembayaran berhasil diperbarui."
}
```

---

### MODUL 5: BLOG & ARTIKEL PANDUAN (`/blogs`)

#### 5.1 Katalog Artikel Blog
- **Endpoint**: `GET /blogs`
- **Akses**: Publik
- **Query Parameters**:
  - `category` *(string, optional)*: `Travel Tips` | `Destinations` | `Community Story` | `Budget Travel` | `Guide`
  - `search` *(string, optional)*: Pencarian judul artikel.
  - `page` *(number, optional)*: Default `1`.
  - `limit` *(number, optional)*: Default `6`.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "art-01",
      "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru Dibanding Solo Traveling",
      "slug": "5-alasan-trip-sharing-lebih-hemat",
      "excerpt": "Temukan bagaimana konsep berbagi kendaraan dan logistik dapat memotong biaya liburan hingga 60%.",
      "coverImage": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
      "category": "Travel Tips",
      "author": {
        "name": "Admin Editorial",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "role": "Lead Travel Writer"
      },
      "readTimeMinutes": 4,
      "publishedAt": "2026-08-28T09:00:00.000Z",
      "views": 1420
    }
  ],
  "meta": {
    "page": 1,
    "limit": 6,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### 5.2 Detail Artikel Berdasarkan Slug
- **Endpoint**: `GET /blogs/:slug`
- **Akses**: Publik

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "art-01",
    "title": "5 Alasan Mengapa Trip Sharing Lebih Hemat & Seru",
    "slug": "5-alasan-trip-sharing-lebih-hemat",
    "excerpt": "Panduan lengkap konsep cost sharing pariwisata.",
    "content": "<h2>1. Efisiensi Biaya Transportasi</h2><p>Dengan kapasitas armada 6 orang...</p>",
    "coverImage": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
    "category": "Travel Tips",
    "author": {
      "name": "Admin Editorial",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      "role": "Lead Travel Writer"
    },
    "tags": ["Trip Sharing", "Hemat", "Komunitas"],
    "publishedAt": "2026-08-28T09:00:00.000Z",
    "views": 1421
  }
}
```

---

### MODUL 6: PORTAL OPERASIONAL ADMIN (`/admin`)

> ⚠️ **Catatan Keamanan**: Seluruh endpoint `/admin/*` mewajibkan header `Authorization: Bearer <token>` dengan role user `admin`.

---

#### 6.1 Dashboard Overview & Metrik Operasional
- **Endpoint**: `GET /admin/metrics`
- **Akses**: Admin Only

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 84650000,
    "revenueGrowthPercentage": 18.5,
    "activeTripsCount": 14,
    "averageOccupancyRate": 83.3,
    "totalParticipants": 84,
    "totalBookings": 84,
    "availableSeats": 16,
    "pendingPaymentsCount": 5
  }
}
```

---

#### 6.2 Manajemen Peserta (Roster & Filter)
- **Endpoint**: `GET /admin/participants`
- **Akses**: Admin Only
- **Query Parameters**:
  - `status` *(string, optional)*: `paid` | `pending` | `cancelled`
  - `search` *(string, optional)*: Nama / Email / Kode Booking.
  - `tripId` *(string, optional)*: Filter per trip spesifik.

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "part-01",
      "bookingCode": "TRV-8921",
      "fullName": "Elena Jenkins",
      "email": "elena.j@example.com",
      "phoneNumber": "+1 (555) 019-2834",
      "nationality": "Indonesia",
      "bookingGroupId": "grp-01",
      "totalAmount": 1200000,
      "paymentStatus": "paid",
      "checkInStatus": "pending"
    }
  ]
}
```

---

#### 6.3 Tambah Peserta Manual (Offline Booking Entry)
- **Endpoint**: `POST /admin/participants/manual`
- **Akses**: Admin Only

**Request Body:**
```json
{
  "tripId": "trip-01",
  "bookingGroupId": "grp-02",
  "fullName": "Bambang Pamungkas",
  "email": "bambang@example.com",
  "phoneNumber": "+6281122334455",
  "nationality": "Indonesia",
  "gender": "male",
  "totalAmount": 850000,
  "paymentStatus": "paid",
  "healthNotes": "Sehat tidak ada pantangan"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Peserta manual berhasil ditambahkan ke armada.",
  "data": {
    "id": "part-uuid-manual",
    "bookingCode": "TRV-MAN-01",
    "fullName": "Bambang Pamungkas",
    "bookingGroupId": "grp-02",
    "paymentStatus": "paid"
  }
}
```

---

#### 6.4 Pindahkan Peserta Antar Grup (Move Participant)
- **Endpoint**: `POST /admin/participants/move-group`
- **Akses**: Admin Only
- **Deskripsi**: 
  - Memindahkan traveler dari grup armada saat ini ke grup tujuan.
  - **Validasi Bisnis**: Backend menolak pemindahan jika grup tujuan telah mencapai kapasitas maksimal (**6 peserta**).
  - Backend otomatis mencatat aksi ini ke dalam tabel `AuditLog`.

**Request Body:**
```json
{
  "participantId": "part-01",
  "currentGroupId": "grp-01",
  "targetGroupId": "grp-02",
  "reason": "Permintaan traveler untuk bersama keluarga di Grup 2"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Peserta berhasil dipindahkan ke Grup 2."
}
```

**Response jika Grup Tujuan Penuh (`409 Conflict`):**
```json
{
  "success": false,
  "message": "Grup tujuan sudah penuh (Kapasitas Maksimal 6 Orang). Silakan pilih grup lain.",
  "errorCode": "GROUP_CAPACITY_FULL"
}
```

---

#### 6.5 Buat Paket Destinasi Baru
- **Endpoint**: `POST /admin/destinations`
- **Akses**: Admin Only

**Request Body:**
```json
{
  "title": "Komodo Dragon Shared Sailing Expedition",
  "slug": "komodo-dragon-shared-sailing",
  "tagline": "Berlayar 3D2N menjelajahi Labuan Bajo dan Pulau Padar",
  "description": "Pengalaman liveaboard trip sharing dengan kapal pinisi nyaman.",
  "location": "Labuan Bajo, NTT",
  "durationDays": 3,
  "durationNights": 2,
  "pricePerPax": 2450000,
  "coverImage": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
  "meetingPoint": "Bandara Komodo (LBJ)",
  "inclusions": [
    "Kapal Liveaboard AC",
    "Makan 3x Sehari",
    "Alat Snorkeling",
    "Dokumentasi Drone"
  ],
  "exclusions": [
    "Tiket Masuk TN Komodo",
    "Tiket Pesawat"
  ],
  "highlights": [
    "Trekking Pulau Padar",
    "Pink Beach & Manta Point"
  ],
  "maxGroupCapacity": 6,
  "itinerary": [
    {
      "day": 1,
      "title": "Sailing Menuju Pulau Kelor & Kalong",
      "description": "Check in kapal dan menikmati sunset pulau kalong.",
      "activities": ["Snorkeling Pulau Kelor", "Sunset Viewing"]
    }
  ]
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Paket destinasi berhasil dibuat.",
  "data": {
    "id": "dest-uuid-02",
    "slug": "komodo-dragon-shared-sailing"
  }
}
```

---

#### 6.6 Manajemen Driver & Armada (List & Add)
- **Endpoint**: `GET /admin/drivers`
- **Akses**: Admin Only

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "drv-01",
      "fullName": "Budi Santoso",
      "phoneNumber": "+6281233445566",
      "licenseNumber": "SIM-A-98721456",
      "vehicleModel": "Toyota HiAce Commuter (6-Seater VIP)",
      "plateNumber": "N 1234 XY",
      "passengerCapacity": 6,
      "status": "available",
      "rating": 4.9,
      "totalTrips": 48,
      "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
    }
  ]
}
```

- **Endpoint**: `POST /admin/drivers`
- **Akses**: Admin Only

**Request Body:**
```json
{
  "fullName": "Agus Setiawan",
  "phoneNumber": "+6281399881122",
  "licenseNumber": "SIM-B1-77889900",
  "vehicleModel": "Toyota HiAce Premio (6-Seater)",
  "plateNumber": "DK 5566 AB",
  "passengerCapacity": 6,
  "status": "available",
  "photoUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Mitra driver berhasil didaftarkan.",
  "data": {
    "id": "drv-uuid-03",
    "fullName": "Agus Setiawan"
  }
}
```

---

#### 6.7 Publikasi Artikel Blog CMS Baru
- **Endpoint**: `POST /admin/blogs`
- **Akses**: Admin Only

**Request Body:**
```json
{
  "title": "Panduan Lengkap Perlengkapan Trekking Bromo",
  "slug": "panduan-lengkap-perlengkapan-trekking-bromo",
  "category": "Guide",
  "excerpt": "Daftar pakaian hangat dan perlengkapan wajib saat menyaksikan sunrise di suhu 5 derajat celcius.",
  "content": "<p>Suhu di Bromo saat dini hari bisa mencapai...</p>",
  "coverImage": "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800",
  "author": {
    "name": "Admin Editorial",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    "role": "Editor"
  },
  "readTimeMinutes": 5,
  "tags": ["Bromo", "Trekking", "Tips"]
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Artikel blog berhasil dipublikasikan.",
  "data": {
    "id": "art-uuid-03",
    "slug": "panduan-lengkap-perlengkapan-trekking-bromo"
  }
}
```

---

#### 6.8 Audit Trail Log Aksi Admin
- **Endpoint**: `GET /admin/audit-logs`
- **Akses**: Admin Only

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-01",
      "adminEmail": "admin@tripsharing.id",
      "action": "MOVE_PARTICIPANT",
      "targetResource": "BookingGroup",
      "targetId": "grp-02",
      "details": "Memindahkan peserta Elena Jenkins (TRV-8921) dari Grup 1 ke Grup 2.",
      "ipAddress": "180.252.164.12",
      "createdAt": "2026-08-31T12:30:00.000Z"
    }
  ]
}
```

---

## 4. Matriks Rute & Hak Akses (Role-Based Access Control)

| Endpoint Path | Metode HTTP | Hak Akses | Deskripsi Bisnis |
| :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | Public | Registrasi traveler baru |
| `/auth/login` | `POST` | Public | Otentikasi & token issuance |
| `/auth/me` | `GET` | Authenticated | Profil user aktif |
| `/destinations` | `GET` | Public | Katalog destinasi & search filter |
| `/destinations/:slug` | `GET` | Public | Detail destinasi & itinerary harian |
| `/trips/:id/availability` | `GET` | Public | Pantau keterisian kursi 6-pax grup |
| `/bookings` | `POST` | Public + Captcha | Submit booking & auto-grouping 6 pax |
| `/bookings/my-bookings` | `GET` | Authenticated / Public Query | Riwayat booking traveler & e-voucher |
| `/payments/:id/snap-token` | `POST` | Public / Authenticated | Inisiasi transaksi Midtrans Snap token |
| `/payments/webhook` | `POST` | Midtrans Server | Callback settlement pembayaran otomatis |
| `/blogs` | `GET` | Public | Katalog artikel blog |
| `/blogs/:slug` | `GET` | Public | Detail reader artikel |
| `/admin/metrics` | `GET` | Admin Only | Ringkasan metrik & keterisian armada |
| `/admin/participants` | `GET` | Admin Only | Roster peserta & status pembayaran |
| `/admin/participants/manual` | `POST` | Admin Only | Tambah peserta manual (offline) |
| `/admin/participants/move-group`| `POST` | Admin Only | Pindah grup peserta (validasi maks 6) |
| `/admin/destinations` | `POST` | Admin Only | Buat paket destinasi baru |
| `/admin/drivers` | `GET`, `POST` | Admin Only | Roster & registrasi driver armada |
| `/admin/blogs` | `POST` | Admin Only | Publikasi artikel CMS baru |
| `/admin/audit-logs` | `GET` | Admin Only | Riwayat audit log seluruh aksi admin |

---

## 5. Konfigurasi Environment Backend (`.env`)

Untuk mendukung seluruh API di atas, backend membutuhkan konfigurasi variabel lingkungan berikut:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trip_sharing_db?schema=public

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_EXPIRES_IN=7d

# hCaptcha Bot Protection
HCAPTCHA_SECRET_KEY=0x0000000000000000000000000000000000000000
HCAPTCHA_VERIFY_URL=https://hcaptcha.com/siteverify

# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
```
