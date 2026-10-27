# Optional API

Aurel does not call a server. Build this only if you want presets on more than one phone, or a second check of the RevenueCat receipt. Suggested host:

`https://danijelbrecelj.com/api/mobile/v1`

Postgres, Prisma or Supabase. No accounts. The install id is a random UUID the app generates once. Do not store audio.

## Prisma

```prisma
model Device {
  id        String   @id @default(cuid())
  installId String   @unique
  platform  String
  appUserId String?
  createdAt DateTime @default(now())
  presets   Preset[]
}

model Preset {
  id        String   @id @default(cuid())
  deviceId  String
  device    Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  name      String
  bpm       Int
  modeId    String
  soundId   String
  a4        Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([deviceId])
}

model EntitlementCache {
  appUserId String   @id
  premium   Boolean
  checkedAt DateTime @default(now())
}
```

## Routes

All JSON. Reject bodies that fail the ranges below (bpm 40–240, a4 432–448 step 0.5, modeId and soundId must exist in `src/lib/theory.ts`).

### `POST /devices`

```json
{ "installId": "uuid", "platform": "ios", "appVersion": "1.0.0" }
```

Returns `{ "deviceId": "..." }`. Idempotent on `installId`.

### `GET /devices/:deviceId/presets`

Returns `{ "presets": [ { "id", "name", "bpm", "modeId", "soundId", "a4" } ] }`.

### `POST /devices/:deviceId/presets`

```json
{ "name": "Warmup", "bpm": 92, "modeId": "4/4", "soundId": "wood", "a4": 440 }
```

Cap at 30 presets per device.

### `DELETE /devices/:deviceId/presets/:id`

404 if the preset is not on that device.

### `POST /entitlements/sync`

```json
{ "deviceId": "...", "appUserId": "RevenueCat app user id" }
```

Server calls RevenueCat REST with the **secret** key (`GET https://api.revenuecat.com/v1/subscribers/{appUserId}`) and returns `{ "premium": true }` only when entitlement `premium` is active. Never trust a `premium: true` sent by the phone.

Cache the answer in `EntitlementCache` for a few minutes. The app should still treat the RevenueCat SDK as the source of truth on device; this route is only for a website or a later account system.

## Not in v1

No login, no audio upload, no social. If you add accounts later, bind `Device` to your user id and drop the world-readable install-id guess. `deviceId` from `POST /devices` is an unguessable cuid; do not also key routes by the client-supplied `installId` alone.
