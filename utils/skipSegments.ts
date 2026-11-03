import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 自动跳过片头片尾（与网页版逻辑一致）
 *
 * - 总开关默认关闭，入口在播放控制栏（按遥控器呼出控制栏才能看到）
 * - 片头 / 片尾时长按片名记忆：同一部剧每集通用，换源也沿用
 *   intro：片头结束的时间点（秒）；outro：片尾长度（秒，从结尾往前算）
 */
export interface SkipConfig {
  intro: number;
  outro: number;
}

export const SKIP_ENABLE_KEY = "mytv_skip_segments_enabled";
const CONFIG_PREFIX = "mytv_skip_segments:";

export const EMPTY_SKIP: SkipConfig = { intro: 0, outro: 0 };

export function skipConfigKey(title: string): string {
  return CONFIG_PREFIX + title.trim().toLowerCase();
}

function sanitize(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(v, 1800) : 0;
}

/** 读取总开关；从未设置过时返回 fallback */
export async function loadSkipEnabled(fallback = false): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SKIP_ENABLE_KEY);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
}

export async function saveSkipEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIP_ENABLE_KEY, String(on));
  } catch {
    /* ignore */
  }
}

/** 读取片名对应的配置；从未设置过返回 null（用于区分「没设过」和「已清除」） */
export async function loadSkipConfig(title: string): Promise<SkipConfig | null> {
  if (!title) return null;
  try {
    const raw = await AsyncStorage.getItem(skipConfigKey(title));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return { intro: sanitize(parsed?.intro), outro: sanitize(parsed?.outro) };
  } catch {
    return null;
  }
}

export async function saveSkipConfig(title: string, cfg: SkipConfig): Promise<void> {
  if (!title) return;
  const clean = { intro: sanitize(cfg.intro), outro: sanitize(cfg.outro) };
  try {
    // 清除后也保留记录（全 0），避免旧版本按片源记录的时间被再次迁移回来
    await AsyncStorage.setItem(skipConfigKey(title), JSON.stringify(clean));
  } catch {
    /* ignore */
  }
}

/** 秒数 → 提示文字 */
export function formatSkip(sec: number): string {
  if (!sec) return "不跳过";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s}秒`;
  return s ? `${m}分${s}秒` : `${m}分钟`;
}

/**
 * 起播时应跳到的位置（秒）；不需要跳返回 null。
 * 已在片头之后（恢复了进度）不跳；片头长到占满整片（短片 / 时长异常）不跳。
 */
export function introSkipTarget(cfg: SkipConfig, currentTime: number, duration: number): number | null {
  if (!cfg.intro) return null;
  if (currentTime >= cfg.intro - 1) return null;
  if (duration > 0 && cfg.intro >= duration - 30) return null;
  return cfg.intro;
}

/** 是否已进入片尾（秒） */
export function inOutro(cfg: SkipConfig, currentTime: number, duration: number): boolean {
  if (!cfg.outro || !(duration > 0)) return false;
  // 片尾长度至少要比整片短 60 秒，避免时长未知 / 异常时一开播就判定结束
  if (cfg.outro >= duration - 60) return false;
  return currentTime >= duration - cfg.outro;
}
