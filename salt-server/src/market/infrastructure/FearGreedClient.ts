import { createHttpClient } from "../../shared/infrastructure";
import type { FearGreedPort } from "../domain";

const FEAR_GREED_URL = "https://api.alternative.me/fng/";

/** 타임아웃 없이 부르면 이 사이트가 느려질 때 심리 계산이 그만큼 매달린다. */
const http = createHttpClient({ timeoutMs: 5_000 });

/**
 * Fear & Greed 지수.
 *
 * **실패를 던지지 않고 `null` 을 준다.** 이 지수는 심리 점수의 보정항이고, 없으면
 * 나머지 셋으로 계산된다. 여기서 던지면 외부 사이트 하나가 우리 화면을 세운다.
 *
 * 재시도를 걸지 않는 이유도 같다 — 실패가 이미 **degraded 경로**이고, 5분마다
 * 다음 회차가 다시 받는다. 여기서 기다리면 그만큼 심리 계산이 늦어질 뿐이다.
 */
export class FearGreedClient implements FearGreedPort {
  async current() {
    try {
      const response = await http.get(FEAR_GREED_URL);
      const latest = response.data.data[0];
      return {
        value: parseInt(latest.value),
        classification: latest.value_classification,
      };
    } catch {
      return null;
    }
  }
}
