import type { MarketApi } from "../../market/application/api";
import type { KrUniverseSource } from "../domain";

/** 국내 판단 유니버스 ACL(F017 v4 2b) — `market` 이 `news` 뒤에 조립되므로 부를 때 찾는다(워커 회차 — 조립이 끝난 뒤) */
export class KrUniverseAdapter implements KrUniverseSource {
  constructor(private readonly market: () => MarketApi) {}

  codes() {
    return this.market().krJudgmentUniverse();
  }
}
