import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCloudGroceryPrice, saveCloudGroceryPrice } from "@/lib/groceryPriceDb";
import { getProductByBarcode } from "@/lib/products";
import type { FoodProduct, GroceryStoreId, Meal, MealCategory } from "@/types/meal";

type StorePriceBook = Record<string, number>;

type MealState = {
  meals: Meal[];
  products: FoodProduct[];
  scannedProduct?: FoodProduct;
  scannedProducts: FoodProduct[];
  savedProductIds: string[];
  selectedCategory: MealCategory | "all";
  selectedGroceryStore: GroceryStoreId;
  storePriceBook: StorePriceBook;
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
  setGroceryStore: (storeId: GroceryStoreId) => void;
  toggleSavedItem: (id: string) => void;
  updateScannedItemPrice: (id: string, price: string) => void;
};

function mergeProducts(products: FoodProduct[], product: FoodProduct) {
  if (products.some((item) => item.id === product.id)) {
    return products;
  }

  return [product, ...products];
}

function priceBookKey(storeId: GroceryStoreId, product: Pick<FoodProduct, "barcode" | "name">) {
  const productKey = product.barcode ?? product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return `${storeId}:${productKey}`;
}

function withStorePrice(product: FoodProduct, storeId: GroceryStoreId, priceBook: StorePriceBook, cloudPrice?: number): FoodProduct {
  const savedPrice = cloudPrice ?? priceBook[priceBookKey(storeId, product)];

  return {
    ...product,
    estimatedPrice: savedPrice,
    priceSource: savedPrice === undefined ? undefined : cloudPrice === undefined ? "saved" : "cloud",
    priceStoreId: storeId
  };
}

function parsePrice(price: string) {
  const value = Number(price.replace(/[^\d.]/g, ""));

  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : undefined;
}

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      meals: [],
      products: [],
      scannedProduct: undefined,
      scannedProducts: [],
      savedProductIds: [],
      selectedCategory: "all",
      selectedGroceryStore: "puregold",
      storePriceBook: {},
      isLoading: false,
      isSearchingProducts: false,
      error: undefined,
      productError: undefined,
      addScannedItem: (name) => {
        const trimmedName = name.trim();

        if (!trimmedName) {
          return;
        }

        set((state) => {
          const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const product = withStorePrice(
            {
              id: `manual-${state.selectedGroceryStore}-${slug}`,
              name: trimmedName
            },
            state.selectedGroceryStore,
            state.storePriceBook
          );

          return {
            products: mergeProducts(state.products, product),
            scannedProduct: product,
            scannedProducts: mergeProducts(state.scannedProducts, product),
            productError: undefined
          };
        });
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
      setGroceryStore: (storeId) =>
        set((state) => ({
          selectedGroceryStore: storeId,
          scannedProducts: state.scannedProducts.map((product) => withStorePrice(product, storeId, state.storePriceBook)),
          scannedProduct: state.scannedProduct ? withStorePrice(state.scannedProduct, storeId, state.storePriceBook) : undefined
        })),
      toggleSavedItem: (id) =>
        set((state) => ({
          savedProductIds: state.savedProductIds.includes(id)
            ? state.savedProductIds.filter((savedId) => savedId !== id)
            : [id, ...state.savedProductIds]
        })),
      searchProducts: async (query) => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
          set({ products: [], productError: undefined });
          return;
        }

        set((state) => {
          const products = state.scannedProducts.filter((product) => {
            const text = `${product.name} ${product.brand ?? ""} ${product.barcode ?? ""}`.toLowerCase();

            return text.includes(trimmedQuery.toLowerCase());
          });

          return {
            products,
            scannedProduct: products[0],
            isSearchingProducts: false,
            productError: products.length ? undefined : "No saved grocery items found for that search."
          };
        });
      },
      scanProductByBarcode: async (barcode) => {
        set({ isSearchingProducts: true, productError: undefined });

        try {
          const product = await getProductByBarcode(barcode);

          if (!product) {
            set({
              isSearchingProducts: false,
              productError: "No product details found for that barcode. You can type the item name manually."
            });
            return undefined;
          }

          let cloudPrice: number | undefined;

          try {
            cloudPrice = await getCloudGroceryPrice(get().selectedGroceryStore, product);
          } catch {
            cloudPrice = undefined;
          }

          const pricedProduct = withStorePrice(product, get().selectedGroceryStore, get().storePriceBook, cloudPrice);

          set((state) => ({
            products: mergeProducts(state.products, pricedProduct),
            scannedProduct: pricedProduct,
            scannedProducts: mergeProducts(state.scannedProducts, pricedProduct),
            storePriceBook:
              cloudPrice === undefined
                ? state.storePriceBook
                : {
                    ...state.storePriceBook,
                    [priceBookKey(state.selectedGroceryStore, product)]: cloudPrice
                  },
            isSearchingProducts: false,
            productError: undefined
          }));
          return pricedProduct;
        } catch (error) {
          set({
            isSearchingProducts: false,
            productError: error instanceof Error ? error.message : "Barcode lookup is temporarily unavailable. Type the item manually for now."
          });
          return undefined;
        }
      },
      updateScannedItemPrice: (id, price) => {
        const parsedPrice = parsePrice(price);

        set((state) => {
          const product = state.scannedProducts.find((item) => item.id === id);

          if (!product) {
            return state;
          }

          const key = priceBookKey(state.selectedGroceryStore, product);
          const storePriceBook = { ...state.storePriceBook };

          if (parsedPrice === undefined) {
            delete storePriceBook[key];
          } else {
            storePriceBook[key] = parsedPrice;
          }

          const updateProduct = (item: FoodProduct): FoodProduct =>
            item.id === id
              ? {
                  ...item,
                  estimatedPrice: parsedPrice,
                  priceSource: parsedPrice === undefined ? undefined : "manual",
                  priceStoreId: state.selectedGroceryStore
                }
              : item;

          const scannedProducts = state.scannedProducts.map(updateProduct);
          const products = state.products.map(updateProduct);

          return {
            products,
            scannedProduct: state.scannedProduct?.id === id ? updateProduct(state.scannedProduct) : state.scannedProduct,
            scannedProducts,
            storePriceBook
          };
        });

        const product = get().scannedProducts.find((item) => item.id === id);

        if (product && parsedPrice !== undefined) {
          void saveCloudGroceryPrice(get().selectedGroceryStore, product, parsedPrice);
        }
      },
      loadMeals: async () => {
        set({ meals: [], isLoading: false, error: undefined });
      }
    }),
    {
      name: "toddler-meal-store-v3",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        selectedGroceryStore: state.selectedGroceryStore,
        savedProductIds: state.savedProductIds,
        scannedProducts: state.scannedProducts,
        storePriceBook: state.storePriceBook
      })
    }
  )
);
