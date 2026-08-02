# Toddler Meal Suggestions

Expo + TypeScript grocery scanner for Puregold and SM shopping trips. It uses NativeWind, Zustand, local persistence, and Open Food Facts for barcode product details. Prices are saved locally per store after you enter them.

## Run

```bash
npm install
npm run start
```

## APIs

No private API keys are required for grocery scanning. To enable AI food suggestions, add a Gemini API key:

```bash
EXPO_PUBLIC_GEMINI_API_KEY=...
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.0-flash
```

To sync saved Puregold and SM prices through Firebase Firestore, add Firebase web app config values:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## Scanner

The scanner uses `expo-camera` to read grocery barcodes, looks up the scanned item in Open Food Facts, adds the item to the grocery list, and lets you enter the Puregold or SM shelf price. Prices are remembered locally per store and barcode for future grocery trips.

The `Ask AI` button sends the scanned grocery names, brands, prices, and barcode details to Gemini Flash and returns concise food ideas based on those items.

If Firebase is configured, entered prices are also saved to the `grocery_prices` Firestore collection and reused by other app installs that scan the same barcode/store.
