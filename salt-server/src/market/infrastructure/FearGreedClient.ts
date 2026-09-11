import axios from "axios";

import type { FearGreedPort } from "../domain";

const FEAR_GREED_URL = "https://api.alternative.me/fng/";

/**
 * Fear & Greed 지수.
 *
 * **실패를 던지지 않고 `null` 을 준다.** 이 지수는 심리 점수의 보정항이고, 없으면
 * 나머지 셋으로 계산된다. 여기서 던지면 외부 사이트 하나가 우리 화면을 세운다.
 */
export class FearGreedClient implements FearGreedPort {
  async current() {
    try {
      const response = await axios.get(FEAR_GREED_URL);
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
