import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, Layout } from "react-native-reanimated";
import type { Meal } from "@/types/meal";

const categoryTheme: Record<Meal["category"], { bg: string; badge: string; icon: keyof typeof Ionicons.glyphMap }> = {
  vegetable: { bg: "bg-[#fee392]", badge: "bg-[#9eeeb0] text-[#28624a]", icon: "leaf-outline" },
  meat: { bg: "bg-[#fee392]", badge: "bg-[#9eeeb0] text-[#28624a]", icon: "restaurant-outline" },
  fish: { bg: "bg-[#9fe2d9]", badge: "bg-[#fee392] text-[#8a6a00]", icon: "fish-outline" },
  healthy: { bg: "bg-[#ffcfc5]", badge: "bg-[#9eeeb0] text-[#28624a]", icon: "heart-outline" }
};

type Props = {
  meal: Meal;
  onPress?: (meal: Meal) => void;
  variant?: "list" | "tile";
};

export function MealCard({ meal, onPress, variant = "tile" }: Props) {
  const theme = categoryTheme[meal.category];

  if (variant === "list") {
    return (
      <Animated.View
        entering={FadeInUp.duration(260).springify().damping(18)}
        layout={Layout.springify().damping(18).stiffness(140)}
        className={`h-32 w-full overflow-hidden rounded-lg ${theme.bg}`}
      >
        <View className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/30" />
        <View className="absolute -top-8 left-24 h-16 w-16 rounded-full bg-white/35" />
        <View className="absolute -bottom-5 right-24 h-16 w-16 rounded-full bg-white/30" />

        <Pressable accessibilityRole="button" className="h-full flex-row items-center px-4" onPress={() => onPress?.(meal)}>
          <View className="flex-1 pr-3">
            <Text className="text-base font-black leading-5 text-[#160825]" numberOfLines={2}>
              {meal.title}
            </Text>
            <View className="mt-2 self-start rounded-full bg-white/50 px-3 py-1">
              <Text className="text-xs font-black text-[#28624a]">{meal.prepMinutes} MIN</Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Text className="text-xs font-black text-[#160825]">Recipe</Text>
              <Ionicons name="chevron-forward-circle-outline" size={14} color="#160825" />
            </View>
          </View>

          <View className="h-24 w-24 items-center justify-center rounded-full bg-white/55">
            {meal.imageUrl ? (
              <Image accessibilityLabel={meal.title} className="h-20 w-20 rounded-full" resizeMode="cover" source={{ uri: meal.imageUrl }} />
            ) : (
              <Ionicons name={theme.icon} size={40} color="#160825" />
            )}
          </View>

          <View className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-md bg-white/35">
            <Ionicons name="bookmark-outline" size={15} color="#fffaf0" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(260).springify().damping(18)}
      layout={Layout.springify().damping(18).stiffness(140)}
      className="w-72 overflow-hidden rounded-[28px] bg-[#fffaf0]"
    >
      <Pressable accessibilityRole="button" className="h-40" onPress={() => onPress?.(meal)}>
        {meal.imageUrl ? (
          <Image accessibilityLabel={meal.title} className="h-full w-full" resizeMode="cover" source={{ uri: meal.imageUrl }} />
        ) : (
          <View className="h-full w-full items-center justify-center bg-[#ddfee2]">
            <Ionicons name={theme.icon} size={56} color="#28624a" />
          </View>
        )}
        <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-[#fffaf0]/95 px-3 py-1.5">
          <Ionicons name="time-outline" size={14} color="#28624a" />
          <Text className="ml-1 text-xs font-black text-[#28624a]">{meal.prepMinutes} MIN</Text>
        </View>
        <View className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-[#fffaf0]/95">
          <Ionicons name="bookmark-outline" size={18} color="#160825" />
        </View>
      </Pressable>

      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-black leading-6 text-[#160825]">{meal.title}</Text>
            <Text className="mt-1 text-xs font-semibold text-slate-500">{meal.ageRange}</Text>
          </View>
          <Text className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${theme.badge}`}>{meal.category}</Text>
        </View>

        <View className="my-3 h-px bg-[#e8ddcc]" />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name={theme.icon} size={15} color="#675f55" />
            <Text className="ml-1 text-xs font-bold text-[#675f55]">{meal.ingredients.length} ingredients</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="nutrition-outline" size={15} color="#675f55" />
            <Text className="ml-1 text-xs font-bold text-[#675f55]">Toddler-aware</Text>
          </View>
        </View>

        <Text className="mt-3 text-sm leading-5 text-[#675f55]" numberOfLines={3}>
          {meal.nutrition}
        </Text>

        {meal.allergyNote ? (
          <View className="mt-3 rounded-2xl bg-amber-50 px-3 py-2">
            <Text className="text-xs font-semibold leading-4 text-amber-800">{meal.allergyNote}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
