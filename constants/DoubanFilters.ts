/**
 * 分类页筛选选项，与网页版（MoonTV src/lib/douban.filters.ts、DoubanSelector）保持一致。
 * 「筛选」走服务端 /api/douban/recommends，「榜单」走 /api/douban/categories。
 */

export type DoubanMediaType = "movie" | "tv" | "show";

export interface FilterOption {
  label: string;
  value: string;
}

export interface DoubanFilterState {
  genre: string; // 类型
  region: string; // 地区
  year: string; // 年代
  platform: string; // 平台（仅剧集/综艺）
  sort: string; // 排序：T 综合 / U 近期热度 / R 首映(播)时间 / S 高分优先
}

export const DEFAULT_FILTERS: DoubanFilterState = {
  genre: "all",
  region: "all",
  year: "all",
  platform: "all",
  sort: "T",
};

const ALL: FilterOption = { label: "全部", value: "all" };

const toOptions = (labels: string[]): FilterOption[] => [
  ALL,
  ...labels.map((l) => ({ label: l, value: l })),
];

export const GENRE_OPTIONS: Record<DoubanMediaType, FilterOption[]> = {
  movie: toOptions([
    "喜剧",
    "动作",
    "爱情",
    "科幻",
    "动画",
    "悬疑",
    "惊悚",
    "恐怖",
    "犯罪",
    "冒险",
    "奇幻",
    "战争",
    "历史",
    "传记",
    "音乐",
    "歌舞",
    "武侠",
    "灾难",
    "西部",
    "纪录片",
    "短片",
  ]),
  tv: toOptions([
    "剧情",
    "喜剧",
    "爱情",
    "悬疑",
    "古装",
    "武侠",
    "家庭",
    "犯罪",
    "动作",
    "科幻",
    "奇幻",
    "动画",
    "惊悚",
    "恐怖",
    "历史",
    "战争",
    "冒险",
    "传记",
    "音乐",
    "歌舞",
  ]),
  show: toOptions(["真人秀", "脱口秀", "音乐", "歌舞"]),
};

const MOVIE_REGIONS = [
  "华语",
  "欧美",
  "韩国",
  "日本",
  "中国大陆",
  "中国香港",
  "中国台湾",
  "美国",
  "英国",
  "法国",
  "德国",
  "意大利",
  "西班牙",
  "印度",
  "泰国",
  "俄罗斯",
  "加拿大",
  "澳大利亚",
  "爱尔兰",
  "瑞典",
  "巴西",
  "丹麦",
];

const TV_REGIONS = [
  "华语",
  "欧美",
  "国外",
  "韩国",
  "日本",
  "中国大陆",
  "中国香港",
  "中国台湾",
  "美国",
  "英国",
  "泰国",
  "意大利",
  "法国",
  "德国",
  "西班牙",
  "俄罗斯",
  "瑞典",
  "巴西",
  "丹麦",
  "印度",
  "加拿大",
  "爱尔兰",
  "澳大利亚",
];

export const REGION_OPTIONS: Record<DoubanMediaType, FilterOption[]> = {
  movie: toOptions(MOVIE_REGIONS),
  tv: toOptions(TV_REGIONS),
  show: toOptions(TV_REGIONS),
};

/** 年代：当前年代 + 近若干个单独年份 + 往前按年代 */
export function getYearOptions(now: Date = new Date()): FilterOption[] {
  const currentYear = now.getFullYear();
  const decadeStart = Math.floor(currentYear / 10) * 10;
  const years: string[] = [];
  // 当前年份往回到上个年代的最后一年，例如 2026 → 2026…2019
  for (let y = currentYear; y >= decadeStart - 1; y--) {
    years.push(String(y));
  }
  const decades = [`${decadeStart}年代`];
  for (let d = decadeStart - 10; d >= 1960; d -= 10) {
    decades.push(d >= 2000 ? `${d}年代` : `${String(d).slice(2)}年代`);
  }
  // 顺序：全部、当前年代、近年逐年、更早的年代、更早
  return toOptions([decades[0], ...years, ...decades.slice(1), "更早"]);
}

export const PLATFORM_OPTIONS: FilterOption[] = toOptions([
  "腾讯视频",
  "爱奇艺",
  "优酷",
  "湖南卫视",
  "Netflix",
  "HBO",
  "BBC",
  "NHK",
  "CBS",
  "NBC",
  "tvN",
]);

export function getSortOptions(type: DoubanMediaType): FilterOption[] {
  return [
    { label: "综合排序", value: "T" },
    { label: "近期热度", value: "U" },
    { label: type === "movie" ? "首映时间" : "首播时间", value: "R" },
    { label: "高分优先", value: "S" },
  ];
}


/** 榜单模式：电影一级分类 + 地区；剧集 / 综艺为单行类型（值为豆瓣 recent_hot 接口参数） */
export const RANK_MOVIE_CATEGORY: FilterOption[] = [
  { label: "热门电影", value: "热门" },
  { label: "最新电影", value: "最新" },
  { label: "豆瓣高分", value: "豆瓣高分" },
  { label: "冷门佳片", value: "冷门佳片" },
];

export const RANK_MOVIE_REGION: FilterOption[] = [
  { label: "全部", value: "全部" },
  { label: "华语", value: "华语" },
  { label: "欧美", value: "欧美" },
  { label: "韩国", value: "韩国" },
  { label: "日本", value: "日本" },
];

export const RANK_TV_TYPES: FilterOption[] = [
  { label: "全部", value: "tv" },
  { label: "国产", value: "tv_domestic" },
  { label: "欧美", value: "tv_american" },
  { label: "日本", value: "tv_japanese" },
  { label: "韩国", value: "tv_korean" },
  { label: "动漫", value: "tv_animation" },
  { label: "纪录片", value: "tv_documentary" },
];

export const RANK_SHOW_TYPES: FilterOption[] = [
  { label: "全部", value: "show" },
  { label: "国内", value: "show_domestic" },
  { label: "国外", value: "show_foreign" },
];

export const MEDIA_TABS: FilterOption[] = [
  { label: "电影", value: "movie" },
  { label: "剧集", value: "tv" },
  { label: "综艺", value: "show" },
];

export const MODE_TABS: FilterOption[] = [
  { label: "榜单", value: "rank" },
  { label: "筛选", value: "filter" },
];
