/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    link: "#0a7ea4",
    border: "#E5E5E5",
  },
  // Apple TV 风格：纯黑背景、白色文字，焦点为白色高亮，强调色为系统蓝
  dark: {
    text: "#FFFFFF",
    background: "#000000",
    tint: "#FFFFFF",
    icon: "#98989F",
    tabIconDefault: "#98989F",
    tabIconSelected: "#FFFFFF",
    link: "#0A84FF",
    border: "#2C2C2E",
    primary: "#0A84FF",
    secondaryText: "#98989F",
    tertiaryText: "#636366",
    surface: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    fill: "rgba(118, 118, 128, 0.24)",
    focus: "#FFFFFF",
    onFocus: "#000000",
  },
};
