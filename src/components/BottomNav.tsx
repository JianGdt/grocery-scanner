import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type NavItem = {
  id: AppTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type AppTab = "home" | "cart" | "scanner" | "saves" | "profile";

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "cart", label: "Cart", icon: "cart-outline" },
  { id: "scanner", label: "Scan", icon: "scan-outline" },
  { id: "saves", label: "Saved", icon: "heart-outline" },
  { id: "profile", label: "Profile", icon: "person-outline" }
];

type Props = {
  selectedTab: AppTab;
  onSelect: (tab: AppTab) => void;
};

export function BottomNav({ selectedTab, onSelect }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 px-7 pb-5">
      <View className="h-20 flex-row items-center justify-between rounded-full bg-white px-5 shadow-lg shadow-black/10">
        {navItems.map((item) => (
          <BottomNavItem isActive={selectedTab === item.id} key={item.label} item={item} onPress={() => onSelect(item.id)} />
        ))}
      </View>
    </View>
  );
}

function BottomNavItem({ isActive, item, onPress }: { isActive: boolean; item: NavItem; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        className={`h-14 min-w-12 items-center justify-center rounded-full ${item.id === "scanner" ? "w-14 bg-[#160825]" : ""}`}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 16, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
      >
        <Ionicons name={item.icon} size={item.id === "scanner" ? 25 : 22} color={item.id === "scanner" ? "white" : isActive ? "#2edd62" : "#b7b4b0"} />
        {item.id === "scanner" ? null : (
          <Text className={`mt-1 text-[10px] font-bold ${isActive ? "text-[#2edd62]" : "text-[#b7b4b0]"}`}>
            {item.label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
