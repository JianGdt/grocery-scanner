/// <reference types="nativewind/types" />

import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface ImagePropsBase {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }

  interface FlatListProps<ItemT> {
    className?: string;
    contentContainerClassName?: string;
  }
}

declare module "react" {
  interface CSSProperties extends ViewStyle, TextStyle, ImageStyle {}
}
