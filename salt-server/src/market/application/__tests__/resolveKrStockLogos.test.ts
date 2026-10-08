import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KrLogoSource, KrStockStore } from "../../domain";
import { ResolveKrStockLogos } from "../ResolveKrStockLogos";
import type { ResolveKrStockUniverse } from "../SyncKrStock";

/** 32×32 세로 경계 RGBA — `blur` 픽셀에 걸쳐 검정 → 흰색 */
const edgeImage = (blur: number) => {
  const W = 32;
  const rgba = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const t = blur <= 1 ? (x >= 16 ? 1 : 0) : Math.min(1, Math.max(0, (x - (16 - blur / 2)) / blur));
      const v = Math.round(255 * t);
      rgba.set([v, v, v, 255], (y * W + x) * 4);
    }
  }
  return { width: W, height: W, rgba };
};
const SHARP = edgeImage(1);
const BLURRY = edgeImage(4);

const setup = (images: Record<string, typeof SHARP | null | "error">, homepage: string | null = "lg.com") => {
  const saved: Array<{ code: string; logoSource: KrLogoSource; homepage?: string | null }> = [];
  const store = {
    logoTargets: async () => [{ code: "066570", market: "KOSPI" as const, homepage: null, homepageCheckedAt: null }],
    saveLogo: async (code: string, r: { logoSource: KrLogoSource; homepage?: string | null }) => {
      saved.push({ code, ...r });
    },
  } as unknown as KrStockStore;
  const universe = { execute: async () => ["066570"] } as unknown as ResolveKrStockUniverse;
  const imagesProbe = {
    fetchRgba: async (url: string) => {
      const key = url.includes("/ticker/") ? "ticker" : "domain";
      const v = images[key];
      if (v === "error") throw new Error("network");
      return v ?? null;
    },
  };
  const homepages = { homepages: async () => new Map([["066570", homepage]]) };
  return { saved, deps: { store, universe, images: imagesProbe, homepages, logoDevToken: "pk_t", now: () => new Date("2026-10-08T00:00:00Z") } };
};

describe("ResolveKrStockLogos — 종목별 로고 출처 판정", () => {
  it("도메인이 선명하면 도메인(티커가 흐려도) — 홈페이지를 같이 저장한다", async () => {
    const { saved, deps } = setup({ domain: SHARP, ticker: BLURRY });
    await new ResolveKrStockLogos(deps).execute();
    assert.deepEqual(saved, [{ code: "066570", homepage: "lg.com", logoSource: "domain", checkedAt: new Date("2026-10-08T00:00:00Z") }]);
  });

  it("도메인이 흐리면 티커, 둘 다 흐리거나 없으면 none", async () => {
    const a = setup({ domain: BLURRY, ticker: SHARP });
    await new ResolveKrStockLogos(a.deps).execute();
    assert.equal(a.saved[0]!.logoSource, "ticker");
    const b = setup({ domain: BLURRY, ticker: null });
    await new ResolveKrStockLogos(b.deps).execute();
    assert.equal(b.saved[0]!.logoSource, "none");
  });

  it("받다가 실패하고 다른 후보도 못 쓰면 판정을 미룬다(저장 안 함) — 일시 장애가 30일 동안 로고를 지우지 않게", async () => {
    const { saved, deps } = setup({ domain: "error", ticker: BLURRY });
    const result = await new ResolveKrStockLogos(deps).execute();
    assert.equal(saved.length, 0);
    assert.equal((result as { deferred: number }).deferred, 1);
  });

  it("logo.dev 키가 없으면 아무것도 하지 않는다", async () => {
    const { saved, deps } = setup({ domain: SHARP, ticker: SHARP });
    const result = await new ResolveKrStockLogos({ ...deps, logoDevToken: undefined }).execute();
    assert.equal(saved.length, 0);
    assert.equal(result.checked, 0);
  });
});
