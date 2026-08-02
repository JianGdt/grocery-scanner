import type { FoodProduct, GroceryStoreId } from "@/types/meal";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
  error?: {
    message?: string;
  };
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

function formatStoreName(storeId: GroceryStoreId) {
  return storeId === "puregold" ? "Puregold" : "SM";
}

function buildSuggestionPrompt(products: FoodProduct[], storeId: GroceryStoreId) {
  const items = products
    .map((product, index) => {
      const details = [
        `${index + 1}. ${product.name}`,
        product.brand ? `brand: ${product.brand}` : undefined,
        product.barcode ? `barcode: ${product.barcode}` : undefined,
        product.estimatedPrice === undefined ? "price: missing" : `price: PHP ${product.estimatedPrice.toFixed(2)}`,
        product.ingredientsText ? `label ingredients: ${product.ingredientsText}` : undefined
      ]
        .filter(Boolean)
        .join("; ");

      return details;
    })
    .join("\n");

  return `You are helping a shopper in the Philippines plan meals from a ${formatStoreName(storeId)} grocery list.

Scanned grocery items:
${items}

Suggest 5 practical food or meal ideas using these items. Keep it concise and in friendly Taglish. For each suggestion include:
- meal name
- which scanned items to use
- any common pantry add-ons needed
- quick prep idea
- budget note if prices are available

Avoid claiming nutrition or allergy safety unless the ingredient data clearly supports it.`;
}

export async function askGeminiForFoodSuggestions(products: FoodProduct[], storeId: GroceryStoreId) {
  if (!products.length) {
    throw new Error("Scan or add grocery items first before asking AI.");
  }

  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to .env, then restart Expo.");
  }

  const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildSuggestionPrompt(products, storeId) }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 900,
        temperature: 0.65
      }
    })
  });

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini request failed with status ${response.status}.`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n").trim();

  if (!text) {
    throw new Error("Gemini did not return a suggestion. Try again with more scanned items.");
  }

  return text;
}
