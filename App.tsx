import "./global.css";

import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppTab, BottomNav } from "@/components/BottomNav";
import { askGeminiForFoodSuggestions } from "@/lib/gemini";
import { useMealStore } from "@/store/useMealStore";
import type { FoodProduct, GroceryStoreId } from "@/types/meal";

const groceryStores: { id: GroceryStoreId; label: string }[] = [
  { id: "puregold", label: "Puregold" },
  { id: "sm", label: "SM" }
];

function formatStoreName(storeId: GroceryStoreId) {
  return storeId === "puregold" ? "Puregold" : "SM";
}

function formatPriceInput(value?: number) {
  return value === undefined ? "" : value.toFixed(2);
}

function formatPriceSource(source: FoodProduct["priceSource"]) {
  if (source === "cloud") {
    return "CLOUD";
  }

  if (source === "saved") {
    return "SAVED";
  }

  return undefined;
}

function ProductThumb({ product, size = 56 }: { product: FoodProduct; size?: number }) {
  return (
    <View className="overflow-hidden bg-[#ddfee2]" style={{ borderRadius: 18, height: size, width: size }}>
      {product.imageUrl ? (
        <Image accessibilityLabel={product.name} className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUrl }} />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Ionicons name="basket-outline" size={Math.round(size * 0.44)} color="#28624a" />
        </View>
      )}
    </View>
  );
}

export default function App() {
  const {
    addScannedItem,
    clearScannedItems,
    isSearchingProducts,
    productError,
    removeScannedItem,
    savedProductIds,
    scanProductByBarcode,
    scannedProducts,
    selectedGroceryStore,
    setGroceryStore,
    toggleSavedItem,
    updateScannedItemPrice
  } = useMealStore();
  const [selectedTab, setSelectedTab] = useState<AppTab>("home");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasScannerPermission, setHasScannerPermission] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualScannerItem, setManualScannerItem] = useState("");
  const [scannerError, setScannerError] = useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestionError, setAiSuggestionError] = useState<string | undefined>();
  const [isSuggestingWithAi, setIsSuggestingWithAi] = useState(false);

  useEffect(() => {
    setHasScannerPermission(Boolean(cameraPermission?.granted));
  }, [cameraPermission?.granted]);

  const groceryTotal = useMemo(
    () => scannedProducts.reduce((total, product) => total + (product.estimatedPrice ?? 0), 0),
    [scannedProducts]
  );
  const missingPriceCount = useMemo(
    () => scannedProducts.filter((product) => product.estimatedPrice === undefined).length,
    [scannedProducts]
  );
  const selectedProduct = useMemo(
    () => scannedProducts.find((product) => product.id === selectedProductId),
    [scannedProducts, selectedProductId]
  );

  const handleOpenScanner = async () => {
    setScannerError(undefined);

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        setHasScannerPermission(false);
        setScannerError("Camera permission is required to scan grocery barcodes.");
        setIsScannerOpen(true);
        return;
      }

      setHasScannerPermission(true);
    } else {
      setHasScannerPermission(true);
    }

    setHasScanned(false);
    setIsScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned) {
      return;
    }

    setHasScanned(true);
    void scanProductByBarcode(result.data).then(() => {
      setTimeout(() => {
        setHasScanned(false);
      }, 1400);
    });
  };

  const handleAddManualScannerItem = () => {
    addScannedItem(manualScannerItem);
    setManualScannerItem("");
  };

  const handleAskAiSuggestions = async (products: FoodProduct[]) => {
    setAiSuggestionError(undefined);
    setAiSuggestion("");
    setIsSuggestingWithAi(true);

    try {
      const suggestion = await askGeminiForFoodSuggestions(products, selectedGroceryStore);
      setAiSuggestion(suggestion);
    } catch (error) {
      setAiSuggestionError(error instanceof Error ? error.message : "AI suggestions are unavailable right now.");
    } finally {
      setIsSuggestingWithAi(false);
    }
  };

  const handleSelectTab = (tab: AppTab) => {
    if (tab === "scanner") {
      void handleOpenScanner();
      return;
    }

    setSelectedTab(tab);
  };

  const renderStoreSwitcher = (prefix: string) => (
    <View className="flex-row rounded-full bg-[#f5ece1] p-1">
      {groceryStores.map((store) => (
        <Pressable
          key={`${prefix}-${store.id}`}
          accessibilityRole="button"
          className={`h-10 flex-1 items-center justify-center rounded-full ${selectedGroceryStore === store.id ? "bg-[#2edd62]" : ""}`}
          onPress={() => setGroceryStore(store.id)}
        >
          <Text className={`text-sm font-black ${selectedGroceryStore === store.id ? "text-[#160825]" : "text-[#675f55]"}`}>{store.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderProductRow = (product: FoodProduct) => {
    const priceSource = formatPriceSource(product.priceSource);
    const isSaved = savedProductIds.includes(product.id);

    return (
      <Pressable
        key={product.id}
        accessibilityRole="button"
        className="rounded-[24px] bg-[#fffaf0] p-3"
        onPress={() => {
          setAiSuggestion("");
          setAiSuggestionError(undefined);
          setSelectedProductId(product.id);
        }}
      >
        <View className="flex-row items-center">
          <ProductThumb product={product} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-black text-[#160825]" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-[#675f55]" numberOfLines={1}>
              {product.brand ?? product.barcode ?? "Grocery item"}
            </Text>
            {priceSource ? (
              <View className="mt-2 self-start rounded-full bg-[#ddfee2] px-2 py-1">
                <Text className="text-[10px] font-black text-[#28624a]">{priceSource}</Text>
              </View>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-white" onPress={() => toggleSavedItem(product.id)}>
            <Ionicons name={isSaved ? "heart" : "heart-outline"} size={21} color={isSaved ? "#ef5b42" : "#675f55"} />
          </Pressable>
        </View>
        <View className="mt-3 h-11 flex-row items-center rounded-full border border-[#e3d7c4] bg-white px-3">
          <Text className="text-xs font-black text-[#675f55]">PHP</Text>
          <TextInput
            className="ml-2 h-10 flex-1 text-sm font-black text-[#160825]"
            keyboardType="decimal-pad"
            onChangeText={(price) => updateScannedItemPrice(product.id, price)}
            placeholder={`${formatStoreName(selectedGroceryStore)} price`}
            value={formatPriceInput(product.estimatedPrice)}
          />
          <Pressable accessibilityRole="button" className="h-8 w-8 items-center justify-center rounded-full bg-[#f5ece1]" onPress={() => removeScannedItem(product.id)}>
            <Ionicons name="trash-outline" size={17} color="#675f55" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor={isScannerOpen ? "#160825" : "#ffffff"} style={isScannerOpen ? "light" : "dark"} />
      <View className="flex-1">
        {selectedTab === "home" ? (
          <ScrollView className="flex-1" contentContainerClassName="px-7 pb-28 pt-8" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(220)} className="rounded-[28px] bg-[#160825] p-5">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#2edd62]">
                <Ionicons name="scan-outline" size={28} color="#160825" />
              </View>
              <Text className="mt-5 text-3xl font-black leading-9 text-white">Scan your groceries</Text>
              <Text className="mt-2 text-sm font-semibold leading-5 text-[#d9cfc0]">
                Pick a store, scan items, add prices, and keep a running total for your trip.
              </Text>
              <Pressable accessibilityRole="button" className="mt-6 h-14 flex-row items-center justify-center rounded-full bg-[#2edd62]" onPress={handleOpenScanner}>
                <Ionicons name="barcode-outline" size={22} color="#160825" />
                <Text className="ml-2 text-base font-black text-[#160825]">Open scanner</Text>
              </Pressable>
            </Animated.View>

            <View className="mt-5">{renderStoreSwitcher("home-store")}</View>

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1 rounded-[24px] bg-[#fffaf0] p-4">
                <Text className="text-xs font-black text-[#675f55]">ITEMS</Text>
                <Text className="mt-2 text-3xl font-black text-[#160825]">{scannedProducts.length}</Text>
              </View>
              <View className="flex-1 rounded-[24px] bg-[#fffaf0] p-4">
                <Text className="text-xs font-black text-[#675f55]">TOTAL</Text>
                <Text className="mt-2 text-2xl font-black text-[#160825]">PHP {groceryTotal.toFixed(2)}</Text>
              </View>
            </View>

            {productError ? (
              <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-sm font-semibold text-amber-800">{productError}</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {selectedTab === "cart" ? (
          <ScrollView className="flex-1" contentContainerClassName="px-7 pb-28 pt-8" showsVerticalScrollIndicator={false}>
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-black text-[#160825]">Grocery Cart</Text>
                <Text className="mt-1 text-sm font-semibold text-[#675f55]">{formatStoreName(selectedGroceryStore)} scanned list</Text>
              </View>
              <Pressable accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-[#ddfee2]" onPress={handleOpenScanner}>
                <Ionicons name="scan-outline" size={21} color="#28624a" />
              </Pressable>
            </View>

            <View className="rounded-[28px] bg-[#160825] p-5">
              <Text className="text-sm font-bold text-[#d9cfc0]">Running total</Text>
              <Text className="mt-2 text-4xl font-black text-white">PHP {groceryTotal.toFixed(2)}</Text>
              <Text className="mt-2 text-xs font-semibold text-[#d9cfc0]">
                {missingPriceCount ? `${missingPriceCount} item${missingPriceCount === 1 ? "" : "s"} still need a price.` : "All scanned items have prices."}
              </Text>
            </View>

            <View className="mt-4">{renderStoreSwitcher("cart-store")}</View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-base font-black text-[#160825]">Scanned items</Text>
              {scannedProducts.length ? (
                <Pressable accessibilityRole="button" className="rounded-full bg-[#f5ece1] px-4 py-2" onPress={clearScannedItems}>
                  <Text className="text-xs font-black text-[#675f55]">Clear list</Text>
                </Pressable>
              ) : null}
            </View>

            {scannedProducts.length ? (
              <View className="mt-3 gap-3">{scannedProducts.map(renderProductRow)}</View>
            ) : (
              <View className="mt-4 rounded-[28px] bg-[#fffaf0] p-5">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#ddfee2]">
                  <Ionicons name="cart-outline" size={26} color="#28624a" />
                </View>
                <Text className="mt-4 text-lg font-black text-[#160825]">Your grocery cart is empty</Text>
                <Text className="mt-2 text-sm font-semibold leading-5 text-[#675f55]">Use the Home scanner to add Puregold or SM grocery items.</Text>
              </View>
            )}
          </ScrollView>
        ) : null}

        <BottomNav selectedTab={selectedTab} onSelect={handleSelectTab} />

        <Modal animationType="slide" transparent visible={Boolean(selectedProduct)} onRequestClose={() => setSelectedProductId(undefined)}>
          <View className="flex-1 justify-end bg-black/45">
            {selectedProduct ? (
              <View className="max-h-[86%] rounded-t-[32px] bg-white px-6 pb-8 pt-5">
                <View className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#d8cfc1]" />
                <View className="flex-row items-start">
                  <ProductThumb product={selectedProduct} size={78} />
                  <View className="ml-4 flex-1">
                    <Text className="text-xl font-black leading-6 text-[#160825]">{selectedProduct.name}</Text>
                    <Text className="mt-1 text-sm font-semibold text-[#675f55]">{selectedProduct.brand ?? "Grocery item"}</Text>
                  </View>
                  <Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-[#f5ece1]" onPress={() => toggleSavedItem(selectedProduct.id)}>
                    <Ionicons name={savedProductIds.includes(selectedProduct.id) ? "heart" : "heart-outline"} size={22} color={savedProductIds.includes(selectedProduct.id) ? "#ef5b42" : "#675f55"} />
                  </Pressable>
                </View>

                <View className="mt-5 rounded-[24px] bg-[#fffaf0] p-4">
                  <Text className="text-xs font-black text-[#675f55]">{formatStoreName(selectedGroceryStore)} price</Text>
                  <View className="mt-2 h-12 flex-row items-center rounded-full border border-[#e3d7c4] bg-white px-4">
                    <Text className="text-sm font-black text-[#675f55]">PHP</Text>
                    <TextInput
                      className="ml-2 h-11 flex-1 text-lg font-black text-[#160825]"
                      keyboardType="decimal-pad"
                      onChangeText={(price) => updateScannedItemPrice(selectedProduct.id, price)}
                      placeholder="0.00"
                      value={formatPriceInput(selectedProduct.estimatedPrice)}
                    />
                  </View>
                  {selectedProduct.barcode ? <Text className="mt-3 text-xs font-bold text-[#a4a29e]">Barcode {selectedProduct.barcode}</Text> : null}
                  {selectedProduct.ingredientsText ? (
                    <Text className="mt-3 text-xs font-semibold leading-4 text-[#675f55]" numberOfLines={4}>
                      {selectedProduct.ingredientsText}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  className={`mt-4 h-12 flex-row items-center justify-center rounded-full ${isSuggestingWithAi ? "bg-[#d8cfc1]" : "bg-[#2edd62]"}`}
                  disabled={isSuggestingWithAi}
                  onPress={() => void handleAskAiSuggestions([selectedProduct])}
                >
                  {isSuggestingWithAi ? <ActivityIndicator color="#160825" /> : <Ionicons name="sparkles-outline" size={19} color="#160825" />}
                  <Text className="ml-2 text-sm font-black text-[#160825]">{isSuggestingWithAi ? "Asking AI" : "Suggest food with AI"}</Text>
                </Pressable>

                {aiSuggestionError ? (
                  <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <Text className="text-sm font-semibold leading-5 text-amber-800">{aiSuggestionError}</Text>
                  </View>
                ) : null}

                {aiSuggestion ? (
                  <ScrollView className="mt-4 max-h-52 rounded-2xl bg-[#f5ece1] px-3 py-3">
                    <Text className="text-sm font-semibold leading-5 text-[#160825]">{aiSuggestion}</Text>
                  </ScrollView>
                ) : null}

                <Pressable accessibilityRole="button" className="mt-4 h-11 items-center justify-center rounded-full bg-[#160825]" onPress={() => setSelectedProductId(undefined)}>
                  <Text className="text-sm font-black text-white">Close</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Modal>

        <Modal
          animationType="fade"
          hardwareAccelerated
          onRequestClose={() => setIsScannerOpen(false)}
          presentationStyle="fullScreen"
          statusBarTranslucent
          transparent={false}
          visible={isScannerOpen}
        >
          <View style={styles.scannerModal}>
            {hasScannerPermission && !scannerError ? (
              <CameraView
                active={isScannerOpen}
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                onMountError={() => setScannerError("Camera preview could not be opened on this device.")}
                ratio="16:9"
                style={styles.cameraPreview}
              />
            ) : (
              <View className="items-center justify-center px-8" style={styles.scannerUnavailable}>
                <View className="rounded-[28px] bg-[#fffaf0] p-5">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#ddfee2]">
                    <Ionicons name="camera-outline" size={28} color="#28624a" />
                  </View>
                  <Text className="mt-4 text-lg font-black text-[#160825]">Camera unavailable</Text>
                  <Text className="mt-2 text-sm font-semibold leading-5 text-[#675f55]">
                    {scannerError ?? "Allow camera permission, then reopen the scanner."}
                  </Text>
                  <Pressable accessibilityRole="button" className="mt-5 h-11 items-center justify-center rounded-full bg-[#160825]" onPress={handleOpenScanner}>
                    <Text className="text-sm font-black text-white">Try again</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View className="flex-row items-center justify-between" style={styles.scannerHeader}>
              <View>
                <Text className="text-xl font-black text-[#fffaf0]">Scan barcode</Text>
                <Text className="mt-1 text-sm font-semibold text-[#d9cfc0]">Add every grocery item to your cart.</Text>
              </View>
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-[#fffaf0]" onPress={() => setIsScannerOpen(false)}>
                <Ionicons name="close-outline" size={24} color="#160825" />
              </Pressable>
            </View>
            <View className="rounded-[28px] border-4 border-[#fffaf0]" style={styles.scanFrame} />
            <View className="rounded-t-[32px] bg-[#fffaf0] px-5 pb-6 pt-5" style={styles.scannerSheet}>
              <View className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#d8cfc1]" />
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-black text-[#160825]">Scanned items</Text>
                  <Text className="mt-1 text-xs font-bold text-[#675f55]">
                    {formatStoreName(selectedGroceryStore)} · {scannedProducts.length} items · PHP {groceryTotal.toFixed(2)}
                  </Text>
                </View>
                {scannedProducts.length ? (
                  <Pressable accessibilityRole="button" className="rounded-full bg-[#f5ece1] px-3 py-2" onPress={clearScannedItems}>
                    <Text className="text-xs font-black text-[#675f55]">Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="mt-4">{renderStoreSwitcher("scanner-store")}</View>

              <View className="mt-4 h-11 flex-row items-center rounded-full border border-[#e3d7c4] px-4">
                <Ionicons name="basket-outline" size={18} color="#675f55" />
                <TextInput
                  className="ml-2 h-10 flex-1 text-sm font-semibold text-[#160825]"
                  onChangeText={setManualScannerItem}
                  onSubmitEditing={handleAddManualScannerItem}
                  placeholder="Type an item if barcode is missing"
                  returnKeyType="done"
                  value={manualScannerItem}
                />
                <Pressable accessibilityRole="button" className="h-8 w-8 items-center justify-center rounded-full bg-[#2edd62]" onPress={handleAddManualScannerItem}>
                  <Ionicons name="add-outline" size={20} color="#160825" />
                </Pressable>
              </View>

              {isSearchingProducts ? (
                <View className="mt-4 flex-row items-center rounded-2xl bg-[#f5ece1] px-3 py-3">
                  <ActivityIndicator color="#28624a" />
                  <Text className="ml-3 text-sm font-black text-[#160825]">Finding product...</Text>
                </View>
              ) : null}

              {productError ? (
                <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <Text className="text-sm font-semibold text-amber-800">{productError}</Text>
                </View>
              ) : null}

              {scannedProducts.length ? (
                <ScrollView className="mt-4 max-h-48" contentContainerClassName="gap-2" showsVerticalScrollIndicator={false}>
                  {scannedProducts.slice(0, 4).map((product) => (
                    <View key={`scanner-${product.id}`} className="flex-row items-center rounded-2xl bg-[#f5ece1] px-3 py-2">
                      <ProductThumb product={product} size={40} />
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-black text-[#160825]" numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text className="text-xs font-semibold text-[#675f55]" numberOfLines={1}>
                          {product.estimatedPrice === undefined ? "Add price in Cart" : `PHP ${product.estimatedPrice.toFixed(2)}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="mt-4 rounded-2xl bg-[#f5ece1] px-3 py-4">
                  <Text className="text-sm font-semibold leading-5 text-[#675f55]">Scan barcodes one by one, or type a grocery item manually.</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                className={`mt-4 h-12 flex-row items-center justify-center rounded-full ${scannedProducts.length ? "bg-[#2edd62]" : "bg-[#d8cfc1]"}`}
                disabled={!scannedProducts.length}
                onPress={() => {
                  setIsScannerOpen(false);
                  setSelectedTab("cart");
                }}
              >
                <Ionicons name="cart-outline" size={19} color="#160825" />
                <Text className="ml-2 text-sm font-black text-[#160825]">View cart</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%"
  },
  scannerHeader: {
    left: 20,
    position: "absolute",
    right: 20,
    top: 48,
    zIndex: 3
  },
  scannerModal: {
    backgroundColor: "#160825",
    elevation: 20,
    flex: 1,
    height: "100%",
    overflow: "hidden",
    width: "100%",
    zIndex: 20
  },
  scannerSheet: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 3
  },
  scannerUnavailable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  },
  scanFrame: {
    height: 176,
    left: 40,
    position: "absolute",
    right: 40,
    top: "33%",
    zIndex: 2
  }
});
