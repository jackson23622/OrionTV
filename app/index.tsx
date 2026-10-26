import React from "react";
import CategoryBrowser from "@/components/CategoryBrowser";
import TVHome from "@/components/tv/TVHome";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

/** 首页：电视端为 Apple TV 风格（大图 + 片架），手机 / 平板端为分类浏览 */
export default function HomeScreen() {
  const { deviceType } = useResponsiveLayout();
  return deviceType === "tv" ? <TVHome /> : <CategoryBrowser isRoot />;
}
