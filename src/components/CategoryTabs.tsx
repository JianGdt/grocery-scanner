import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { MealCategory } from "@/types/meal";

type CategoryOption = {
  label: string;
  value: MealCategory | "all";
  accent: string;
};

const categories: CategoryOption[] = [
  { label: "All", value: "all", accent: "bg-slate-900" },
  { label: "Meat", value: "meat", accent: "bg-carrot" },
  { label: "Noodles", value: "healthy", accent: "bg-salmon" },
  { label: "Vegetable", value: "vegetable", accent: "bg-spinach" },
  { label: "Fish", value: "fish", accent: "bg-blueberry" },
];

type Props = {
  selected: MealCategory | "all";
  onSelect: (category: MealCategory | "all") => void;
};

export function CategoryTabs({ selected, onSelect }: Props) {
  return (
    <View className="flex-row gap-2">
      {categories.map((category) => {
        const isSelected = selected === category.value;

        return (
          <CategoryButton
            isSelected={isSelected}
            key={category.value}
            label={category.label}
            accent={category.accent}
            onPress={() => onSelect(category.value)}
          />
        );
      })}
    </View>
  );
}

type CategoryButtonProps = {
  accent: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function CategoryButton({ accent, isSelected, label, onPress }: CategoryButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`h-9 shrink-0 flex-row items-center rounded-full px-5 ${
              isSelected ? "bg-[#2edd62]" : "bg-[#ddfee2]"
            }`}
            onPress={onPress}
            onPressIn={() => {
              scale.value = withSpring(0.96, { damping: 18, stiffness: 260 });
            }}
            onPressOut={() => {
              scale.value = withSpring(1, { damping: 18, stiffness: 260 });
            }}
          >
            <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-[#160825]"}`}>
              {label}
            </Text>
          </Pressable>
    </Animated.View>
  );
}
