# Aurel

Practice metronome, piano tuner, and violin tuner for iOS and Android. Expo SDK 54, development build (not Expo Go).

Clone this repo in VS Code, then:

```bash
npm install
cp .env.example .env   # optional until you bill
npx expo prebuild
npm run ios            # or npm run android
```

`react-native-audio-api` and `react-native-purchases` are native modules, so this does not run inside Expo Go. Use the commands above or an EAS development build (`eas.json` is included). After `eas login`, run `eas init` once so `extra.eas.projectId` is filled in.

The woodblock is synthesized and kept quiet. Premium clicks and odd meters sit behind a one-time **$2.99** purchase (`isPremium` on each sound and meter). Pitch detection stays on the phone and ignores speech and noise unless a note holds still.

## What you get

- Rotary tempo knob, 40–240, plus tap tempo. BPM is always a quarter note.
- Free meters: 1/4, 2/4, 4/4, eighths, triplets.
- Premium meters (`isPremium: true`): 3/4, 5/4, 6/8, 7/8, 9/8, 12/8.
- Free sound: soft woodblock. Premium: tick, clave, rim, bell, shaker.
- Piano tuner: live hertz, note name (440 Hz ± 3 Hz is A4 at the default reference), cents.
- Violin tuner: open strings G3 D4 A4 E5, or auto if the note is within 45 cents. Play A is a quiet sine. Reference moves in 0.5 Hz steps from 432 to 448.
- Settings drawer, About, link to [danijelbrecelj.com](https://danijelbrecelj.com).

Flags live in `src/lib/theory.ts`.

## RevenueCat

| | |
| --- | --- |
| Entitlement | `premium` |
| Product | `aurel_premium_299` (non-consumable, $2.99) |
| Keys | `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |

Put the product on the current offering. On launch the app reads the entitlement and overwrites the local flag. Restore is on the paywall.

Without keys, a release build will not unlock. A debug build (`__DEV__`) can use **Dev unlock**, stored only on the device, so you can hear the kit before the store is wired.

## Backend

Not required. Presets and the reference pitch live in AsyncStorage. Pitch is never uploaded. If you later want cloud presets or a server check of RevenueCat, see [BACKEND.md](BACKEND.md).

## Bundle ids

`com.danijelbrecelj.aurel` on both stores. Change them in `app.json` before the first upload if you want a different id.
