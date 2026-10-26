import React, { forwardRef, useState } from "react";
import { Animated, Pressable, PressableProps, StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { useButtonAnimation } from "@/hooks/useAnimation";

interface FocusPillProps extends Omit<PressableProps, "children" | "style"> {
  label?: string;
  /** 图标渲染函数：拿到当前前景色（获得焦点时为黑色） */
  icon?: (color: string) => React.ReactNode;
  /** 选中（当前页面）但未获得焦点 */
  active?: boolean;
  /** 未获得焦点时是否显示半透明底（主操作按钮用） */
  filled?: boolean;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

/**
 * tvOS 风格的胶囊按钮：获得焦点时变白底黑字并放大，其余状态为半透明。
 * 用于首页大图按钮与顶部导航。
 */
export const FocusPill = forwardRef<View, FocusPillProps>(
  ({ label, icon, active = false, filled = false, size = "md", style, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const anim = useButtonAnimation(focused, 1.08);
    const color = focused ? "#000000" : active ? "#FFFFFF" : "rgba(255,255,255,0.75)";
    const background = focused
      ? "#FFFFFF"
      : active
      ? "rgba(255,255,255,0.18)"
      : filled
      ? "rgba(255,255,255,0.2)"
      : "transparent";
    const lg = size === "lg";

    return (
      <Animated.View style={[anim, style]}>
        <Pressable
          ref={ref}
          android_ripple={{ color: "transparent" }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.base,
            lg ? styles.lg : styles.md,
            !label && (lg ? styles.iconOnlyLg : styles.iconOnly),
            { backgroundColor: background },
            focused && styles.focused,
          ]}
          {...rest}
        >
          {icon ? icon(color) : null}
          {label ? (
            <Text
              style={[
                lg ? styles.labelLg : styles.label,
                { color, marginLeft: icon ? (lg ? 8 : 6) : 0 },
                (focused || active) && styles.labelStrong,
              ]}
            >
              {label}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  }
);

FocusPill.displayName = "FocusPill";

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  md: {
    height: 34,
    paddingHorizontal: 16,
  },
  lg: {
    height: 44,
    paddingHorizontal: 26,
  },
  iconOnly: {
    width: 34,
    paddingHorizontal: 0,
  },
  iconOnlyLg: {
    width: 44,
    paddingHorizontal: 0,
  },
  focused: {
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  labelLg: {
    fontSize: 17,
    fontWeight: "600",
  },
  labelStrong: {
    fontWeight: "700",
  },
});
