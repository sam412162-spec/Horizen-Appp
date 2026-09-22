# Horizen Gym — member app

The Horizen Gym member app, built with **Expo (React Native) + TypeScript + Expo Router**. It follows the "Horizen App v2" glassmorphism design: a soft pink canvas, frosted-glass cards, and a floating tab bar.

- **Expo SDK 57** (React Native 0.86, React 19)
- Runs on iOS, Android, and web from one codebase
- Every screen gets its data from a service layer (`src/data`). It uses sample data today and switches to the Horizen backend (which replaces GymMaster) with one setting.

---

## Run it on your phone with Expo Go (about 5 minutes)

### 1. Install the tools

| Where | What |
| --- | --- |
| Computer | [Node.js](https://nodejs.org) **20 LTS or newer** (check with `node -v`) |
| Phone | **Expo Go**: [App Store](https://apps.apple.com/app/expo-go/id982107779) · [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) |

> Expo Go must support **SDK 57**. If Expo Go says the project is incompatible, update Expo Go from the store.

### 2. Install and start

```bash
cd horizen-app
npm install
npx expo start
```

A QR code appears in the terminal.

### 3. Open it on the phone

- **iPhone:** open the **Camera** app, point it at the QR code, and tap the "Open in Expo Go" banner.
- **Android:** open **Expo Go** and tap **Scan QR code**.

The app loads, and it reloads on its own whenever you save a file.

### If it doesn't connect

- Your phone and computer must be on the **same Wi‑Fi network**.
- On office, guest, or VPN networks that block device-to-device traffic, use a tunnel:
  ```bash
  npx expo start --tunnel
  ```
- Press `r` in the terminal to reload, or shake the phone to open the developer menu.
- To clear the cache: `npx expo start -c`

### Other ways to run it

```bash
npx expo start --web      # in a browser
npx expo start --ios      # iOS Simulator (macOS + Xcode)
npx expo start --android  # Android emulator (Android Studio)
```

### Signing in (sample data)

Enter **any email and password**, or tap **Continue with Google**. Both sign you in as the sample member "Sam". A blank field shows the inline validation error from the design.

---

## Screens

| Route | Screen | File |
| --- | --- | --- |
| `/` | **Start**: "More than a gym. A community." | `src/app/index.tsx` |
| `/onboarding` | **Onboarding**: 3 intro slides (classes, progress, check-in) | `src/app/onboarding.tsx` |
| `/login` | **Login**: email/password, show/hide, validation, Google | `src/app/login.tsx` |
| `/home` | **Home**: check-in QR, membership, today's overview, upcoming class | `src/app/(tabs)/home.tsx` |
| `/classes` | **Classes**: 5-day picker, morning/evening timetable, bookmarks | `src/app/(tabs)/classes.tsx` |
| `/class/[id]` | **Class detail**: full-bleed photo, tags, coach, book/cancel | `src/app/class/[id].tsx` |
| `/schedule` | **My schedule**: upcoming/past bookings | `src/app/(tabs)/schedule.tsx` |
| `/progress` | **My progress**: weekly calories vs goal, rings, monthly trend | `src/app/(tabs)/progress.tsx` |
| `/workouts` | **Workouts**: search, category filters, recommended, popular | `src/app/(tabs)/workouts.tsx` |
| `/profile` | **Profile**: membership card, menu, sign out | `src/app/(tabs)/profile.tsx` |
| `/membership` | **Membership QR**: full-size check-in code + plan details | `src/app/membership.tsx` |
| `/calorie-goal` | **Calorie goal**: 500–5000 kcal stepper and presets, live bar preview | `src/app/calorie-goal.tsx` |
| `/check-in` | **Self check-in / check-out**: live visit timer, visits this month, recent visits, door QR | `src/app/check-in.tsx` |
| `/billing` | **Membership & billing**: plan, amount due + Pay now, payment method, payment history | `src/app/billing.tsx` |
| `/plans` | **Plans**: compare and switch membership plans (goes through checkout) | `src/app/plans.tsx` |

Navigation: the root stack in `src/app/_layout.tsx` uses `Stack.Protected` to switch between the signed-out screens (start/onboarding/login) and the signed-in app. Signing in or out redirects automatically. The five tabs use a custom floating glass tab bar (`src/components/TabBar.tsx`). *My schedule* sits inside the tab group without a tab of its own, so the tab bar still shows on it, as in the design.

---

## Project structure

```
src/
  app/                 Expo Router routes (each file is a screen)
  components/          Glass, AmbientBackground, TabBar, Icon, Txt, buttons, cards…
  data/
    types.ts           Domain types + the GymService interface
    index.ts           Picks the data source → exports `gym`
    mock/              Sample data + in-memory mock service
    api/               HTTP client for the Horizen backend + secure token storage
  state/               AppProvider (session, bookings, bookmarks, calorie goal), useAsync, usePayment
  theme/               Colours, radii, fonts, shadows from the design
  utils/date.ts        Date/number formatting ("1 240", "4h 25m", "Today • 18:00")
docs/API.md          REST contract the backend must implement
assets/
  images/              gym.jpg, coach.jpg, logo-wordmark.png (transparent)
  icon.png, splash-icon.png, android-icon-*.png
```

### Design → code notes

- **Glass:** `src/components/Glass.tsx` uses a translucent fill with a hairline light border. Cards that sit over photos or scrolling content (tab bar, class-detail chips, the onboarding panel) also get a real `expo-blur` backdrop on iOS and web. Android shows the translucent fill only, because Android backdrop blur is expensive and needs extra setup.
- **Ambient blobs:** CSS `filter: blur()` isn't available on native, so the three blobs are drawn as SVG radial gradients (`AmbientBackground.tsx`).
- **Font:** Manrope 500/600/700/800 through `@expo-google-fonts/manrope`. React Native needs a separate font family per weight, so `<Txt weight="extrabold">` picks the right one.
- **Logo:** the supplied PNG had a white background (the prototype hid it with `mix-blend-mode: multiply`). It was converted to a transparent red wordmark. The light "H◎RIZEN" lockup on the start screen is drawn in code.
- **QR codes** are real and scannable (`react-native-qrcode-svg`). They encode `membership.checkInCode`.

---

## Connecting the Horizen backend

The gym is replacing GymMaster with its own backend. Screens only call the `gym` object from `src/data` and never read sample data directly, so switching over only takes configuration:

1. The backend implements the REST contract in **[`docs/API.md`](docs/API.md)**. The app's client for it is already written: `src/data/api/apiGymService.ts`.
2. Create `.env` from `.env.example`:
   ```
   EXPO_PUBLIC_DATA_SOURCE=api
   EXPO_PUBLIC_API_URL=https://api.horizengym.co.za
   ```
3. Restart with `npx expo start -c`.

What's already handled on the app side:

- **Sessions:** the sign-in token is stored in the iOS Keychain / Android Keystore (`expo-secure-store`) and restored on launch. The splash screen stays up until the session has been checked.
- **Payments:** the backend creates the checkout, and the app opens the payment provider's hosted page (`expo-web-browser`), then asks the backend for the result. Card details never touch the app. See the payment flow in `docs/API.md`.
- **Check-in:** members can check themselves in and out in the app. The QR code is ready for the door device, which will talk to the backend directly (`POST /devices/scan`).

Still to do: Google sign-in needs a Google OAuth client, and until then the API mode shows a message asking members to use email and password.

To preview the **expired membership** state with sample data, set `EXPO_PUBLIC_MOCK_MEMBERSHIP=expired`.

---

## Shipping to the App Store and Google Play

The app uses Continuous Native Generation (no `ios/` or `android/` folders in the repo), and EAS builds it in the cloud. You don't need Xcode or Android Studio.

```bash
npm install -g eas-cli        # or use npx eas-cli@latest …
eas login
eas init                      # links the project to your Expo account
eas build --platform all --profile production
eas submit --platform ios     # needs an Apple Developer account
eas submit --platform android # needs a Google Play developer account
```

Before the first store build, check `app.json`:

- `ios.bundleIdentifier` / `android.package` are currently `com.horizengym.app`. Change them if you own a different domain. **They can't be changed after the first release.**
- `name`, `version`, the icon (`assets/icon.png`), and the splash (`assets/splash-icon.png`)

---

## Scripts

```bash
npm start            # expo start
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

## Known gaps / next steps

- "Forgot password", "Join now", "My profile", "Refer a friend", "Help & support", Settings, and workout playback show a "coming soon" message.
- Sample data: payments always succeed instantly, and prices are placeholders in ZAR.
- The *Workouts* progress tab hides the calorie card. The *Body* tab shows a placeholder until body-assessment data exists.
- Push notifications (bell icon) and class filters (filter icon) aren't wired up yet.
