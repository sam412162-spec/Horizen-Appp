# Horizen API: the contract between the app and the backend

This is the REST API the member app calls when `EXPO_PUBLIC_DATA_SOURCE=api`. It's implemented in `../horizen-backend`. The client that calls it is `src/data/api/apiGymService.ts`. The backend (which replaces GymMaster) has to implement these endpoints.

## Conventions

- **Base URL:** `EXPO_PUBLIC_API_URL`, e.g. `https://api.horizengym.co.za`
- **Format:** JSON bodies. Field names and shapes match `src/data/types.ts`.
- **Images:** `photo` / `avatar` fields are URL strings (the app converts them into image sources).
- **Dates:** date-only fields are `YYYY-MM-DD`. Timestamps are ISO 8601 with a timezone (`2026-09-22T18:00:00+02:00`).
- **Money:** `{ "amount": 65000, "currency": "ZAR" }`, with the amount in **cents**.
- **Auth:** `Authorization: Bearer <token>` on every endpoint except `/auth/*` and `GET /plans`. On a `401`, the app deletes its token and shows the login screen.
- **Errors:** a non-2xx status with `{ "error": { "code": "membership_expired", "message": "Your membership has expired." } }`. The app shows `message` to the member as-is, so write it for members.
- `/me/...` always refers to the signed-in member. Never accept a member ID from the app for these endpoints.

## Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` | `{ token, member: Member }`; `401` wrong details, `429` after 10 failed attempts in 15 min |
| POST | `/auth/google` | `{ idToken }` | `{ token, member: Member }` *(later)* |
| POST | `/auth/logout` | – | `204` (revokes the token) |
| GET | `/me` | – | `Member` (used to restore the session on app start) |

## Membership & home

| Method | Path | Response |
| --- | --- | --- |
| GET | `/me/membership` | `Membership`: `planName`, `status` (`active`/`expired`), `validUntil`, `checkInCode` |
| GET | `/me/overview` | `TodayOverview` |
| GET | `/me/next-class` | `ClassSession \| null` |

`checkInCode` is the value in the member's QR code. It should be an **opaque, unguessable token** (not the member number), so the server can revoke or rotate it.

## Classes & bookings

| Method | Path | Response |
| --- | --- | --- |
| GET | `/classes?date=YYYY-MM-DD` | `ClassSession[]` for that day, sorted by start time |
| GET | `/classes/:sessionId` | `ClassSession` (`404` if unknown) |
| GET | `/me/bookings?filter=upcoming\|past` | `ClassSession[]` |
| POST | `/classes/:sessionId/booking` | `204`, or `409 class_full` / `409 already_booked` |
| DELETE | `/classes/:sessionId/booking` | `204` |

## Workouts & progress

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/workouts` | – | `Workout[]` |
| GET | `/me/recommended-program` | – | `WorkoutProgram` |
| GET | `/me/progress` | – | `ProgressSummary` |
| GET | `/me/calorie-goal` | – | `{ kcal }` |
| PUT | `/me/calorie-goal` | `{ kcal }` (500–5000) | `{ kcal }` |

## Check-in / check-out

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/me/check-in` | – | `CheckInStatus` → `{ current: Visit \| null, visitsThisMonth }` |
| POST | `/me/check-in` | `{ source: "app" }` | `Visit`. Returns the open visit if one exists; `403 membership_expired` if the membership has expired |
| POST | `/me/check-out` | – | `Visit` with `checkedOutAt`; `409 not_checked_in` if there's no open visit |
| GET | `/me/visits?limit=10` | – | `Visit[]`, newest first |

Rules for the server:

- A member has at most **one open visit**.
- Visits left open overnight are closed automatically, for example at closing time.

### Door device (connect later)

The door device won't use the member endpoints. It gets its own device key and one endpoint:

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/devices/scan` | `{ code, direction?: "in" \| "out" }` with header `X-Device-Key` | `{ allowed, member: { firstName, photo }, visit, reason? }` |

The server looks up `code` (the member's `checkInCode`) and checks the membership. It then opens or closes a visit with `source: "device"` and tells the device whether to open the door. How the device calls this depends on its make and model. Some can call a URL directly; others need a small bridge program on a PC at the desk.

## Billing & payments

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/plans` | – | `Plan[]` |
| GET | `/me/billing` | – | `Billing`: plan, `nextPaymentAt`, `balance`, `paymentMethod` |
| GET | `/me/invoices` | – | `Invoice[]`, newest first |
| POST | `/me/checkout` | `{ kind: "invoice", invoiceId, returnUrl }` or `{ kind: "plan", planId, returnUrl }` | `{ id, url }`; `502 payment_unavailable` if Paystack is down |
| GET | `/me/checkout/:id` | – | `{ result: "paid" \| "pending" \| "cancelled" \| "failed" }` |

Payment flow (the app never sees card details):

1. The app calls `POST /me/checkout`. The server creates a payment with the provider and returns the provider's **hosted checkout URL**.
2. The app opens that URL in an in-app browser. When the member finishes, Paystack redirects to the server's `/payments/return` page, which sends them back to the app's `returnUrl` (e.g. `horizen://payment-complete`). Only return URLs starting with an allowed prefix are accepted.
3. The provider calls the server's **webhook**. The server verifies the signature, then marks the invoice paid or switches the plan and extends `validUntil`.
4. The app calls `GET /me/checkout/:id` and shows the result. Until the webhook arrives, the answer is `pending`.

Monthly renewals run on the server: a billing job charges the saved card through Paystack. The app only shows the result.
