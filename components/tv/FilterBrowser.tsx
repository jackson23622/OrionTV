import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, DoubanItem } from "@/services/api";
import VideoCard from "@/components/VideoCard";
import { StyledButton } from "@/components/StyledButton";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { Colors } from "@/constants/Colors";
import {
  DEFAULT_FILTERS,
  DoubanFilterState,
  DoubanMediaType,
  FilterOption,
  GENRE_OPTIONS,
  getSortOptions,
  getYearOptions,
  MEDIA_TABS,
  MODE_TABS,
  PLATFORM_OPTIONS,
  RANK_MOVIE_CATEGORY,
  RANK_MOVIE_REGION,
  RANK_SHOW_TYPES,
  RANK_TV_TYPES,
  REGION_OPTIONS,
} from "@/constants/DoubanFilters";

const PAGE_SIZE = 25;
const LOAD_MORE_THRESHOLD = 400;

type Mode = "rank" | "filter";

/** 一行选项：标签 + 横向按钮 */
function OptionRow({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <FlatList
        horizontal
        style={styles.rowScroller}
        data={options}
        keyExtractor={(o) => o.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowList}
        renderItem={({ item }) => (
          <StyledButton
            text={item.label}
            isSelected={item.value === value}
            variant="ghost"
            style={styles.chip}
            textStyle={styles.chipText}
            onPress={() => item.value !== value && onSelect(item.value)}
          />
        )}
      />
    </View>
  );
}

/**
 * 分类页：与网页版一致 —— 电影 / 剧集 / 综艺，每类有「榜单」与「筛选」两种模式。
 *  榜单：电影按 分类 + 地区，剧集 / 综艺按 类型（豆瓣近期热门）
 *  筛选：类型 / 地区 / 年代 / 平台（剧集、综艺）/ 排序
 */
export default function FilterBrowser() {
  const insets = useSafeAreaInsets();
  const { deviceType } = useResponsiveLayout();
  const isTV = deviceType === "tv";

  const [media, setMedia] = useState<DoubanMediaType>("movie");
  const [mode, setMode] = useState<Mode>("rank");
  // 榜单：电影 primary=分类、secondary=地区；剧集 / 综艺只用 secondary
  const [primary, setPrimary] = useState("热门");
  const [secondary, setSecondary] = useState("全部");
  const [filters, setFilters] = useState<DoubanFilterState>(DEFAULT_FILTERS);

  const [items, setItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const switchMedia = (m: DoubanMediaType) => {
    setMedia(m);
    setPrimary("热门");
    setSecondary(m === "movie" ? "全部" : m);
    setFilters(DEFAULT_FILTERS);
  };

  const fetchPage = useCallback(
    (start: number) => {
      if (mode === "filter") {
        return api.getDoubanRecommends({ type: media, ...filters, start, limit: PAGE_SIZE });
      }
      return media === "movie"
        ? api.getDoubanCategories({ kind: "movie", category: primary, type: secondary, start, limit: PAGE_SIZE })
        : api.getDoubanCategories({ kind: "tv", category: media, type: secondary, start, limit: PAGE_SIZE });
    },
    [mode, media, primary, secondary, filters]
  );

  // 筛选接口会过滤掉片单等条目，单页可能不足 25 条，以返回为空判断到底
  const pageHasMore = useCallback(
    (list: DoubanItem[]) => (mode === "filter" ? list.length > 0 : list.length === PAGE_SIZE),
    [mode]
  );

  // 条件变化：重新加载第一页
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setHasMore(true);
    fetchPage(0)
      .then((res) => {
        if (id !== requestId.current) return;
        const list = res?.list || [];
        setItems(list);
        setHasMore(pageHasMore(list));
      })
      .catch((e: Error) => {
        if (id !== requestId.current) return;
        setError(e?.message === "UNAUTHORIZED" ? "认证失败，请重新登录" : "加载失败，请稍后重试");
        setHasMore(false);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [fetchPage, pageHasMore]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    fetchPage(items.length)
      .then((res) => {
        if (id !== requestId.current) return;
        const list = res?.list || [];
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id || i.title));
          return [...prev, ...list.filter((i) => !seen.has(i.id || i.title))];
        });
        setHasMore(pageHasMore(list));
      })
      .catch(() => {
        if (id === requestId.current) setHasMore(false);
      })
      .finally(() => {
        if (id === requestId.current) setLoadingMore(false);
      });
  }, [loading, loadingMore, hasMore, fetchPage, items.length, pageHasMore]);

  const setFilter = (key: keyof DoubanFilterState) => (v: string) => setFilters((f) => ({ ...f, [key]: v }));

  const rankRows =
    media === "movie" ? (
      <>
        <OptionRow label="分类" options={RANK_MOVIE_CATEGORY} value={primary} onSelect={setPrimary} />
        <OptionRow label="地区" options={RANK_MOVIE_REGION} value={secondary} onSelect={setSecondary} />
      </>
    ) : (
      <OptionRow
        label="类型"
        options={media === "tv" ? RANK_TV_TYPES : RANK_SHOW_TYPES}
        value={secondary}
        onSelect={setSecondary}
      />
    );

  const filterRows = (
    <>
      <OptionRow label="类型" options={GENRE_OPTIONS[media]} value={filters.genre} onSelect={setFilter("genre")} />
      <OptionRow label="地区" options={REGION_OPTIONS[media]} value={filters.region} onSelect={setFilter("region")} />
      <OptionRow label="年代" options={yearOptions} value={filters.year} onSelect={setFilter("year")} />
      {media !== "movie" && (
        <OptionRow label="平台" options={PLATFORM_OPTIONS} value={filters.platform} onSelect={setFilter("platform")} />
      )}
      <OptionRow label="排序" options={getSortOptions(media)} value={filters.sort} onSelect={setFilter("sort")} />
    </>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: isTV ? 24 : insets.top + 12, paddingBottom: 48 }}
      scrollEventThrottle={64}
      onScroll={({ nativeEvent: e }) => {
        if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - LOAD_MORE_THRESHOLD) loadMore();
      }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>分类</Text>
        <View style={styles.tabs}>
          {MEDIA_TABS.map((t, i) => (
            <StyledButton
              key={t.value}
              text={t.label}
              isSelected={media === t.value}
              hasTVPreferredFocus={i === 0}
              style={styles.tab}
              onPress={() => media !== t.value && switchMedia(t.value as DoubanMediaType)}
            />
          ))}
        </View>
        <View style={styles.tabs}>
          {MODE_TABS.map((t) => (
            <StyledButton
              key={t.value}
              text={t.label}
              isSelected={mode === t.value}
              style={styles.tab}
              onPress={() => mode !== t.value && setMode(t.value as Mode)}
            />
          ))}
        </View>
      </View>

      <View style={styles.filters}>{mode === "rank" ? rankRows : filterRows}</View>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 48 }} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.message}>没有符合条件的内容，换个条件试试。</Text>
      ) : (
        <View style={styles.grid}>
          {items.map((item, i) => (
            <VideoCard
              key={`${item.id || item.title}-${i}`}
              id={item.title}
              source="douban"
              title={item.title}
              poster={item.poster}
              year={item.year}
              rate={item.rate}
              api={api}
            />
          ))}
        </View>
      )}
      {loadingMore && <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />}
      {!loading && !hasMore && items.length > 0 && <Text style={styles.end}>已经到底了</Text>}
    </ScrollView>
  );
}

const GUTTER = 40;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: GUTTER,
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginRight: 24,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  tab: {
    marginRight: 8,
  },
  filters: {
    paddingHorizontal: GUTTER,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  rowLabel: {
    width: 44,
    flexShrink: 0,
    color: Colors.dark.secondaryText,
    fontSize: 14,
    fontWeight: "500",
  },
  rowScroller: {
    flex: 1,
  },
  rowList: {
    paddingRight: GUTTER,
  },
  chip: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
    marginHorizontal: GUTTER,
    marginTop: 10,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: GUTTER - 10,
  },
  message: {
    color: Colors.dark.secondaryText,
    fontSize: 15,
    textAlign: "center",
    marginTop: 48,
  },
  end: {
    color: Colors.dark.tertiaryText,
    fontSize: 13,
    textAlign: "center",
    marginVertical: 24,
  },
});
