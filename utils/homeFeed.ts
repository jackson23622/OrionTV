/**
 * 电视端首页无限下拉（与网页版一致）：固定片架之后，滚动到底部附近时逐排追加主题片架，
 * 片架用完后接「发现更多」海报网格，电影 / 剧集交替分页，直到豆瓣没有更多。
 * 本文件只放纯数据和纯函数，便于测试。
 */

export interface FeedShelfDef {
  key: string;
  title: string;
  /** /api/douban/categories 参数（豆瓣 recent_hot） */
  kind: "movie" | "tv";
  category: string;
  type: string;
}

/** 首屏固定片架之后依次追加的片架（不与首屏片架重复） */
export const FEED_SHELVES: FeedShelfDef[] = [
  { key: "f-m-latest", title: "最新电影", kind: "movie", category: "最新", type: "全部" },
  { key: "f-m-cn", title: "华语电影", kind: "movie", category: "热门", type: "华语" },
  { key: "f-tv-jp", title: "日剧", kind: "tv", category: "tv", type: "tv_japanese" },
  { key: "f-m-us", title: "欧美电影", kind: "movie", category: "热门", type: "欧美" },
  { key: "f-tv-anime", title: "动漫", kind: "tv", category: "tv", type: "tv_animation" },
  { key: "f-m-kr", title: "韩国电影", kind: "movie", category: "热门", type: "韩国" },
  { key: "f-m-jp", title: "日本电影", kind: "movie", category: "热门", type: "日本" },
  { key: "f-m-hidden", title: "冷门佳片", kind: "movie", category: "冷门佳片", type: "全部" },
  { key: "f-tv-doc", title: "纪录片", kind: "tv", category: "tv", type: "tv_documentary" },
  { key: "f-show-cn", title: "国内综艺", kind: "tv", category: "show", type: "show_domestic" },
  { key: "f-show-intl", title: "国外综艺", kind: "tv", category: "show", type: "show_foreign" },
];

export type DiscoverKind = "movie" | "tv";

/** 发现网格下一页取哪一类：与上一页交替，已到底的类别跳过；都到底返回 null */
export function nextDiscoverKind(last: DiscoverKind | null, done: Record<DiscoverKind, boolean>): DiscoverKind | null {
  const preferred: DiscoverKind = last === "movie" ? "tv" : "movie";
  const other: DiscoverKind = preferred === "movie" ? "tv" : "movie";
  if (!done[preferred]) return preferred;
  if (!done[other]) return other;
  return null;
}

/** 追加一页并去重（keyOf 返回空串的条目丢弃） */
export function appendUnique<T>(prev: T[], next: T[], keyOf: (item: T) => string): { list: T[]; added: number } {
  const seen = new Set(prev.map(keyOf));
  const fresh = next.filter((i) => {
    const k = keyOf(i);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { list: fresh.length ? [...prev, ...fresh] : prev, added: fresh.length };
}

/** 把列表按列数切成行（电视端网格每行一个横向容器，遥控器上下键在行间移动） */
export function chunk<T>(list: T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += n) rows.push(list.slice(i, i + n));
  return rows;
}

/** 是否已滚动到距底部 threshold 以内 */
export function isNearBottom(offsetY: number, viewportH: number, contentH: number, threshold: number): boolean {
  return contentH > 0 && offsetY + viewportH >= contentH - threshold;
}
