import type { FoodProduct, Meal, MealCategory } from "@/types/meal";

type SpoonacularNutrient = {
  name?: string;
  amount?: number;
  unit?: string;
};

type SpoonacularProduct = {
  id?: number;
  title?: string;
  brand?: string;
  image?: string;
  imageType?: string;
  ingredientList?: string;
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
  };
};

type SpoonacularSearchResponse = {
  products?: SpoonacularProduct[];
};

type SpoonacularIngredient = {
  name?: string;
};

type SpoonacularRecipeStep = {
  step?: string;
};

type SpoonacularRecipeInstruction = {
  steps?: SpoonacularRecipeStep[];
};

type SpoonacularRecipe = {
  id?: number;
  title?: string;
  image?: string;
  readyInMinutes?: number;
  dishTypes?: string[];
  diets?: string[];
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: SpoonacularRecipeInstruction[];
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
  };
};

type SpoonacularRecipeSearchResponse = {
  results?: SpoonacularRecipe[];
};

const API_URL = "https://api.spoonacular.com";
const IMAGE_URL = "https://img.spoonacular.com";
const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API ?? process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

function assertSpoonacularConfig() {
  if (!API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_SPOONACULAR_API.");
  }
}


function findNutrient(product: SpoonacularProduct, name: string) {
  return product.nutrition?.nutrients?.find((nutrient) => nutrient.name?.toLowerCase() === name.toLowerCase())?.amount;
}

function findRecipeNutrient(recipe: SpoonacularRecipe, name: string) {
  const nutrient = recipe.nutrition?.nutrients?.find((item) => item.name?.toLowerCase() === name.toLowerCase());

  if (!nutrient?.amount) {
    return undefined;
  }

  return `${Math.round(nutrient.amount)}${nutrient.unit ?? ""}`;
}

function inferCategory(recipe: SpoonacularRecipe): MealCategory {
  const source = `${recipe.title ?? ""} ${recipe.dishTypes?.join(" ") ?? ""} ${recipe.extendedIngredients
    ?.map((ingredient) => ingredient.name)
    .join(" ") ?? ""}`.toLowerCase();

  if (["salmon", "tuna", "fish", "shrimp", "cod", "sardine"].some((word) => source.includes(word))) {
    return "fish";
  }

  if (["chicken", "beef", "pork", "turkey", "meat", "ham"].some((word) => source.includes(word))) {
    return "meat";
  }

  if (["vegetable", "broccoli", "squash", "spinach", "carrot", "greens", "salad"].some((word) => source.includes(word))) {
    return "vegetable";
  }

  return "healthy";
}

function getImageUrl(product: SpoonacularProduct) {
  if (product.image) {
    if (product.image.startsWith("http")) {
      return product.image;
    }

    if (product.image.startsWith("//")) {
      return `https:${product.image}`;
    }

    if (product.image.startsWith("/")) {
      return `${IMAGE_URL}${product.image}`;
    }

    return `${IMAGE_URL}/products/${product.image}`;
  }

  if (product.id && product.imageType) {
    return `${IMAGE_URL}/products/${product.id}-312x231.${product.imageType}`;
  }

  return undefined;
}

function mapProduct(product: SpoonacularProduct): FoodProduct {
  return {
    id: String(product.id),
    name: product.title!,
    brand: product.brand,
    imageUrl: getImageUrl(product),
    ingredientsText: product.ingredientList,
    caloriesPer100g: findNutrient(product, "Calories"),
    proteinPer100g: findNutrient(product, "Protein"),
    sugarPer100g: findNutrient(product, "Sugar"),
    saltPer100g: findNutrient(product, "Sodium")
  };
}

function mapRecipe(recipe: SpoonacularRecipe): Meal {
  const firstStep = recipe.analyzedInstructions?.flatMap((instruction) => instruction.steps ?? []).find((step) => step.step)?.step;
  const ingredients = recipe.extendedIngredients?.map((ingredient) => ingredient.name).filter(Boolean) as string[] | undefined;
  const calories = findRecipeNutrient(recipe, "Calories");
  const protein = findRecipeNutrient(recipe, "Protein");
  const carbs = findRecipeNutrient(recipe, "Carbohydrates");

  return {
    id: String(recipe.id),
    title: recipe.title!,
    category: inferCategory(recipe),
    ageRange: "3 years old and above",
    prepMinutes: recipe.readyInMinutes ?? 20,
    ingredients: ingredients?.length ? ingredients : recipe.dishTypes ?? [],
    nutrition: [protein ? `Protein ${protein}` : undefined, carbs ? `carbs ${carbs}` : undefined, calories ? `${calories}` : undefined]
      .filter(Boolean)
      .join(", "),
    servingTip: firstStep ?? "Serve in toddler-size portions with soft textures and mild seasoning.",
    imageUrl: recipe.image ?? `${IMAGE_URL}/recipes/${recipe.id}-636x393.jpg`,
    allergyNote: recipe.diets?.length ? `Diet tags: ${recipe.diets.join(", ")}` : undefined
  };
}

async function requestSpoonacular<T>(path: string, params?: Record<string, string>) {
  assertSpoonacularConfig();

  const searchParams = new URLSearchParams({
    apiKey: API_KEY!,
    ...params
  });

  const response = await fetch(`${API_URL}${path}?${searchParams.toString()}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Spoonacular request failed.");
  }

  return (await response.json()) as T;
}

export async function searchSpoonacularProducts(query: string): Promise<FoodProduct[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const payload = await requestSpoonacular<SpoonacularSearchResponse>("/food/products/search", {
    query: trimmedQuery,
    number: "8",
    addProductInformation: "true"
  });

  return (payload?.products ?? []).filter((product) => product.id && product.title).map(mapProduct);
}

export async function getSpoonacularProductByBarcode(barcode: string): Promise<FoodProduct | undefined> {
  const payload = await requestSpoonacular<SpoonacularProduct>(`/food/products/upc/${encodeURIComponent(barcode)}`);

  if (!payload?.id || !payload.title) {
    return undefined;
  }

  return mapProduct(payload);
}

export async function searchSpoonacularMeals(query = "healthy"): Promise<Meal[]> {
  const payload = await requestSpoonacular<SpoonacularRecipeSearchResponse>("/recipes/complexSearch", {
    query,
    number: "12",
    addRecipeInformation: "true",
    addRecipeNutrition: "true",
    instructionsRequired: "true",
    sort: "healthiness"
  });

  return (payload?.results ?? []).filter((recipe) => recipe.id && recipe.title && recipe.image).map(mapRecipe);
}
