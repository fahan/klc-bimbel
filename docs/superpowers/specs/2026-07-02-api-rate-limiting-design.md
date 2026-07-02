# Rate Limiting untuk Backend API — Design Spec

Date: 2026-07-02

## Latar Belakang

Backend NestJS saat ini tidak punya rate limiting sama sekali (dicatat sebagai TODO #6 di [CLAUDE.md](../../../CLAUDE.md)). Risiko konkret:

- `POST /auth/login` bisa di-brute-force tanpa batas percobaan.
- `GET /invoices/public/:token` dan `GET /progress-reports/public/:token` adalah endpoint publik (tanpa auth) yang mengandalkan token 16-byte hex acak sebagai satu-satunya proteksi — tanpa rate limit, token bisa di-scan/brute-force.
- Endpoint biasa (butuh JWT) juga tidak ada proteksi terhadap script/bot yang nge-hammer API.

## Keputusan Desain (dari sesi brainstorming)

| Pertanyaan | Keputusan |
| --- | --- |
| Scope | Global guard (semua endpoint) + override lebih ketat untuk endpoint sensitif |
| Deployment | Single instance → storage in-memory (bawaan `@nestjs/throttler`), tidak perlu Redis |
| Limit endpoint sensitif (login, public token) | 5 request/menit per IP |
| Limit global (default, endpoint ber-JWT) | 100 request/menit per IP |

## Library

`@nestjs/throttler` — belum terpasang, perlu `pnpm add @nestjs/throttler` di `apps/backend`.

## Perubahan

### 1. `apps/backend/src/app.module.ts`

- Import `ThrottlerModule` dan `ThrottlerGuard`.
- `ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }])` ditambahkan ke `imports`.
- Daftarkan `ThrottlerGuard` sebagai `APP_GUARD` di `providers` — otomatis berlaku untuk semua route tanpa perlu `@UseGuards()` manual di tiap controller.

### 2. `apps/backend/src/main.ts`

- Tambahkan `app.set('trust proxy', 1)` sebelum `app.listen()`.
- **Alasan:** kalau backend di-deploy di belakang reverse proxy (umum untuk hosting Node — Render/Railway/dsb), `req.ip` default akan selalu terbaca sebagai IP proxy, bukan IP client. Tanpa ini, semua user akan terhitung sebagai satu "IP" yang sama dan saling nge-block satu sama lain.

### 3. Override endpoint sensitif (5 req/menit)

Tambahkan `@Throttle({ default: { limit: 5, ttl: 60000 } })` (dari `@nestjs/throttler`) pada:

- `POST /auth/login` di [auth.controller.ts](../../../apps/backend/src/modules/auth/auth.controller.ts)
- `GET /invoices/public/:token` di [invoices.controller.ts](../../../apps/backend/src/modules/invoices/invoices.controller.ts)
- `GET /progress-reports/public/:token` di [progress-reports.controller.ts](../../../apps/backend/src/modules/progress-reports/progress-reports.controller.ts)

Karena nama throttler yang di-override sama (`default`), ini **mengganti** limit untuk route tersebut, bukan menambah throttler kedua yang berjalan paralel.

## Error Response

Tidak perlu exception filter baru. `ThrottlerException` adalah subclass `HttpException` dengan status 429, sehingga otomatis ditangkap oleh `AllExceptionsFilter` yang sudah ada dan menghasilkan format standar proyek:

```json
{
  "success": false,
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "...",
  "path": "/auth/login"
}
```

## Testing

- Test e2e/unit baru: kirim >5 request berturut-turut ke `POST /auth/login` dalam satu test, assert request ke-6 mengembalikan status 429.
- Test serupa untuk salah satu endpoint public token (misal `GET /invoices/public/:token`) untuk memverifikasi override berlaku.
- Verifikasi endpoint biasa (butuh JWT) masih menerima request normal di bawah 100/menit tanpa terblokir (regression check terhadap limit global).

## Non-Goals

- Tidak menambahkan Redis/distributed storage — di luar scope karena deployment saat ini single instance. Kalau nanti scale ke multi-instance, ini perlu direvisit (catat sebagai follow-up, bukan bagian dari task ini).
- Tidak mengubah endpoint lain di luar 3 titik sensitif yang disebutkan — cukup diproteksi oleh limit global 100/menit.
