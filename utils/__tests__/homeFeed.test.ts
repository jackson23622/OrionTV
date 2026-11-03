import { appendUnique, chunk, FEED_SHELVES, isNearBottom, nextDiscoverKind } from "../homeFeed";

describe("homeFeed", () => {
  it("片架 key 唯一", () => {
    const keys = FEED_SHELVES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("电影 / 剧集交替，到底的类别跳过", () => {
    const none = { movie: false, tv: false };
    expect(nextDiscoverKind(null, none)).toBe("movie");
    expect(nextDiscoverKind("movie", none)).toBe("tv");
    expect(nextDiscoverKind("tv", { movie: true, tv: false })).toBe("tv");
    expect(nextDiscoverKind(null, { movie: true, tv: true })).toBeNull();
  });

  it("按 key 去重，无新增时返回原数组", () => {
    const prev = [{ k: "1" }, { k: "2" }];
    const r = appendUnique(prev, [{ k: "2" }, { k: "3" }, { k: "3" }, { k: "" }], (i) => i.k);
    expect(r.list.map((i) => i.k)).toEqual(["1", "2", "3"]);
    expect(r.added).toBe(1);
    expect(appendUnique(prev, [{ k: "1" }], (i) => i.k).list).toBe(prev);
  });

  it("chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });

  it("isNearBottom", () => {
    expect(isNearBottom(0, 1000, 3000, 1000)).toBe(false);
    expect(isNearBottom(1000, 1000, 3000, 1000)).toBe(true);
    expect(isNearBottom(0, 1000, 0, 1000)).toBe(false);
  });
});
