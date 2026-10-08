import { logger } from "../../shared/config/logger";
import {
  KR_LOGO_MIN_SHARPNESS,
  krLogoCandidates,
  krLogoSharpness,
  toLuminanceOverWhite,
  type KrCompanyHomepageSource,
  type KrLogoImageProbe,
  type KrLogoSource,
  type KrStockStore,
} from "../domain";
import type { ResolveKrStockUniverse } from "./SyncKrStock";

/** 판정을 다시 하는 주기 — 회사 로고는 거의 안 바뀐다 */
export const KR_LOGO_RECHECK_MS = 30 * 24 * 60 * 60 * 1000;

export interface ResolveKrStockLogosDeps {
  store: KrStockStore;
  universe: ResolveKrStockUniverse;
  images: KrLogoImageProbe;
  /** DART 키가 없으면 `null` — 도메인 조회 없이 티커만 본다 */
  homepages: KrCompanyHomepageSource | null;
  /** logo.dev 퍼블리셔블 키 — 없으면 판정하지 않는다(화면도 이니셜) */
  logoDevToken?: string;
  now?: () => Date;
}

/**
 * 종목별 로고 출처 판정(F011 FR-47) — 유니버스 종목 중 판정한 적 없거나 30일 지난 것만.
 *
 * 순서: (DART 키가 있으면) 홈페이지 도메인을 처음 한 번 받아 둔다 → 후보(도메인 → 티커)를 차례로 받아 선명도를 잰다 → 기준
 * (`KR_LOGO_MIN_SHARPNESS`)을 넘는 첫 출처를 저장, 없으면 `none`. 외부 호출은 전부 트랜잭션 밖이고 저장은 종목마다 한 줄이다.
 *
 * **이미지를 받지 못한 실패(네트워크 · 디코딩)는 판정하지 않고 넘긴다** — `none` 으로 저장하면 일시 장애가 30일 동안 로고를
 * 지운다. 다음 회차가 다시 본다
 */
export class ResolveKrStockLogos {
  private readonly now: () => Date;

  constructor(private readonly deps: ResolveKrStockLogosDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async execute() {
    const token = this.deps.logoDevToken;
    if (!token) return { checked: 0, skipped: "no_logo_dev_token" as const };

    const now = this.now();
    const codes = await this.deps.universe.execute();
    const targets = await this.deps.store.logoTargets(codes, new Date(now.getTime() - KR_LOGO_RECHECK_MS));

    // 홈페이지는 처음 한 번만(확인했는데 없던 종목도 다시 묻지 않는다)
    const needHomepage = this.deps.homepages ? targets.filter((t) => t.homepageCheckedAt === null).map((t) => t.code) : [];
    const homepages = needHomepage.length > 0 ? await this.deps.homepages!.homepages(needHomepage) : new Map<string, string | null>();

    const tally: Record<KrLogoSource, number> = { domain: 0, ticker: 0, none: 0 };
    let deferred = 0;
    for (const target of targets) {
      const freshHomepage = homepages.has(target.code) ? homepages.get(target.code)! : undefined;
      const homepage = freshHomepage !== undefined ? freshHomepage : target.homepage;
      const source = await this.judge({ ...target, homepage }, token);
      if (source === null) {
        deferred++;
        continue;
      }
      tally[source]++;
      await this.deps.store.saveLogo(target.code, {
        ...(freshHomepage !== undefined ? { homepage: freshHomepage } : {}),
        logoSource: source,
        checkedAt: now,
      });
    }
    logger.info(
      `🖼️ 국내 주식 로고 판정 ${targets.length}종목 — 도메인 ${tally.domain} · 티커 ${tally.ticker} · 없음 ${tally.none} · 미룸 ${deferred}`,
    );
    return { checked: targets.length, ...tally, deferred };
  }

  /** 선명한 첫 출처. 모든 후보가 없거나(404) 흐리면 `none`, 받다가 실패하면 `null`(판정 미룸) */
  private async judge(target: Parameters<typeof krLogoCandidates>[0], token: string): Promise<KrLogoSource | null> {
    let failed = false;
    for (const candidate of krLogoCandidates(target, token)) {
      try {
        const image = await this.deps.images.fetchRgba(candidate.url);
        if (!image) continue;
        const sharpness = krLogoSharpness(toLuminanceOverWhite(image.rgba), image.width, image.height);
        // 경계가 하나도 없는 이미지(단색)는 판정 근거가 없다 — 로고로 쓰지 않는다
        if (sharpness !== null && sharpness >= KR_LOGO_MIN_SHARPNESS) return candidate.source;
      } catch {
        failed = true;
      }
    }
    return failed ? null : "none";
  }
}
