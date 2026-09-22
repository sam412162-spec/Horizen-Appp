# Horizen Gym

The Horizen Gym member app and the backend that replaces GymMaster.

| Folder | What it is |
| --- | --- |
| [`horizen-app/`](horizen-app/) | Member app: Expo (React Native) + TypeScript, for iOS and Android |
| [`horizen-backend/`](horizen-backend/) | API server: Node + TypeScript + Postgres, with Paystack payments |
| [`project/`](project/) | Original Claude Design prototype (HTML), images and design notes |
| [`chats/`](chats/) | Design conversation history |

## See the app on your phone (about 5 minutes)

You need [Node.js](https://nodejs.org) 20+ on your computer and **Expo Go** on your phone ([iPhone](https://apps.apple.com/app/expo-go/id982107779) · [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

```bash
git clone <this repo's URL>
cd <repo folder>/horizen-app
npm install
npx expo start
```

A **QR code** appears in the terminal:
- **iPhone:** scan it with the Camera app.
- **Android:** scan it from inside Expo Go.

The phone and computer need to be on the same Wi‑Fi. If the phone can't connect, run `npx expo start --tunnel`.

The app starts with sample data, so any email and password signs you in. To run it against the real backend, see [`horizen-backend/README.md`](horizen-backend/README.md).
