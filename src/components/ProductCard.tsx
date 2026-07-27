import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, Layout } from "react-native-reanimated";
import type { FoodProduct } from "@/types/meal";

function formatPrice(value?: number) {
  return `PHP ${(value ?? 0).toFixed(2)}`;
}

export function ProductCard({ product }: { product: FoodProduct }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(260).springify().damping(18)}
      layout={Layout.springify().damping(18).stiffness(140)}
      className="h-80 w-64 overflow-hidden rounded-[28px] bg-[#ffd735] p-5"
    >
      <View className="absolute right-4 top-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-white/80">
        <Ionicons name="heart-outline" size={20} color="#160825" />
      </View>

      <View className="h-36 items-center justify-center">
        {product.imageUrl ? (
          <Image
            accessibilityLabel={product.name}
            className="h-32 w-40"
            resizeMode="contain"
            source={{ uri: product.imageUrl }}
          />
        ) : (
          <View className="h-28 w-28 items-center justify-center rounded-full bg-white/55">
            <Ionicons name="basket-outline" size={34} color="#28624a" />
          </View>
        )}
      </View>

      <View className="mt-4 flex-1 justify-end">
        <View className="flex-row items-center justify-between">
          <Text className="max-w-[72%] text-xl font-black leading-6 text-[#160825]" numberOfLines={2}>
            {product.name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={16} color="#ff8a00" />
            <Text className="ml-1 text-sm font-black text-[#160825]">4.8</Text>
          </View>
        </View>

        {product.brand ? (
          <Text className="mt-2 text-sm font-semibold text-[#675f55]" numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-2xl font-black text-[#160825]">{formatPrice(product.estimatedPrice)}</Text>
          <Pressable accessibilityRole="button" className="h-12 min-w-28 items-center justify-center rounded-2xl bg-white px-5">
            <Text className="text-sm font-black text-[#160825]">Buy Now</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
