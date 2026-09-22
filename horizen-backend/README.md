# Horizen Gym backend

This is the server behind the Horizen member app, replacing GymMaster. It holds the gym's members, memberships, classes, bookings, check-ins, and **Paystack** card payments with automatic monthly renewals.

- **Stack:** Node 20+, TypeScript, [Hono](https://hono.dev), [Drizzle ORM](https://orm.drizzle.team), Postgres, Zod
- **API contract:** [`../horizen-app/docs/API.md`](../horizen-app/docs/API.md). The app's client for it is `horizen-app/src/data/api/apiGymService.ts`.
- **Tests:** 24 automated tests, using an in-memory Postgres (PGlite) and a fake Paystack

## Run it locally (no database install needed)

```bash
cd horizen-backend
npm install
npm run db:seed     # creates the database in .data/ and adds sample data
npm run dev         # http://localhost:3000
```

In development the database is **PGlite**, which is real Postgres running inside Node and stored in `.data/pglite`. Delete that folder to start fresh.

The seed prints two logins:

| Who | Email | Password |
| --- | --- | --- |
| Member | `sam@example.com` | `horizen123` |
| Admin (for the admin panel, later) | `admin@horizengym.co.za` | `change-me-now` |

### Point the app at it

In `horizen-app/.env`:

```
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_API_URL=http://<your computer's LAN IP>:3000
```

Then run `npx expo start -c` (the `-c` matters, because Expo caches these values). Use your computer's LAN IP rather than `localhost`, because the phone has to be able to reach it.

## Tests

```bash
npm test          # vitest: auth, classes, check-in, door device, checkout, webhooks, renewals
npm run typecheck
```

## How the pieces work

### Check-in
- Members check in and out in the app (`POST /me/check-in`, `/me/check-out`). A member can have at most one open visit, and the database enforces it.
- Visits left open for 12 hours are closed automatically and recorded as 90 minutes.
- **Door device:** register the device with `npm run device:create -- "Front door" toggle`, which prints a device key once. The device then sends each scanned QR code to `POST /devices/scan` with the header `X-Device-Key`. The response says whether to open the door, and the visit is recorded as `source: "device"`. The member's QR code holds an opaque `checkInCode`, not their member number.

### Payments (Paystack)
1. The app asks for a checkout (`POST /me/checkout`), and the server creates a Paystack transaction and returns Paystack's hosted payment page.
2. The member pays on Paystack's page. Card details never touch the app or this server.
3. Paystack calls **`/webhooks/paystack`**. The server checks the signature and then settles the payment: the invoice is marked paid, the membership is extended, and the card is saved for renewals.
4. The app asks `GET /me/checkout/:id`. If the webhook hasn't arrived yet, the server asks Paystack directly.

Settling is **idempotent**. A replayed webhook, the app's status check, or the billing job can all hit the same payment, and it's only applied once. A payment whose amount doesn't match is rejected.

### Automatic renewals (billing job)
- 3 days before a membership ends, a renewal invoice is created.
- On the due date, the saved card is charged (Paystack `charge_authorization`).
- If the charge is declined, the invoice is marked failed and the member sees "Pay now" in the app. Automatic retries happen at most 3 times, 72 hours apart.
- An unpaid membership lapses on its own when `validUntil` passes, and check-in and booking are then blocked.

**Plan changes** take effect immediately. The new period is added after any time the member has already paid for, so there's no proration yet; tell me if you want a different rule.

### Background jobs
With `RUN_JOBS=true` (the default), the server runs these every hour:
- generating class sessions from the weekly timetable, 14 days ahead
- closing forgotten visits
- billing

If your host has cron and you run more than one server, set `RUN_JOBS=false` and schedule `npm run jobs:run` instead.

### Progress numbers
There's no wearable data yet, so progress is **estimated from gym visits**: time in the gym counts as active minutes, at 7 kcal per minute. Replace `estimateCalories` in `src/services/progress.ts` when real data is available.

## Going live

1. **Postgres:** any managed Postgres works (Render, Railway, Supabase, Neon, AWS, and so on). Set `DATABASE_URL`. Migrations run automatically on start.
2. **Deploy:** use the `Dockerfile`, or `npm ci && npm run build && npm start`. `docker compose up --build` runs the API and Postgres together locally.
3. **Environment:** copy `.env.example`. At minimum set `PUBLIC_URL` (HTTPS), `DATABASE_URL` and `PAYSTACK_SECRET_KEY`.
4. **Paystack dashboard:**
   - Set the webhook URL to `https://<your-api>/webhooks/paystack`.
   - Test with `sk_test_…` keys before switching to live keys.
5. **First data:** `node dist/scripts/seed.js` loads the sample timetable. Change the admin password, or skip the seed and add the real plans and timetable.

### Things to confirm with Paystack
- **Debit orders:** this build handles **cards**, including automatic monthly card charges. Ask Paystack whether debit orders are available for South African merchants on your account. The database already has a `debit_order` payment-method type ready.
- The live Paystack API couldn't be reached from the environment this was built in. The integration follows Paystack's documented API and is covered by tests against a fake Paystack. Run one real test-mode payment before launch.

## Still to build
- **Web admin panel:** managing members, plans, the timetable, check-ins and payments. The `admin`/`staff` roles already exist.
- **GymMaster member import:** a CSV import once you have the export.
- **Password reset emails and Google sign-in**
- **Door device connection:** waiting on the make and model.
