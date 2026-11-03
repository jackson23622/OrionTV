import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  formatSkip,
  inOutro,
  introSkipTarget,
  loadSkipConfig,
  loadSkipEnabled,
  saveSkipConfig,
  saveSkipEnabled,
} from "../skipSegments";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      __store: store,
    },
  };
});

const store = (AsyncStorage as any).__store as Record<string, string>;

describe("skipSegments", () => {
  beforeEach(() => Object.keys(store).forEach((k) => delete store[k]));

  it("开关默认关闭，可持久化", async () => {
    expect(await loadSkipEnabled()).toBe(false);
    await saveSkipEnabled(true);
    expect(await loadSkipEnabled()).toBe(true);
  });

  it("按片名存取，忽略大小写与首尾空格；没设过返回 null，清除后为 0", async () => {
    expect(await loadSkipConfig("friends")).toBeNull();
    await saveSkipConfig(" Friends ", { intro: 90, outro: 60 });
    expect(await loadSkipConfig("friends")).toEqual({ intro: 90, outro: 60 });
    await saveSkipConfig("friends", { intro: 0, outro: 0 });
    expect(await loadSkipConfig("friends")).toEqual({ intro: 0, outro: 0 });
  });

  it("开关未设置时用 fallback", async () => {
    expect(await loadSkipEnabled(true)).toBe(true);
    await saveSkipEnabled(false);
    expect(await loadSkipEnabled(true)).toBe(false);
  });

  it("非法数据归零 / 解析失败返回 null", async () => {
    store["mytv_skip_segments:b"] = '{"intro":"x","outro":-5}';
    expect(await loadSkipConfig("b")).toEqual({ intro: 0, outro: 0 });
    store["mytv_skip_segments:c"] = "not json";
    expect(await loadSkipConfig("c")).toBeNull();
  });

  it("片头判定", () => {
    const cfg = { intro: 90, outro: 0 };
    expect(introSkipTarget(cfg, 0, 2700)).toBe(90);
    expect(introSkipTarget(cfg, 0, 0)).toBe(90);
    expect(introSkipTarget(cfg, 300, 2700)).toBeNull();
    expect(introSkipTarget(cfg, 0, 100)).toBeNull();
  });

  it("片尾判定", () => {
    const cfg = { intro: 0, outro: 120 };
    expect(inOutro(cfg, 2579, 2700)).toBe(false);
    expect(inOutro(cfg, 2580, 2700)).toBe(true);
    expect(inOutro(cfg, 10, 0)).toBe(false);
    expect(inOutro(cfg, 100, 150)).toBe(false);
  });

  it("formatSkip", () => {
    expect(formatSkip(0)).toBe("不跳过");
    expect(formatSkip(45)).toBe("45秒");
    expect(formatSkip(120)).toBe("2分钟");
    expect(formatSkip(95)).toBe("1分35秒");
  });
});
