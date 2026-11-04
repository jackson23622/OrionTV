import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDownToDot, ArrowUpFromDot, ChevronsRight, Gauge, List, MoreHorizontal, Tv, X } from "lucide-react-native";

import usePlayerStore from "@/stores/playerStore";

const AUTO_HIDE_MS = 6000;

const fmt = (ms?: number) => {
  if (!ms) return "";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * 手机 / 平板 / 折叠屏播放页右上角的菜单（触屏设备使用系统原生控制条，
 * 电视端控制栏里的跳过片头片尾、选集、换源、倍速在这里提供）。
 */
export function MobilePlayerMenu() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    skipEnabled,
    toggleSkipEnabled,
    introEndTime,
    outroStartTime,
    setIntroEndTime,
    setOutroStartTime,
    playbackRate,
    episodes,
    setShowEpisodeModal,
    setShowSourceModal,
    setShowSpeedModal,
  } = usePlayerStore();

  const touch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const act = (fn: () => void, close = false) => () => {
    fn();
    if (close) setOpen(false);
    else touch();
  };

  const items: { key: string; label: string; sub?: string; icon: React.ReactNode; onPress: () => void }[] = [
    {
      key: "skip",
      label: "跳过片头片尾",
      sub: skipEnabled ? "开" : "关",
      icon: <ChevronsRight color={skipEnabled ? "#fff" : "#888"} size={20} />,
      onPress: act(toggleSkipEnabled),
    },
    {
      key: "intro",
      label: introEndTime ? "清除片头" : "设为片头结束",
      sub: fmt(introEndTime),
      icon: <ArrowDownToDot color="#fff" size={20} />,
      onPress: act(setIntroEndTime),
    },
    {
      key: "outro",
      label: outroStartTime ? "清除片尾" : "设为片尾开始",
      sub: fmt(outroStartTime),
      icon: <ArrowUpFromDot color="#fff" size={20} />,
      onPress: act(setOutroStartTime),
    },
    ...(episodes.length > 1
      ? [{ key: "ep", label: "选集", icon: <List color="#fff" size={20} />, onPress: act(() => setShowEpisodeModal(true), true) }]
      : []),
    {
      key: "speed",
      label: "倍速",
      sub: playbackRate !== 1 ? `${playbackRate}x` : undefined,
      icon: <Gauge color="#fff" size={20} />,
      onPress: act(() => setShowSpeedModal(true), true),
    },
    { key: "source", label: "换源", icon: <Tv color="#fff" size={20} />, onPress: act(() => setShowSourceModal(true), true) },
  ];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8, right: insets.right + 8 }]}>
      <Pressable
        accessibilityLabel={open ? "关闭菜单" : "播放菜单"}
        hitSlop={10}
        style={styles.toggle}
        onPress={() => {
          if (open) setOpen(false);
          else {
            setOpen(true);
            touch();
          }
        }}
      >
        {open ? <X color="#fff" size={20} /> : <MoreHorizontal color="#fff" size={20} />}
      </Pressable>
      {open && (
        <View style={styles.panel}>
          {items.map((it) => (
            <Pressable
              key={it.key}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={it.onPress}
            >
              {it.icon}
              <Text style={styles.label}>{it.label}</Text>
              {!!it.sub && <Text style={styles.sub}>{it.sub}</Text>}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "flex-end",
    zIndex: 20,
  },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    marginTop: 8,
    minWidth: 200,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(28,28,30,0.94)",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  itemPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  label: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  sub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
});
