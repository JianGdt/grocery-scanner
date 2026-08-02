export type MealCategory = "vegetable" | "meat" | "fish" | "healthy";
export type GroceryStoreId = "puregold" | "sm";

export type Meal = {
  id: string;
  title: string;
  category: MealCategory;
  ageRange: string;
  prepMinutes: number;
  ingredients: string[];
  nutrition: string;
  servingTip: string;
  imageUrl?: string;
  allergyNote?: string;
};

export type FoodProduct = {
  id: string;
  name: string;
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  estimatedPrice?: number;
  priceStoreId?: GroceryStoreId;
  priceSource?: "cloud" | "saved" | "manual";
  nutriScore?: string;
  ingredientsText?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  sugarPer100g?: number;
  saltPer100g?: number;
};
