import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { FoodProduct, GroceryStoreId } from "@/types/meal";

export type GroceryPriceRecord = {
  barcode?: string;
  brand?: string;
  name: string;
  price: number;
  storeId: GroceryStoreId;
  updatedAt?: unknown;
};

function productKey(product: Pick<FoodProduct, "barcode" | "name">) {
  return product.barcode ?? product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function priceDocId(storeId: GroceryStoreId, product: Pick<FoodProduct, "barcode" | "name">) {
  return `${storeId}_${productKey(product)}`;
}

export async function getCloudGroceryPrice(storeId: GroceryStoreId, product: Pick<FoodProduct, "barcode" | "name">) {
  const db = getFirebaseDb();

  if (!db) {
    return undefined;
  }

  const snapshot = await getDoc(doc(db, "grocery_prices", priceDocId(storeId, product)));

  if (!snapshot.exists()) {
    return undefined;
  }

  const data = snapshot.data() as Partial<GroceryPriceRecord>;

  return typeof data.price === "number" ? data.price : undefined;
}

export async function saveCloudGroceryPrice(storeId: GroceryStoreId, product: FoodProduct, price: number) {
  const db = getFirebaseDb();

  if (!db) {
    return;
  }

  await setDoc(
    doc(db, "grocery_prices", priceDocId(storeId, product)),
    {
      barcode: product.barcode,
      brand: product.brand,
      name: product.name,
      price,
      storeId,
      updatedAt: serverTimestamp()
    } satisfies GroceryPriceRecord,
    { merge: true }
  );
}
