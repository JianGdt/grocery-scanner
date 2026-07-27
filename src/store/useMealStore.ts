import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSpoonacularProductByBarcode, searchSpoonacularMeals, searchSpoonacularProducts } from "@/lib/spoonacular";
import type { FoodProduct, Meal, MealCategory } from "@/types/meal";

type MealState = {
  meals: Meal[];
  products: FoodProduct[];
  scannedProduct?: FoodProduct;
  scannedProducts: FoodProduct[];
  selectedCategory: MealCategory | "all";
  isLoading: boolean;
  isSearchingProducts: boolean;
  error?: string;
  productError?: string;
  addScannedItem: (name: string) => void;
  clearScannedItems: () => void;
  loadMeals: () => Promise<void>;
  removeScannedItem: (id: string) => void;
  scanProductByBarcode: (barcode: string) => Promise<FoodProduct | undefined>;
  searchProducts: (query: string) => Promise<void>;
  setCategory: (category: MealCategory | "all") => void;
};

function mergeProducts(products: FoodProduct[], product: FoodProduct) {
  if (products.some((item) => item.id === product.id)) {
    return products;
  }

  return [product, ...products];
}

function estimatePrice(name: string) {
  const base = Array.from(name.toLowerCase()).reduce((total, character) => total + character.charCodeAt(0), 0);

  return Math.round((45 + (base % 180)) * 100) / 100;
}

function withEstimatedPrice(product: FoodProduct) {
  return {
    ...product,
    estimatedPrice: product.estimatedPrice ?? estimatePrice(product.name)
  };
}

export const useMealStore = create<MealState>()(
  persist(
    (set) => ({
      meals: [],
      products: [],
      scannedProduct: undefined,
      scannedProducts: [],
      selectedCategory: "all",
      isLoading: false,
      isSearchingProducts: false,
      error: undefined,
      productError: undefined,
      addScannedItem: (name) => {
        const trimmedName = name.trim();

        if (!trimmedName) {
          return;
        }

        const product: FoodProduct = withEstimatedPrice({
          id: `manual-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: trimmedName
        });

        set((state) => ({
          products: mergeProducts(state.products, product),
          scannedProduct: product,
          scannedProducts: mergeProducts(state.scannedProducts, product),
          productError: undefined
        }));
      },
      clearScannedItems: () =>
        set((state) => {
          const scannedIds = new Set(state.scannedProducts.map((product) => product.id));

          return {
            products: state.products.filter((product) => !scannedIds.has(product.id)),
            scannedProduct: undefined,
            scannedProducts: []
          };
        }),
      removeScannedItem: (id) =>
        set((state) => {
          const scannedProducts = state.scannedProducts.filter((product) => product.id !== id);
          const products = state.products.filter((product) => product.id !== id);

          return {
            products,
            scannedProduct: scannedProducts[0],
            scannedProducts
          };
        }),
      setCategory: (category) => set({ selectedCategory: category }),
      searchProducts: async (query) => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
          set({ products: [], productError: undefined });
          return;
        }

        set({ isSearchingProducts: true, productError: undefined, scannedProduct: undefined });

        try {
          const products = await searchSpoonacularProducts(trimmedQuery);

          set({
            products,
            scannedProduct: products[0],
            isSearchingProducts: false,
            productError: products.length ? undefined : "No packaged foods found for that search."
          });
        } catch {
          set({
            products: [],
            isSearchingProducts: false,
            productError: "Spoonacular could not be reached. Check your API key and try again."
          });
        }
      },
      scanProductByBarcode: async (barcode) => {
        set({ isSearchingProducts: true, productError: undefined });

        try {
          const product = await getSpoonacularProductByBarcode(barcode);

          if (!product) {
            set({
              isSearchingProducts: false,
              productError: "That barcode was not found in Spoonacular."
            });
            return undefined;
          }

          const pricedProduct = withEstimatedPrice(product);

          set((state) => ({
            products: mergeProducts(state.products, pricedProduct),
            scannedProduct: pricedProduct,
            scannedProducts: mergeProducts(state.scannedProducts, pricedProduct),
            isSearchingProducts: false,
            productError: undefined
          }));
          return pricedProduct;
        } catch {
          set({
            isSearchingProducts: false,
            productError: "Spoonacular could not read that barcode. Check your API key and try again."
          });
          return undefined;
        }
      },
      loadMeals: async () => {
        set({ isLoading: true, error: undefined });

        try {
          const meals = await searchSpoonacularMeals();

          set({
            meals,
            isLoading: false,
            error: meals.length ? undefined : "No Spoonacular recipes found."
          });
        } catch {
          set({
            meals: [],
            isLoading: false,
            error: "Spoonacular recipes could not be loaded. Check your API key and try again."
          });
        }
      }
    }),
    {
      name: "toddler-meal-store-v2",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        scannedProducts: state.scannedProducts
      })
    }
  )
);
