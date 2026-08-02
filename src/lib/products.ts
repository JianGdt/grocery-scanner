import type { FoodProduct } from "@/types/meal";

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  generic_name_en?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  nutrition_grades?: string;
  nutriscore_grade?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy-kcal_serving"?: number;
    proteins_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
  };
};

type OpenFoodFactsResponse = {
  product?: OpenFoodFactsProduct;
  result?: {
    id?: string;
  };
  status?: number;
};

const OPEN_FOOD_FACTS_PRODUCT_URL = "https://world.openfoodfacts.org/api/v3/product";
const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "generic_name_en",
  "brands",
  "image_url",
  "image_front_url",
  "ingredients_text",
  "ingredients_text_en",
  "nutrition_grades",
  "nutriscore_grade",
  "nutriments"
].join(",");

function normalizeBarcode(barcode: string) {
  return barcode.replace(/\D/g, "");
}

function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct, barcode: string): FoodProduct | undefined {
  const name = product.product_name || product.product_name_en || product.generic_name || product.generic_name_en;

  if (!name) {
    return undefined;
  }

  return {
    id: `off-${product.code || barcode}`,
    name,
    barcode: product.code || barcode,
    brand: product.brands,
    imageUrl: product.image_front_url || product.image_url,
    ingredientsText: product.ingredients_text || product.ingredients_text_en,
    nutriScore: product.nutriscore_grade || product.nutrition_grades,
    caloriesPer100g: product.nutriments?.["energy-kcal_100g"] ?? product.nutriments?.["energy-kcal_serving"],
    proteinPer100g: product.nutriments?.proteins_100g,
    sugarPer100g: product.nutriments?.sugars_100g,
    saltPer100g: product.nutriments?.salt_100g
  };
}

async function getOpenFoodFactsProductByBarcode(barcode: string): Promise<FoodProduct | undefined> {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) {
    return undefined;
  }

  const params = new URLSearchParams({
    fields: OPEN_FOOD_FACTS_FIELDS,
    lc: "en",
    cc: "ph"
  });
  const response = await fetch(`${OPEN_FOOD_FACTS_PRODUCT_URL}/${normalizedBarcode}.json?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ToddlerMealSuggestions/1.0 (mobile app)"
    }
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Open Food Facts lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (payload.result?.id === "product_not_found" || payload.status === 0 || !payload.product) {
    return undefined;
  }

  return mapOpenFoodFactsProduct(payload.product, normalizedBarcode);
}

export async function getProductByBarcode(barcode: string): Promise<FoodProduct | undefined> {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) {
    return undefined;
  }

  const openFoodFactsProduct = await getOpenFoodFactsProductByBarcode(normalizedBarcode);

  if (openFoodFactsProduct) {
    return openFoodFactsProduct;
  }

  return {
    id: `barcode-${normalizedBarcode}`,
    name: `Scanned item ${normalizedBarcode}`,
    barcode: normalizedBarcode
  };
}
