# Toddler Meal Suggestions

Expo + TypeScript app for meal suggestions for toddlers ages 3 and above. It uses NativeWind for styling, Zustand for local state, and Spoonacular for recipes and packaged grocery products.

## Run

```bash
npm install
npm run start
```

## Spoonacular

```bash
EXPO_PUBLIC_SPOONACULAR_API=...
```

The recipe feed uses Spoonacular recipe search, and packaged food lookup uses Spoonacular grocery product endpoints. Create a free key at https://spoonacular.com/food-api/console and set `EXPO_PUBLIC_SPOONACULAR_API` in `.env`.

## Scanner

The scanner uses `expo-camera` to read grocery barcodes, looks up the scanned item in Spoonacular, adds it to the grocery list, then suggests related toddler meal ideas from the Spoonacular recipe list.
