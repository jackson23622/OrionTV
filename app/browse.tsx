import React from "react";
import CategoryBrowser from "@/components/CategoryBrowser";

/** 电视端顶栏“分类”：按分类和标签浏览全部影片 */
export default function BrowseScreen() {
  return <CategoryBrowser isRoot={false} title="分类" />;
}
