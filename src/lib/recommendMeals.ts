import type { FoodProduct, Meal } from "@/types/meal";

const categoryKeywords: Record<Meal["category"], string[]> = {
  vegetable: [
    "vegetable",
    "carrot",
    "broccoli",
    "squash",
    "spinach",
    "tomato",
    "pea",
    "beans",
    "corn",
    "malunggay"
  ],
  meat: ["chicken", "beef", "pork", "meat", "turkey", "ham"],
  fish: ["fish", "tuna", "salmon", "sardine", "cod"],
  healthy: ["oat", "banana", "yogurt", "milk", "rice", "egg", "fruit", "wholegrain", "cereal"]
};

export function getMealsRelatedToProduct(product: FoodProduct | undefined, meals: Meal[]) {
  if (!product) {
    return [];
  }

  return getMealsRelatedToProducts([product], meals);
}

export function getMealsRelatedToProducts(products: FoodProduct[], meals: Meal[]) {
  if (!products.length) {
    return [];
  }

  const source = products
    .map((product) => `${product.name} ${product.brand ?? ""} ${product.ingredientsText ?? ""}`)
    .join(" ")
    .toLowerCase();

  const matchedCategories = Object.entries(categoryKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => source.includes(keyword)))
    .map(([category]) => category);

  const relatedMeals = meals.filter((meal) => {
    const mealText = `${meal.title} ${meal.ingredients.join(" ")} ${meal.nutrition}`.toLowerCase();
    const hasDirectMatch = source
      .split(/[^a-z]+/)
      .filter((word) => word.length > 3)
      .some((word) => mealText.includes(word));

    return matchedCategories.includes(meal.category) || hasDirectMatch;
  });

  return relatedMeals.length ? relatedMeals.slice(0, 4) : meals.filter((meal) => meal.category === "healthy").slice(0, 4);
}
