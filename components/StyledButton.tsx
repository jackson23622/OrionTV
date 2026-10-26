import React, { forwardRef } from "react";
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle, PressableProps, TextStyle, View, Platform } from "react-native";
import { ThemedText } from "./ThemedText";
import { Colors } from "@/constants/Colors";
import { useButtonAnimation } from "@/hooks/useAnimation";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface StyledButtonProps extends PressableProps {
  children?: React.ReactNode;
  text?: string;
  variant?: "default" | "primary" | "ghost";
  isSelected?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Apple TV 风格按钮：
 *  - 文字按钮获得焦点时变为白底黑字并放大（tvOS 焦点效果）
 *  - 图标 / 自定义内容按钮获得焦点时为半透明白色底板，保证白色图标仍可见
 *  - 选中（非焦点）为浅灰底
 */
export const StyledButton = forwardRef<View, StyledButtonProps>(
  ({ children, text, variant = "default", isSelected = false, style, textStyle, ...rest }, ref) => {
    const colors = Colors.dark;
    const [isFocused, setIsFocused] = React.useState(false);
    const animationStyle = useButtonAnimation(isFocused, 1.08);
    const deviceType = useResponsiveLayout().deviceType;
    const { onFocus, onBlur, ...pressableProps } = rest;

    const isTextButton = !!text;

    // primary 与 default 外观一致（部分调用方用白色文字作为子元素，不能用白底）
    const baseBackground = variant === "ghost" ? "transparent" : colors.fill;
    const baseTextColor = colors.text;

    const focusedBackground = isTextButton ? colors.focus : "rgba(255,255,255,0.28)";
    const focusedTextColor = isTextButton ? colors.onFocus : colors.text;

    const selectedBackground = "rgba(255,255,255,0.22)";

    return (
      <Animated.View style={[animationStyle, style]}>
        <Pressable
          android_ripple={Platform.isTV || deviceType !== "tv" ? { color: "transparent" } : { color: colors.link }}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={({ focused }) => [
            styles.button,
            { backgroundColor: baseBackground },
            isSelected && { backgroundColor: selectedBackground },
            focused && [styles.focused, { backgroundColor: focusedBackground }],
          ]}
          {...pressableProps}
        >
          {text ? (
            <ThemedText
              style={[
                styles.text,
                { color: baseTextColor },
                isSelected && styles.selectedText,
                textStyle,
                isFocused && { color: focusedTextColor },
              ]}
            >
              {text}
            </ThemedText>
          ) : (
            children
          )}
        </Pressable>
      </Animated.View>
    );
  }
);

StyledButton.displayName = "StyledButton";

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  focused: {
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectedText: {
    fontWeight: "700",
  },
});
