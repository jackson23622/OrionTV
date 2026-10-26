import React, { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { View, Text, Image, StyleSheet, Pressable, TouchableOpacity, Alert, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Star, Play } from "lucide-react-native";
import { PlayRecordManager } from "@/services/storage";
import { API } from "@/services/api";
import { Colors } from "@/constants/Colors";
import Logger from '@/utils/Logger';
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const logger = Logger.withTag('VideoCardTV');

interface VideoCardProps extends React.ComponentProps<typeof TouchableOpacity> {
  id: string;
  source: string;
  title: string;
  poster: string;
  year?: string;
  rate?: string;
  sourceName?: string;
  progress?: number; // 播放进度，0-1之间的小数
  playTime?: number; // 播放时间 in ms
  episodeIndex?: number; // 剧集索引
  totalEpisodes?: number; // 总集数
  onFocus?: () => void;
  onRecordDeleted?: () => void; // 添加回调属性
  api: API;
}

const VideoCard = forwardRef<View, VideoCardProps>(
  (
    {
      id,
      source,
      title,
      poster,
      year,
      rate,
      sourceName,
      progress,
      episodeIndex,
      onFocus,
      onRecordDeleted,
      api,
      playTime = 0,
    }: VideoCardProps,
    ref
  ) => {
    const router = useRouter();
    const [isFocused, setIsFocused] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    const longPressTriggered = useRef(false);

    const scale = useRef(new Animated.Value(1)).current;

    const deviceType = useResponsiveLayout().deviceType;

    const animatedStyle = {
      transform: [{ scale }],
    };

    const handlePress = () => {
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      // 如果有播放进度，直接转到播放页面
      if (progress !== undefined && episodeIndex !== undefined) {
        router.push({
          pathname: "/play",
          params: { source, id, episodeIndex: episodeIndex - 1, title, position: playTime * 1000 },
        });
      } else {
        router.push({
          pathname: "/detail",
          params: { source, q: title },
        });
      }
    };

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      Animated.spring(scale, {
        toValue: 1.1,
        damping: 16,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
      onFocus?.();
    }, [scale, onFocus]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      Animated.spring(scale, {
        toValue: 1.0,
        useNativeDriver: true,
      }).start();
    }, [scale]);

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: Math.random() * 200, // 随机延迟创造交错效果
        useNativeDriver: true,
      }).start();
    }, [fadeAnim]);

    const handleLongPress = () => {
      // Only allow long press for items with progress (play records)
      if (progress === undefined) return;

      longPressTriggered.current = true;

      // Show confirmation dialog to delete play record
      Alert.alert("删除观看记录", `确定要删除"${title}"的观看记录吗？`, [
        {
          text: "取消",
          style: "cancel",
        },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete from local storage
              await PlayRecordManager.remove(source, id);

              // Call the onRecordDeleted callback
              if (onRecordDeleted) {
                onRecordDeleted();
              }
              // 如果没有回调函数，则使用导航刷新作为备选方案
              else if (router.canGoBack()) {
                router.replace("/");
              }
            } catch (error) {
              logger.info("Failed to delete play record:", error);
              Alert.alert("错误", "删除观看记录失败，请重试");
            }
          },
        },
      ]);
    };

    // 是否是继续观看的视频
    const isContinueWatching = progress !== undefined && progress > 0 && progress < 1;

    return (
      <Animated.View style={[styles.wrapper, animatedStyle, { opacity: fadeAnim }]}>
        <Pressable
          android_ripple={Platform.isTV || deviceType !== 'tv' ? { color: 'transparent' } : { color: Colors.dark.link }}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={({ pressed }) => [
            styles.pressable,
            {
              zIndex: pressed ? 999 : 1, // 确保按下时有最高优先级
            },
          ]}
          // activeOpacity={1}
          delayLongPress={1000}
        >
          <View style={[styles.card, isFocused && styles.cardFocused]}>
            <Image source={{ uri: api.getImageProxyUrl(poster) }} style={styles.poster} />

            {/* 焦点高光：模拟 tvOS 海报的玻璃反光 */}
            {isFocused && <View pointerEvents="none" style={styles.sheen} />}

            {isFocused && isContinueWatching && (
              <View style={styles.continueWatchingBadge}>
                <Play size={12} color="#000" fill="#000" />
                <Text style={styles.continueWatchingText}>继续观看</Text>
              </View>
            )}

            {rate ? (
              <View style={styles.ratingContainer}>
                <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.ratingText}>{rate}</Text>
              </View>
            ) : null}

            {/* 观看进度 */}
            {isContinueWatching && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(progress || 0) * 100}%` }]} />
              </View>
            )}
          </View>
          <View style={styles.infoContainer}>
            <Text numberOfLines={1} style={[styles.title, isFocused && styles.titleFocused]}>
              {title}
            </Text>
            {(() => {
              const meta = isContinueWatching
                ? `第 ${episodeIndex} 集 · 已看 ${Math.round((progress || 0) * 100)}%`
                : [year, sourceName].filter(Boolean).join(" · ");
              return meta ? (
                <Text numberOfLines={1} style={styles.meta}>
                  {meta}
                </Text>
              ) : null;
            })()}
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

VideoCard.displayName = "VideoCard";

export default VideoCard;

const CARD_WIDTH = 160;
const CARD_HEIGHT = 240;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 8,
  },
  pressable: {
    width: CARD_WIDTH + 20,
    height: CARD_HEIGHT + 80,
    justifyContent: "flex-start",
    alignItems: "center",
    overflow: "visible",
  },
  card: {
    marginTop: 12,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    overflow: "hidden",
  },
  cardFocused: {
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ratingContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 3,
  },
  infoContainer: {
    width: CARD_WIDTH,
    marginTop: 10,
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  title: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "500",
  },
  titleFocused: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  meta: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  continueWatchingBadge: {
    position: "absolute",
    left: 8,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  continueWatchingText: {
    color: "#000",
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
  },
});
