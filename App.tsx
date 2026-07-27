import "./global.css";

import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import Animated, { FadeIn, Layout, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppTab, BottomNav } from "@/components/BottomNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MealCard } from "@/components/MealCard";
import { ProductCard } from "@/components/ProductCard";
import { getMealsRelatedToProduct, getMealsRelatedToProducts } from "@/lib/recommendMeals";
import { useMealStore } from "@/store/useMealStore";
import type { FoodProduct, Meal } from "@/types/meal";

const nutritionItems: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Protein", value: "250g", icon: "nutrition-outline" },
  { label: "Fat", value: "25g", icon: "fish-outline" },
  { label: "Carbo", value: "80g", icon: "egg-outline" },
  { label: "Calories", value: "150g", icon: "flame-outline" }
] as const;

export default function App() {
  const {
    addScannedItem,
    clearScannedItems,
    error,
    isLoading,
    isSearchingProducts,
    loadMeals,
    meals,
    productError,
    products,
    removeScannedItem,
    scanProductByBarcode,
    scannedProduct,
    scannedProducts,
    searchProducts,
    selectedCategory,
    setCategory
  } = useMealStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [manualScannerItem, setManualScannerItem] = useState("");
  const [suggestedProducts, setSuggestedProducts] = useState<FoodProduct[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [selectedTab, setSelectedTab] = useState<AppTab>("home");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const searchButtonScale = useSharedValue(1);
  const detailImageScale = useSharedValue(0.86);
  const searchButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchButtonScale.value }]
  }));
  const detailImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: detailImageScale.value }]
  }));

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  const filteredMeals = useMemo(
    () => meals.filter((meal) => selectedCategory === "all" || meal.category === selectedCategory),
    [meals, selectedCategory]
  );

  const relatedMeals = useMemo(() => {
    if (suggestedProducts.length) {
      return getMealsRelatedToProducts(suggestedProducts, meals);
    }

    return getMealsRelatedToProduct(scannedProduct ?? products[0], meals);
  }, [meals, products, scannedProduct, scannedProducts, suggestedProducts]);
  const groceryTotal = useMemo(
    () => scannedProducts.reduce((total, product) => total + (product.estimatedPrice ?? 0), 0),
    [scannedProducts]
  );

  const handleSearch = () => {
    setSuggestedProducts([]);
    void searchProducts(searchQuery);
  };

  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();

      if (!permission.granted) {
        return;
      }
    }

    setHasScanned(false);
    setSuggestedProducts([]);
    setIsScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned) {
      return;
    }

    setHasScanned(true);
    void scanProductByBarcode(result.data).then((product) => {
      if (product) {
        setSearchQuery(product.name);
      }

      setTimeout(() => {
        setHasScanned(false);
      }, 1400);
    });
  };

  const handleAddManualScannerItem = () => {
    addScannedItem(manualScannerItem);
    setManualScannerItem("");
  };

  const handleSuggestFromScans = () => {
    setSuggestedProducts(scannedProducts);
    setIsScannerOpen(false);
    setSelectedTab("home");
  };

  const handleOpenMeal = (meal: Meal) => {
    detailImageScale.value = 0.86;
    setSelectedMeal(meal);
    detailImageScale.value = withSpring(1, { damping: 15, stiffness: 160 });
  };

  const handleSelectTab = (tab: AppTab) => {
    if (tab === "scanner") {
      void handleOpenScanner();
      return;
    }

    setSelectedTab(tab);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="flex-1">
        {selectedTab === "cart" ? (
          <ScrollView className="flex-1" contentContainerClassName="px-7 pb-28 pt-8" showsVerticalScrollIndicator={false}>
            <View className="mb-7 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-black text-[#160825]">Grocery List</Text>
                <Text className="mt-1 text-sm font-semibold text-[#675f55]">Scanned items and estimated total</Text>
              </View>
              <Pressable accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-[#ddfee2]" onPress={handleOpenScanner}>
                <Ionicons name="scan-outline" size={21} color="#28624a" />
              </Pressable>
            </View>

            <View className="rounded-[28px] bg-[#160825] p-5">
              <Text className="text-sm font-bold text-[#d9cfc0]">Estimated total</Text>
              <Text className="mt-2 text-4xl font-black text-white">PHP {groceryTotal.toFixed(2)}</Text>
              <Text className="mt-2 text-xs font-semibold text-[#d9cfc0]">
                Prices are local estimates until a store price source is connected.
              </Text>
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-base font-black text-[#160825]">Items</Text>
              {scannedProducts.length ? (
                <Pressable accessibilityRole="button" className="rounded-full bg-[#f5ece1] px-4 py-2" onPress={clearScannedItems}>
                  <Text className="text-xs font-black text-[#675f55]">Clear list</Text>
                </Pressable>
              ) : null}
            </View>

            {scannedProducts.length ? (
              <View className="mt-3 gap-3">
                {scannedProducts.map((product) => (
                  <View key={`cart-${product.id}`} className="flex-row items-center rounded-2xl bg-[#fffaf0] p-3">
                    <View className="h-14 w-14 overflow-hidden rounded-2xl bg-[#ddfee2]">
                      {product.imageUrl ? (
                        <Image accessibilityLabel={product.name} className="h-full w-full" resizeMode="cover" source={{ uri: product.imageUrl }} />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Ionicons name="basket-outline" size={24} color="#28624a" />
                        </View>
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-black text-[#160825]" numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text className="mt-1 text-xs font-semibold text-[#675f55]" numberOfLines={1}>
                        {product.brand ?? "Grocery item"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-black text-[#160825]">PHP {(product.estimatedPrice ?? 0).toFixed(2)}</Text>
                      <Pressable accessibilityRole="button" className="mt-2 h-8 w-8 items-center justify-center rounded-full bg-white" onPress={() => removeScannedItem(product.id)}>
                        <Ionicons name="close-outline" size={18} color="#675f55" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="mt-4 rounded-[28px] bg-[#fffaf0] p-5">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#ddfee2]">
                  <Ionicons name="cart-outline" size={26} color="#28624a" />
                </View>
                <Text className="mt-4 text-lg font-black text-[#160825]">Your grocery list is empty</Text>
                <Text className="mt-2 text-sm font-semibold leading-5 text-[#675f55]">
                  Scan grocery barcodes or type items in the scanner modal to start tracking your list and total.
                </Text>
                <Pressable accessibilityRole="button" className="mt-5 h-12 flex-row items-center justify-center rounded-full bg-[#2edd62]" onPress={handleOpenScanner}>
                  <Ionicons name="scan-outline" size={19} color="#160825" />
                  <Text className="ml-2 text-sm font-black text-[#160825]">Open scanner</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-7 pb-28 pt-8" showsVerticalScrollIndicator={false}>
          <View className="mb-7 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#ffe1b7]">
                <Ionicons name="person" size={18} color="#ef5b42" />
              </View>
              <View className="ml-2">
                <Text className="text-xs font-black text-[#160825]">Hi!</Text>
              </View>
            </View>

            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <Ionicons name="ellipsis-horizontal" size={20} color="#160825" />
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(260)} className="mb-6">
            <Text className="max-w-[78%] text-xl font-black leading-7 text-[#160825]">What do you want cooking today!</Text>

            <View className="mt-5 h-12 flex-row items-center rounded-full border border-[#e3d7c4] bg-white px-4">
              <Ionicons name="search-outline" size={18} color="#a4a29e" />
              <TextInput
                className="ml-2 h-11 flex-1 text-sm font-semibold text-[#160825]"
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder="Search..."
                returnKeyType="search"
                value={searchQuery}
              />
              <Animated.View style={searchButtonStyle}>
                <Pressable
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center rounded-full bg-[#160825]"
                  onPress={handleSearch}
                  onPressIn={() => {
                    searchButtonScale.value = withSpring(0.92, { damping: 18, stiffness: 260 });
                  }}
                  onPressOut={() => {
                    searchButtonScale.value = withSpring(1, { damping: 18, stiffness: 260 });
                  }}
                >
                  <Ionicons name="arrow-forward-outline" size={18} color="#fffaf0" />
                </Pressable>
              </Animated.View>
              <Pressable
                accessibilityRole="button"
                className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white"
                onPress={handleOpenScanner}
              >
                <Ionicons name="scan-outline" size={18} color="#a4a29e" />
              </Pressable>
            </View>
          </Animated.View>

          <ScrollView className="-mx-5 mb-4" contentContainerClassName="px-5" horizontal showsHorizontalScrollIndicator={false}>
            <CategoryTabs selected={selectedCategory} onSelect={setCategory} />
          </ScrollView>

          {isLoading ? (
            <View className="mb-4 flex-row items-center rounded-[24px] bg-[#fffaf0] p-4">
              <ActivityIndicator color="#28624a" />
              <Text className="ml-3 text-sm font-semibold text-[#675f55]">Loading meal suggestions...</Text>
            </View>
          ) : null}

          {error ? (
            <View className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 p-3">
              <Text className="text-sm font-semibold text-amber-800">{error}</Text>
            </View>
          ) : null}

          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-base font-black text-[#160825]">Popular Recipe</Text>
            </View>
            <Pressable className="px-2 py-2">
              <Text className="text-xs font-black text-[#2edd62]">See All</Text>
            </Pressable>
          </View>

          <Animated.View
            layout={Layout.springify().damping(18).stiffness(140)}
            className="gap-4"
          >
            {filteredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onPress={handleOpenMeal} variant="list" />
            ))}
          </Animated.View>

          <Animated.View entering={FadeIn.duration(260)} className="mt-7 rounded-[28px] bg-[#fffaf0] p-4">
            <Text className="text-xl font-black text-[#160825]">Scan grocery food</Text>
            <Text className="mt-1 text-sm leading-5 text-[#675f55]">
              Use the one search field above or scan a barcode. The app checks Spoonacular and suggests related toddler meals.
            </Text>

            <Pressable
              accessibilityRole="button"
              className="mt-4 h-12 flex-row items-center justify-center rounded-full bg-[#160825]"
              onPress={handleOpenScanner}
            >
              <Ionicons name="scan-outline" size={20} color="#fffaf0" />
              <Text className="ml-2 text-sm font-black text-[#fffaf0]">Open scanner</Text>
            </Pressable>

            {isSearchingProducts ? (
              <View className="mt-4 flex-row items-center">
                <ActivityIndicator color="#28624a" />
                <Text className="ml-3 text-sm font-semibold text-[#675f55]">Searching Spoonacular...</Text>
              </View>
            ) : null}

            {productError ? (
              <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-sm font-semibold text-amber-800">{productError}</Text>
              </View>
            ) : null}
          </Animated.View>

          {products.length ? (
            <Animated.View layout={Layout.springify().damping(18).stiffness(140)} className="mt-7">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-black text-[#160825]">Product results</Text>
                <Pressable className="px-2 py-2">
                  <Text className="text-xs font-black text-[#160825]">View All</Text>
                </Pressable>
              </View>
              <ScrollView className="-mx-7" contentContainerClassName="gap-4 px-7" horizontal showsHorizontalScrollIndicator={false}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ScrollView>
              <View className="mt-4 flex-row justify-center gap-1.5">
                {products.slice(0, 4).map((product, index) => (
                  <View key={`product-dot-${product.id}`} className={`h-2 rounded-full ${index === 0 ? "w-8 bg-[#160825]" : "w-2 bg-[#d8d8d8]"}`} />
                ))}
              </View>
            </Animated.View>
          ) : null}

          {relatedMeals.length ? (
            <Animated.View entering={FadeIn.duration(260)} className="mt-6">
              <Text className="mb-3 text-2xl font-black text-[#160825]">Related meal ideas</Text>
              <ScrollView className="-mx-5" contentContainerClassName="gap-4 px-5" horizontal showsHorizontalScrollIndicator={false}>
                {relatedMeals.map((meal) => (
                  <MealCard key={`related-${meal.id}`} meal={meal} onPress={handleOpenMeal} />
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}
        </ScrollView>
        )}
        <BottomNav selectedTab={selectedTab} onSelect={handleSelectTab} />

        {selectedMeal ? (
          <Animated.View entering={FadeIn.duration(180)} className="absolute inset-0 z-10 bg-[#c7efe0]">
            <Animated.View style={detailImageStyle} className="absolute left-0 right-0 top-0 h-[42%] overflow-hidden">
              <ImageBackground meal={selectedMeal} />
            </Animated.View>

            <View className="absolute left-7 right-7 top-12 z-20 flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
                onPress={() => setSelectedMeal(undefined)}
              >
                <Ionicons name="chevron-back-outline" size={22} color="#160825" />
              </Pressable>
              <Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons name="ellipsis-horizontal" size={22} color="#160825" />
              </Pressable>
            </View>

            <Animated.View entering={FadeIn.duration(220)} className="absolute bottom-0 left-0 right-0 top-[31%] rounded-t-[32px] bg-white px-7 pb-7 pt-9">
              <View className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#b7b4b0]" />
              <View className="flex-row items-start justify-between gap-4">
                <Text className="flex-1 text-xl font-black leading-6 text-[#160825]">{selectedMeal.title}</Text>
                <View className="rounded-full bg-[#2edd62] px-3 py-1.5">
                  <Text className="text-xs font-black text-white">{selectedMeal.prepMinutes} MIN</Text>
                </View>
              </View>

              <Text className="mt-6 text-base font-black text-[#160825]">Nutritions</Text>
              <View className="mt-4 flex-row justify-between">
                {nutritionItems.map((item) => (
                  <View key={item.label}>
                    <Text className="text-xs font-black text-[#160825]">{item.label}</Text>
                    <View className="mt-2 flex-row items-center">
                      <Ionicons name={item.icon} size={14} color={item.label === "Fat" ? "#ef5b42" : "#f3a400"} />
                      <Text className="ml-1 text-xs font-semibold text-[#160825]">{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text className="mt-7 text-base font-black text-[#160825]">Recipe</Text>
              <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
                {[
                  selectedMeal.servingTip,
                  `Use ${selectedMeal.ingredients.slice(0, 3).join(", ")} as the base.`,
                  selectedMeal.nutrition,
                  selectedMeal.allergyNote ?? "Keep seasoning mild and texture soft for toddler portions.",
                  "Plate in small portions and let it cool before serving."
                ].map((step, index) => (
                  <View key={`${selectedMeal.id}-${index}`} className="flex-row">
                    <View className="w-7 items-center">
                      <View className={`h-3 w-3 rounded-full border-2 ${index === 0 ? "border-[#2edd62]" : "border-[#b7b4b0]"}`} />
                      {index < 4 ? <View className={`h-12 w-px ${index === 0 ? "bg-[#2edd62]" : "bg-[#b7b4b0]"}`} /> : null}
                    </View>
                    <View className="flex-1 pb-4">
                      <Text className="text-sm font-black text-[#160825]">{index + 1} Step</Text>
                      <Text className="mt-1 text-xs font-semibold leading-4 text-[#b7b4b0]">{step}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <Pressable accessibilityRole="button" className="absolute bottom-7 left-1/2 h-12 w-32 -translate-x-1/2 flex-row items-center justify-center rounded-full bg-[#2edd62]">
                <Ionicons name="play-circle-outline" size={19} color="white" />
                <Text className="ml-2 text-sm font-black text-white">Video</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        ) : null}

        {isScannerOpen ? (
          <Animated.View entering={FadeIn.duration(180)} className="absolute inset-0 z-20 bg-[#160825]">
            <CameraView
              active={isScannerOpen}
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              className="flex-1"
              facing="back"
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View className="absolute left-5 right-5 top-12 flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-black text-[#fffaf0]">Scan barcode</Text>
                <Text className="mt-1 text-sm font-semibold text-[#d9cfc0]">Add every grocery item you want to cook with.</Text>
              </View>
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-[#fffaf0]" onPress={() => setIsScannerOpen(false)}>
                <Ionicons name="close-outline" size={24} color="#160825" />
              </Pressable>
            </View>
            <View className="absolute left-10 right-10 top-1/3 h-44 rounded-[28px] border-4 border-[#fffaf0]" />
            <View className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-[#fffaf0] px-5 pb-6 pt-5">
              <View className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#d8cfc1]" />
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-black text-[#160825]">Scanned items</Text>
                  <Text className="mt-1 text-xs font-bold text-[#675f55]">{scannedProducts.length} items ready for suggestions</Text>
                </View>
                {scannedProducts.length ? (
                  <Pressable accessibilityRole="button" className="rounded-full bg-[#f5ece1] px-3 py-2" onPress={clearScannedItems}>
                    <Text className="text-xs font-black text-[#675f55]">Clear</Text>
                  </Pressable>
                ) : null}
              </View>

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
                <Pressable
                  accessibilityRole="button"
                  className="h-8 w-8 items-center justify-center rounded-full bg-[#2edd62]"
                  onPress={handleAddManualScannerItem}
                >
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
                <ScrollView className="mt-4 max-h-36" contentContainerClassName="gap-2" showsVerticalScrollIndicator={false}>
                  {scannedProducts.map((product) => (
                    <View key={product.id} className="flex-row items-center rounded-2xl bg-[#f5ece1] px-3 py-2">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#d8f7de]">
                        <Ionicons name={product.imageUrl ? "checkmark-outline" : "pricetag-outline"} size={18} color="#28624a" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-black text-[#160825]" numberOfLines={1}>
                          {product.name}
                        </Text>
                        {product.brand ? (
                          <Text className="text-xs font-semibold text-[#675f55]" numberOfLines={1}>
                            {product.brand}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        className="h-8 w-8 items-center justify-center rounded-full bg-white"
                        onPress={() => removeScannedItem(product.id)}
                      >
                        <Ionicons name="close-outline" size={18} color="#675f55" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="mt-4 rounded-2xl bg-[#f5ece1] px-3 py-4">
                  <Text className="text-sm font-semibold leading-5 text-[#675f55]">
                    Scan barcodes one by one, or type grocery items like chicken, broccoli, rice, tuna, yogurt.
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                className={`mt-4 h-12 flex-row items-center justify-center rounded-full ${
                  scannedProducts.length ? "bg-[#2edd62]" : "bg-[#d8cfc1]"
                }`}
                disabled={!scannedProducts.length}
                onPress={handleSuggestFromScans}
              >
                <Ionicons name="sparkles-outline" size={19} color="#160825" />
                <Text className="ml-2 text-sm font-black text-[#160825]">Suggest meals</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ImageBackground({ meal }: { meal: Meal }) {
  return <Image accessibilityLabel={meal.title} className="h-full w-full" resizeMode="cover" source={{ uri: meal.imageUrl }} />;
}
