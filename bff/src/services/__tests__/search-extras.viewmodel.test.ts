import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toRisingSectorsVM, toSearchGroupsVM, toSearchRelatedVM } from "../search-extras.viewmodel";

/** 검색 모달 2단계 뷰모델(`BFF-REQ-054`) — 서버 값 그대로 · 틀린 줄 버림 · 모르는 값 `null` */
describe("search-extras viewmodel", () => {
  it("묶음 — 형식이 틀린 줄은 버리고, 순서는 서버 것 그대로", () => {
    const vm = toSearchGroupsVM({
      sectors: [
        { code: "0013", name: "전기·전자", changeRate: 0.73, asOf: "2026-11-10T02:00:00.000Z" },
        { code: "0027", name: null, changeRate: -7, asOf: "2026-11-06T02:00:00.000Z" },
        { code: "0009", name: "제약", changeRate: "0.2", asOf: "2026-11-10T02:00:00.000Z" },
      ],
      indices: [
        { code: "0001", name: "코스피", value: 5254.85, changeRate: 4.7, asOf: "2026-11-10T00:03:27.700Z" },
        { code: "1001", name: "코스닥", value: null, changeRate: 4.2, asOf: "2026-11-10T00:03:27.700Z" },
      ],
      news: [
        {
          id: "a",
          market: "crypto",
          kind: null,
          title: "비트코인",
          source: "coindesk",
          publishedAt: "2026-11-10T02:00:00.000Z",
          url: "javascript:alert(1)",
          summary: "",
          imageUrl: "https://img/a.png",
          related: [{ assetType: "crypto", symbol: "BTC", name: "비트코인", changeRate: 1.2 }, { assetType: "stock", symbol: "AAPL" }],
        },
        { id: "b", market: "kr", kind: "disclosure", title: "", publishedAt: "2026-11-10T02:00:00.000Z" },
        { id: "c", market: "kr", kind: "news", title: "삼성", source: "인포스탁", publishedAt: "어제", related: [] },
      ],
    });
    assert.deepEqual(vm.sectors.map((s) => s.code), ["0013"]);
    assert.deepEqual(vm.indices.map((i) => i.code), ["0001"]);
    assert.equal(vm.news.length, 1);
    assert.equal(vm.news[0]!.url, null); // http(s) 만
    assert.equal(vm.news[0]!.summary, null);
    assert.deepEqual(vm.news[0]!.related.map((r) => r.symbol), ["BTC"]);
  });

  it("빈 · 이상한 응답 — 빈 묶음, 지어내지 않는다", () => {
    assert.deepEqual(toSearchGroupsVM(undefined), { sectors: [], indices: [], news: [] });
    assert.deepEqual(toRisingSectorsVM({ asOf: "x", items: "nope" }), { asOf: null, items: [] });
  });

  it("곁 칸 — 줄이 없으면 basis none, 가격 · 등락 모르면 null", () => {
    const vm = toSearchRelatedVM({
      basis: "sector",
      sector: { code: "0013", name: "전기·전자", changeRate: 0.73 },
      items: [{ assetType: "kr_stock", symbol: "000660", name: "SK하이닉스", logoUrl: "", currentPrice: null, changeRate: 3.2 }],
    });
    assert.equal(vm.basis, "sector");
    assert.deepEqual(vm.items[0], {
      assetType: "kr_stock",
      symbol: "000660",
      name: "SK하이닉스",
      logoUrl: null,
      currentPrice: null,
      changeRate: 3.2,
    });
    assert.deepEqual(toSearchRelatedVM({ basis: "co_tagged", items: [] }), { basis: "none", sector: null, items: [] });
    assert.equal(toSearchRelatedVM({ basis: "weird", items: [{ assetType: "crypto", symbol: "ETH" }] }).basis, "none");
  });
});
