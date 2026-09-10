# AGENTS.md — Trip Sharing Backend

> Dokumen referensi tunggal untuk AI agent dan developer yang mengerjakan proyek ini.
> Baca dari atas ke bawah sebelum menyentuh kode apapun.

---

## 1. Gambaran Proyek

**Trip Sharing Backend** adalah REST API untuk aplikasi web berbagi perjalanan wisata.
Backend ini menangani booking grup, manajemen peserta, pembayaran via Midtrans, dan CMS artikel.

- **Runtime**: Node.js + TypeScript (target ES2022, module CommonJS)
- **Framework**: Express 4
- **Database**: PostgreSQL via Prisma ORM v5
- **Auth**: JWT (Bearer token) + bcrypt password hashing
- **Payment**: Midtrans Snap (sandbox/production)
- **Email**: Nodemailer (SMTP)
- **Validasi**: Joi
- **Logging**: Winston
- **Testing**: Jest + ts-jest + Supertest
- **Linting**: ESLint + `@typescript-eslint` + Prettier

---

## 2. Struktur Direktori

```
trip-sharing-backend/
├── src/
│   ├── app.ts                  # Express app setup (middleware stack)
│   ├── server.ts               # HTTP server entrypoint
│   ├── config/
│   │   ├── database.ts         # Prisma client singleton
│   │   ├── env.ts              # Env validation via Joi (WAJIB dijalankan pertama)
│   │   ├── midtrans.ts         # Midtrans Snap client
│   │   └── captcha.ts          # hCaptcha config
│   ├── controllers/            # Request handler — hanya memanggil service + sendResponse
│   ├── services/               # Business logic — semua query DB ada di sini
│   ├── routes/                 # Express router — definisi endpoint + middleware chain
│   ├── middleware/             # Auth, validasi, error handler, logger, rate limiter
│   ├── validators/             # Joi schema per resource (dipakai di validateRequest)
│   ├── types/                  # TypeScript types/interfaces + deklarasi augmentasi Express
│   └── utils/                  # asyncHandler, errors, jwt, response, logger, constants
├── prisma/
│   ├── schema.prisma           # Source of truth skema DB
│   ├── seed.ts                 # Data seeder
│   └── migrations/             # Riwayat migrasi (JANGAN diedit manual)
├── tests/
│   ├── unit/                   # Unit test (saat ini kosong, perlu diisi)
│   ├── integration/            # Integration test (saat ini kosong, perlu diisi)
│   └── fixtures/               # Test fixtures / factory data
├── .env.local                  # Env lokal (tidak di-commit)
├── .env.example                # Template env (wajib sinkron dengan src/config/env.ts)
└── docker-compose.yml          # PostgreSQL dev container
```

---

## 3. Domain Model

```
User ──────────────────────────────────────────────────────────────────
  role: 'admin' | 'driver' | 'participant'
  ├── Driver (1:1)         → data kendaraan & SIM
  ├── Participant[]        → peserta booking
  ├── Article[]            → artikel CMS (author)
  ├── Trip[] (guided_trips)→ sebagai pemandu
  └── AuditLog[]           → jejak audit aksi admin

Destination ──────────────────────────────────────────────────────────
  price_per_person: Decimal(10,2)
  └── Trip[]

Trip ──────────────────────────────────────────────────────────────────
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  max_participants: default 6
  └── BookingGroup[]

BookingGroup ──────────────────────────────────────────────────────────
  status: 'open' | 'waiting' | 'full' | 'confirmed' | 'completed' | 'cancelled'
  max_participants: default 6
  ├── Participant[]
  └── Payment[]

Participant ───────────────────────────────────────────────────────────
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  └── Payment? (1:1)

Payment ───────────────────────────────────────────────────────────────
  status: 'pending' | 'completed' | 'failed'
  midtrans_order_id format: "TRIP-{participantId}-{timestamp}"
```

**Invariant penting:**
- Satu `BookingGroup` menampung maks 6 peserta (`max_participants`)
- Ketika group penuh → status otomatis jadi `'full'`, Trip baru dibuka `BookingGroup` selanjutnya
- `Participant` dibuat bersamaan dengan `BookingGroup` update dalam satu `prisma.$transaction`
- Admin yang membuat peserta manual menggunakan email sintetis: `{phone}@booking.local`

---

## 4. Arsitektur Layer & Konvensi

### 4.1 Layer Stack

```
Request → Middleware Chain → Router → asyncHandler(Controller) → Service → Prisma → DB
                                                                      ↓
                                                               ApiError / sendResponse
```

### 4.2 Konvensi Controller

- Controller hanya bertugas: parse `req`, panggil Service, panggil `sendResponse`
- **DILARANG** menulis logika bisnis atau query Prisma langsung di Controller
- Semua method controller dibungkus `asyncHandler` di route file
- Pattern: `sendResponse(res, statusCode, 'Pesan', data)`

```typescript
// ✅ BENAR
static async createBooking(req: Request, res: Response) {
  const result = await BookingService.createBooking(req.user!.id, req.body)
  sendResponse(res, 201, 'Booking created', result)
}

// ❌ SALAH — jangan query Prisma langsung di controller
static async createBooking(req: Request, res: Response) {
  const participant = await prisma.participant.create({ ... })
  res.json(participant)
}
```

### 4.3 Konvensi Service

- Semua Service menggunakan **static methods** dalam class (`BookingService.createBooking(...)`)
- Import Prisma client dari `'../config/database'` (`prisma` singleton)
- Lempar `ApiError` (atau subkelas-nya) untuk semua error yang predictable
- Operasi multi-tabel **wajib** menggunakan `prisma.$transaction(async (tx) => { ... })`
- **JANGAN** memanggil `EmailService` di dalam transaction — panggil setelah commit

```typescript
// ✅ Pattern transaksi yang benar
return prisma.$transaction(async (tx) => {
  const participant = await tx.participant.create({ ... })
  await tx.bookingGroup.update({ ... })
  return participant
})
// EmailService dipanggil di luar transaction:
await EmailService.sendBookingConfirmation(...)
```

### 4.4 Error Handling

Gunakan class dari `src/utils/errors.ts`:

| Class | HTTP Code | Kapan Dipakai |
|---|---|---|
| `ApiError` | Bebas (default 500) | Error umum, base class |
| `ValidationError` | 400 | Input tidak valid |
| `AuthError` | 401 | Tidak terautentikasi |
| `NotFoundError` | 404 | Resource tidak ditemukan |

`errorHandler` middleware di `app.ts` menangkap semua `ApiError` secara otomatis.
**JANGAN** pernah `try/catch` di controller — biarkan `asyncHandler` + `errorHandler` yang menangani.

### 4.5 Validasi Input

- Gunakan Joi schema yang ada di `src/validators/`
- Daftarkan di route dengan: `validateRequest(schema)` untuk body, `validateRequest(schema, 'query')` untuk query params
- Setiap resource harus punya validator file tersendiri: `{resource}.validator.ts`

### 4.6 Auth & Otorisasi

```typescript
// Hanya autentikasi
router.get('/my-bookings', authenticate, asyncHandler(...))

// Autentikasi + role tertentu
router.use(authenticate, authorize(['admin']))

// Captcha (untuk booking publik)
router.post('/', authenticate, verifyCaptcha, validateRequest(...), asyncHandler(...))
```

Role yang valid: `'admin'` | `'driver'` | `'participant'` (lihat `USER_ROLES` di constants)

---

## 5. API Endpoints

Base URL: `http://localhost:3001/api`

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/health` | — | Health check (di luar `/api`) |
| `POST` | `/auth/register` | — | Registrasi user baru (role: participant) |
| `POST` | `/auth/login` | — | Login, dapat JWT |
| `GET` | `/destinations` | — | List destinasi aktif |
| `GET` | `/destinations/:id` | — | Detail destinasi |
| `GET` | `/bookings/groups` | — | Booking group tersedia (by destinasi+tanggal) |
| `POST` | `/bookings` | ✓ + captcha | Buat booking (otomatis assign ke group) |
| `GET` | `/bookings/my-bookings` | ✓ | Riwayat booking user |
| `POST` | `/payments/:id/initiate` | ✓ | Buat transaksi Midtrans Snap |
| `POST` | `/payments/webhook` | — | Webhook Midtrans (verifikasi signature) |
| `GET` | `/articles` | — | List artikel published |
| `GET` | `/articles/:slug` | — | Detail artikel by slug |
| `GET` | `/participants` | ✓ | Lihat data partisipan sendiri |
| `GET` | `/drivers` | — | List driver tersedia |
| **Admin** | | admin only | |
| `POST/GET/PATCH/DELETE` | `/admin/participants` | ✓ admin | CRUD peserta manual |
| `PATCH` | `/admin/participants/:id/move` | ✓ admin | Pindah peserta antar group |
| `POST/GET/PATCH/DELETE` | `/admin/destinations` | ✓ admin | CRUD destinasi |
| `POST/GET/PATCH/DELETE` | `/admin/trips` | ✓ admin | CRUD trip |
| `POST/GET/PATCH/DELETE` | `/admin/articles` | ✓ admin | CRUD artikel |
| `POST/GET/PATCH/DELETE` | `/admin/drivers` | ✓ admin | CRUD driver |

---

## 6. Response Format

Semua respons menggunakan format dari `sendResponse` di `src/utils/response.ts`:

```json
{
  "success": true,
  "message": "Pesan deskriptif",
  "data": { },
  "timestamp": "2026-08-30T02:00:00.000Z"
}
```

Error response (dari `errorHandler`):

```json
{
  "success": false,
  "message": "Pesan error",
  "details": { },
  "timestamp": "2026-08-30T02:00:00.000Z"
}
```

---

## 7. Environment Variables

Validasi environment ada di `src/config/env.ts`. Variabel wajib:

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | YES | — | PostgreSQL connection string |
| `JWT_SECRET` | YES | — | Min 32 karakter |
| `PORT` | — | `3001` | Port server |
| `NODE_ENV` | — | `development` | `development/test/production` |
| `JWT_EXPIRES_IN` | — | `7d` | |
| `JWT_REFRESH_EXPIRES_IN` | — | `30d` | |
| `MIDTRANS_SERVER_KEY` | — | — | Required untuk payment |
| `MIDTRANS_CLIENT_KEY` | — | — | Required untuk payment |
| `MIDTRANS_ENVIRONMENT` | — | `sandbox` | `sandbox/production` |
| `RECAPTCHA_SECRET_KEY` | — | — | Required untuk captcha (Google reCAPTCHA / fallback HCaptcha) |
| `SMTP_HOST` | — | — | Email service, opsional |
| `CORS_ORIGIN` | — | `http://localhost:3000` | Comma-separated origins |

`src/config/env.ts` diimport pertama via `import './config/env'` di `src/app.ts`.
Test load dari `.env.test`, development dari `.env.local`.

---

## 8. Menjalankan Project

```bash
# Install dependencies
npm install

# Jalankan PostgreSQL (Docker)
docker-compose up -d

# Migrasi database
npm run prisma:migrate

# Generate Prisma client (setelah ubah schema)
npm run prisma:generate

# Seed data awal
npm run seed

# Development server (hot reload)
npm run dev

# Build production
npm run build
npm start
```

```bash
# Linting & Formatting
npm run lint          # ESLint
npm run format        # Prettier (src, prisma, tests)

# Testing
npm test              # Jalankan semua test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 9. Panduan Pengembangan Fitur Baru

Ikuti urutan ini setiap menambah resource/fitur baru:

1. **Schema** — Update `prisma/schema.prisma`, jalankan `npm run prisma:migrate`
2. **Types** — Buat/update file di `src/types/{resource}.ts`
3. **Validator** — Buat `src/validators/{resource}.validator.ts` dengan Joi schema
4. **Service** — Buat `src/services/{resource}.service.ts` dengan static methods
5. **Controller** — Buat `src/controllers/{resource}.controller.ts` (tipis, tanpa logika)
6. **Routes** — Buat `src/routes/{resource}.routes.ts`, daftarkan di `src/routes/index.ts`
7. **Tests** — Buat unit test di `tests/unit/` dan integration test di `tests/integration/`

---

## 10. Panduan Testing

- **Framework**: Jest + ts-jest, konfigurasi di `jest.config.js`
- **Test env**: Load dari `.env.test` secara otomatis (via `setupFiles: ['dotenv/config']`)
- **HTTP testing**: Gunakan `supertest` dengan `app` dari `src/app.ts`
- **Unit test**: Tempatkan di `tests/unit/`, mock Prisma client
- **Integration test**: Tempatkan di `tests/integration/`, gunakan DB test terpisah

Pattern mock Prisma untuk unit test:

```typescript
// tests/unit/booking.service.test.ts
jest.mock('../../src/config/database', () => ({
  prisma: {
    trip: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))
```

---

## 11. Hal-hal Kritis

### Transaksi DB
Setiap operasi yang menyentuh lebih dari satu tabel (Participant + BookingGroup + Trip) **wajib** menggunakan `prisma.$transaction`. Referensi: `BookingService.createBooking`.

### Status BookingGroup
Status `'open'` ke `'full'` diatur otomatis di service layer. Jangan set status ini manual dari controller. Ketika group penuh, system otomatis membuat `BookingGroup` baru.

### Midtrans Webhook
`PaymentService.handleWebhook` memverifikasi signature via SHA-512. Jangan proses webhook tanpa verifikasi. Format order ID: `TRIP-{participantId}-{timestamp}`.

### AuditLog
Semua aksi admin yang mengubah data **harus** mencatat `AuditLog`. Referensi: `ParticipantService.createParticipantAsAdmin`.

### Email Service
`EmailService` bersifat opsional — tidak crash jika SMTP tidak dikonfigurasi (log warning saja). Template email saat ini masih placeholder JSON dump, perlu diganti dengan HTML template yang proper.

### Decimal Prisma
`price_per_person` dan `amount` bertipe `Prisma.Decimal`. Gunakan `.toString()` atau `Number()` saat konversi — jangan treat sebagai `number` biasa.

### Strict TypeScript
`tsconfig.json` menggunakan `"strict": true`. **DILARANG** menggunakan `any` tanpa alasan kuat dan komentar eksplisit. Gunakan type yang proper atau `Record<string, unknown>`.

---

## 12. File Kunci

| File | Peran |
|---|---|
| `src/app.ts` | Middleware stack Express, urutan PENTING |
| `src/config/env.ts` | Validasi env — tambahkan variabel baru di sini |
| `prisma/schema.prisma` | SSOT skema DB |
| `src/utils/errors.ts` | Error classes — gunakan yang sudah ada |
| `src/utils/constants.ts` | Konstanta status — tambahkan di sini, jangan hardcode string |
| `src/middleware/errorHandler.ts` | Catch semua error, jangan di-handle di controller |
| `src/utils/asyncHandler.ts` | Wrapper async controller, wajib dipakai di semua route |

### Area yang Masih Perlu Dikerjakan

- [ ] Template HTML email yang proper (saat ini plain JSON dump)
- [ ] Unit tests di `tests/unit/` (direktori ada, isi kosong)
- [ ] Integration tests di `tests/integration/` (direktori ada, isi kosong)
- [ ] File upload / Cloudinary integration (env ada, `file.service.ts` masih stub)
- [ ] Endpoint Trip status management untuk user biasa
- [ ] Refresh token endpoint di auth routes
- [ ] Pagination untuk list endpoints (participants, trips, articles)

---

## 13. Git & Commit

Ikuti Conventional Commits:

```
feat(booking): tambah logika auto-assign booking group
fix(payment): validasi signature webhook Midtrans
refactor(participant): pisahkan logika move ke method terpisah
test(auth): tambah unit test AuthService
```

Scope yang umum: `auth`, `booking`, `payment`, `participant`, `trip`, `destination`, `article`, `driver`, `admin`

Trailer wajib di setiap commit:

```
Co-authored-by: aetheris <agents.aetheris@gmail.com>
```
