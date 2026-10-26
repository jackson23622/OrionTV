import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  HWEvent,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  useTVEventHandler,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { LogOut, Play, Search, Settings } from "lucide-react-native";

import { api, Backdrop, DoubanItem } from "@/services/api";
import { PlayRecordManager } from "@/services/storage";
import useAuthStore from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { RowItem } from "@/stores/homeStore";
import { getApiConfigErrorMessage, useApiConfig } from "@/hooks/useApiConfig";
import VideoCard from "@/components/VideoCard";
import { FocusPill } from "@/components/tv/FocusPill";
import { Colors } from "@/constants/Colors";

/** 首页片架（豆瓣分类），顺序即显示顺序 */
const SHELVES: { key: string; title: string; type: "movie" | "tv"; tag: string }[] = [
  { key: "hot-movie", title: "热门电影", type: "movie", tag: "热门" },
  { key: "hot-tv", title: "热门剧集", type: "tv", tag: "热门" },
  { key: "cn-tv", title: "国产剧", type: "tv", tag: "国产剧" },
  { key: "us-tv", title: "美剧", type: "tv", tag: "美剧" },
  { key: "kr-tv", title: "韩剧", type: "tv", tag: "韩剧" },
  { key: "variety", title: "综艺", type: "tv", tag: "综艺" },
  { key: "anime", title: "日本动画", type: "tv", tag: "日本动画" },
  { key: "high", title: "豆瓣高分", type: "movie", tag: "豆瓣高分" },
  { key: "top250", title: "豆瓣 Top250", type: "movie", tag: "top250" },
];

const HERO_INTERVAL = 8000;

// 非电视平台（网页预览等）没有遥控器事件，用空实现兜底
const useRemoteEvents: typeof useTVEventHandler =
  typeof useTVEventHandler === "function" ? useTVEventHandler : () => {};
const GUTTER = 48;

type HomeItem = RowItem & { doubanId?: string; kind?: "movie" | "tv" };

interface Slide {
  item: HomeItem;
  kind: "movie" | "tv";
}

const toHomeItems = (list: DoubanItem[], kind: "movie" | "tv"): HomeItem[] =>
  list.map(
    (item) =>
      ({
        ...item,
        id: item.title,
        source: "douban",
        doubanId: item.id,
        kind,
      } as unknown as HomeItem)
  );

/** 首页大图背景：横版剧照铺满；没有剧照时为虚化海报 + 右侧清晰海报 */
function HeroBackground({
  slide,
  backdrop,
  onStillFailed,
}: {
  slide: Slide;
  backdrop: Backdrop | null | undefined;
  onStillFailed?: (failed: boolean) => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const [stillFailed, setStillFailed] = useState(false);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade, slide.item.title]);

  const poster = api.getImageProxyUrl(slide.item.poster);
  const showStill = !!backdrop && !stillFailed;

  useEffect(() => {
    onStillFailed?.(stillFailed);
  }, [onStillFailed, stillFailed]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      {showStill ? (
        <Image
          source={{ uri: api.getImageProxyUrl(backdrop!.url) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setStillFailed(true)}
        />
      ) : (
        <Image source={{ uri: poster }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} resizeMode="cover" blurRadius={25} />
      )}
    </Animated.View>
  );
}

/** 没有剧照时右侧的清晰海报（叠在渐变之上，不被压暗） */
function HeroPoster({ slide, width, height }: { slide: Slide; width: number; height: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade, slide.item.title]);
  const posterHeight = height * 0.62;
  return (
    <Animated.Image
      source={{ uri: api.getImageProxyUrl(slide.item.poster) }}
      resizeMode="cover"
      style={[
        styles.heroPoster,
        {
          opacity: fade,
          height: posterHeight,
          width: (posterHeight * 2) / 3,
          right: width * 0.07,
          top: height * 0.17,
        },
      ]}
    />
  );
}

/**
 * 电视端首页（Apple TV 风格）：
 *  - 顶部透明导航：首页 / 分类 / 直播 / 收藏，右侧搜索、设置、退出
 *  - 全屏大图轮播：豆瓣横版剧照铺满，8 秒切换，焦点在“播放”上时可用左右键切换
 *  - 横向片架：继续观看 + 豆瓣各分类
 */
export default function TVHome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const apiConfigStatus = useApiConfig();
  const { isLoggedIn, logout } = useAuthStore();
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);

  const [shelves, setShelves] = useState<Record<string, HomeItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<HomeItem[]>([]);
  const [backdrops, setBackdrops] = useState<Record<string, Backdrop | null>>({});
  const [heroIndex, setHeroIndex] = useState(0);
  const [failedStill, setFailedStill] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const shelfY = useRef<Record<string, number>>({});
  const heroFocused = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ready = apiConfigStatus.isConfigured && !apiConfigStatus.needsConfiguration;

  // ---------- 数据 ----------
  const loadShelves = useCallback(async () => {
    setLoading(true);
    setError(null);
    await useAuthStore.getState().checkLoginStatus(useSettingsStore.getState().apiBaseUrl);
    const results = await Promise.allSettled(SHELVES.map((s) => api.getDoubanData(s.type, s.tag, 20, 0)));
    const next: Record<string, HomeItem[]> = {};
    const errors: string[] = [];
    results.forEach((r, i) => {
      const def = SHELVES[i];
      if (r.status === "fulfilled" && r.value?.list) {
        next[def.key] = toHomeItems(r.value.list, def.type);
      } else if (r.status === "rejected") {
        errors.push(String(r.reason?.message || ""));
      }
    });
    setShelves(next);
    if (!Object.keys(next).length) {
      const firstError = errors[0] || "";
      setError(
        firstError === "UNAUTHORIZED"
          ? "认证失败，请重新登录"
          : firstError.includes("Network")
          ? "网络连接失败，请检查网络或服务器地址"
          : "内容加载失败，请稍后重试"
      );
    }
    setLoading(false);
  }, []);

  const loadRecords = useCallback(async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setRecords([]);
      return;
    }
    try {
      const all = await PlayRecordManager.getAll();
      const items = Object.entries(all)
        .map(([key, record]) => {
          const [source, id] = key.split("+");
          return {
            ...record,
            id,
            source,
            progress: record.total_time ? record.play_time / record.total_time : 0,
            poster: record.cover,
            sourceName: record.source_name,
            episodeIndex: record.index,
            totalEpisodes: record.total_episodes,
            lastPlayed: record.save_time,
            play_time: record.play_time,
          } as unknown as HomeItem;
        })
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
      setRecords(items);
    } catch {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    if (ready) loadShelves();
  }, [ready, apiBaseUrl, isLoggedIn, loadShelves]);

  useFocusEffect(
    useCallback(() => {
      if (ready) loadRecords();
      // 登录状态变化（登录框登录成功）后需要重新读取播放记录
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, isLoggedIn, loadRecords])
  );

  // ---------- 大图 ----------
  const slides = useMemo<Slide[]>(() => {
    const movies = (shelves["hot-movie"] || []).filter((m) => m.poster).slice(0, 4);
    const tv = (shelves["hot-tv"] || []).filter((m) => m.poster).slice(0, 3);
    const out: Slide[] = [];
    for (let i = 0; i < Math.max(movies.length, tv.length); i++) {
      if (movies[i]) out.push({ item: movies[i], kind: "movie" });
      if (tv[i]) out.push({ item: tv[i], kind: "tv" });
    }
    return out.slice(0, 6);
  }, [shelves]);

  useEffect(() => {
    let alive = true;
    slides.forEach(({ item, kind }) => {
      const id = item.doubanId;
      if (!id || id in backdrops) return;
      api.getDoubanBackdrop(kind, id).then((b) => {
        if (alive) setBackdrops((prev) => ({ ...prev, [id]: b }));
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  const restartTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (slides.length < 2) return;
    timer.current = setInterval(() => setHeroIndex((i) => (i + 1) % slides.length), HERO_INTERVAL);
  }, [slides.length]);

  useEffect(() => {
    setHeroIndex(0);
    restartTimer();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [restartTimer]);

  // 焦点在“播放”按钮上时，左右键切换大图
  useRemoteEvents((evt: HWEvent) => {
    if (!heroFocused.current || slides.length < 2) return;
    if (evt.eventType === "right" || evt.eventType === "left") {
      const step = evt.eventType === "right" ? 1 : -1;
      setHeroIndex((i) => (i + step + slides.length) % slides.length);
      restartTimer();
    }
  });

  // ---------- 返回键：首页按两次退出 ----------
  const backPressAt = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        const now = Date.now();
        if (!backPressAt.current || now - backPressAt.current > 2000) {
          backPressAt.current = now;
          scrollRef.current?.scrollTo({ y: 0, animated: true });
          ToastAndroid.show("再按一次返回键退出", ToastAndroid.SHORT);
          return true;
        }
        BackHandler.exitApp();
        return true;
      });
      return () => {
        sub.remove();
        backPressAt.current = null;
      };
    }, [])
  );

  const openDetail = (item: HomeItem) =>
    router.push({ pathname: "/detail", params: { source: "douban", q: item.title } });

  const scrollToShelf = (key: string) => {
    const y = shelfY.current[key];
    if (typeof y === "number") scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
  };

  // ---------- 渲染 ----------
  const nav = (
    <View style={styles.nav} pointerEvents="box-none">
      <Text style={styles.brand}>MoonTV</Text>
      <View style={styles.navTabs}>
        <FocusPill label="首页" active hasTVPreferredFocus={!slides.length} onFocus={() => scrollRef.current?.scrollTo({ y: 0 })} />
        <FocusPill label="分类" onPress={() => router.push("/browse")} />
        <FocusPill label="直播" onPress={() => router.push("/live")} />
        <FocusPill label="收藏" onPress={() => router.push("/favorites")} />
      </View>
      <View style={styles.navRight}>
        <FocusPill icon={(c) => <Search size={18} color={c} />} onPress={() => router.push("/search")} />
        <FocusPill icon={(c) => <Settings size={18} color={c} />} onPress={() => router.push("/settings")} />
        {isLoggedIn && <FocusPill icon={(c) => <LogOut size={18} color={c} />} onPress={logout} />}
      </View>
    </View>
  );

  if (!ready || apiConfigStatus.isValidating || (apiConfigStatus.error && !apiConfigStatus.isValid)) {
    return (
      <View style={styles.screen}>
        {nav}
        <View style={styles.center}>
          {apiConfigStatus.isValidating ? (
            <>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.message}>正在连接服务器…</Text>
            </>
          ) : (
            <>
              <Text style={styles.messageTitle}>
                {apiConfigStatus.needsConfiguration ? "还没有连接服务器" : "无法连接服务器"}
              </Text>
              <Text style={styles.message}>
                {apiConfigStatus.error || getApiConfigErrorMessage(apiConfigStatus)}
              </Text>
              <FocusPill
                label="打开设置"
                size="lg"
                filled
                hasTVPreferredFocus
                style={{ marginTop: 24 }}
                onPress={() => router.push("/settings")}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  const slide = slides[heroIndex % Math.max(slides.length, 1)];
  // undefined：剧照还在取；null：没有合适剧照
  const heroBackdrop = slide?.item.doubanId ? backdrops[slide.item.doubanId] : null;
  const heroMeta = slide
    ? [slide.item.rate ? `★ ${slide.item.rate}` : "", slide.item.year || "", slide.kind === "movie" ? "电影" : "剧集"].filter(Boolean)
    : [];

  const shelfList: { key: string; title: string; items: HomeItem[] }[] = [
    ...(records.length ? [{ key: "records", title: "继续观看", items: records }] : []),
    ...SHELVES.map((s) => ({ key: s.key, title: s.title, items: shelves[s.key] || [] })).filter((s) => s.items.length),
  ];

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* 全屏大图 */}
        <View style={{ width, height }}>
          {slide && (
            <HeroBackground
              key={slide.item.title}
              slide={slide}
              backdrop={heroBackdrop}
              onStillFailed={(failed) => failed && setFailedStill(slide.item.title)}
            />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.35)", "transparent"]}
            locations={[0, 0.45, 0.8]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "transparent", "transparent", "rgba(0,0,0,0.65)", "#000"]}
            locations={[0, 0.22, 0.5, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* 没有剧照（或剧照加载失败）时：右侧清晰海报 */}
          {slide && (heroBackdrop === null || failedStill === slide.item.title) && (
            <HeroPoster key={`poster-${slide.item.title}`} slide={slide} width={width} height={height} />
          )}

          {nav}

          {loading && !slide ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : error && !slide ? (
            <View style={styles.center}>
              <Text style={styles.messageTitle}>{error}</Text>
              <FocusPill label="重试" size="lg" filled hasTVPreferredFocus style={{ marginTop: 24 }} onPress={loadShelves} />
            </View>
          ) : slide ? (
            <View style={[styles.heroText, { bottom: height * 0.16, maxWidth: width * 0.5 }]}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {slide.item.title}
              </Text>
              <Text style={styles.heroMeta}>{heroMeta.join("   ")}</Text>
              <View style={styles.heroButtons}>
                <FocusPill
                  label="播放"
                  size="lg"
                  filled
                  hasTVPreferredFocus
                  icon={(c) => <Play size={18} color={c} fill={c} />}
                  onPress={() => openDetail(slide.item)}
                  onFocus={() => {
                    heroFocused.current = true;
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  onBlur={() => {
                    heroFocused.current = false;
                  }}
                />
              </View>
              {slides.length > 1 && (
                <View style={styles.dots}>
                  {slides.map((s, i) => (
                    <View key={s.item.title} style={[styles.dot, i === heroIndex && styles.dotActive]} />
                  ))}
                  <Text style={styles.hint}>左右键切换</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* 片架 */}
        {shelfList.map((shelf) => (
          <View
            key={shelf.key}
            style={styles.shelf}
            onLayout={(e) => {
              shelfY.current[shelf.key] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.shelfTitle}>{shelf.title}</Text>
            <FlatList
              horizontal
              data={shelf.items}
              keyExtractor={(item, i) => `${shelf.key}-${item.source}-${item.id}-${i}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: GUTTER - 18 }}
              renderItem={({ item }) => (
                <VideoCard
                  id={item.id}
                  source={item.source}
                  title={item.title}
                  poster={item.poster}
                  year={item.year}
                  rate={item.rate}
                  progress={item.progress}
                  playTime={item.play_time}
                  episodeIndex={item.episodeIndex}
                  sourceName={item.sourceName}
                  totalEpisodes={item.totalEpisodes}
                  api={api}
                  onFocus={() => scrollToShelf(shelf.key)}
                  onRecordDeleted={loadRecords}
                />
              )}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: GUTTER,
  },
  nav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    paddingHorizontal: GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    width: 160,
  },
  navTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    width: 160,
  },
  heroPoster: {
    position: "absolute",
    borderRadius: 14,
  },
  heroText: {
    position: "absolute",
    left: GUTTER,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -0.8,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroMeta: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "500",
  },
  heroButtons: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  dots: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  hint: {
    marginLeft: 10,
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  shelf: {
    marginTop: 8,
  },
  shelfTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    paddingHorizontal: GUTTER,
    marginBottom: 2,
  },
  messageTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    marginTop: 10,
    color: Colors.dark.secondaryText,
    fontSize: 15,
    textAlign: "center",
  },
});
