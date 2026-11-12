/**
 * 전망 공용 — 소유자 판정 · 404 오류. F008 · `ADR-003` · `SRV-REQ-037`.
 *
 * 주간 변동 범위 카드(`v_forecast_card` → `toForecastHorizon`)는 2026-11-12 삭제했다 — 화면 소비처가 0이 됐다
 * (F017 v2 단계 5 가 시나리오 카드로 바꿈, `SRV-REQ-053` FR-5). 다시 쓰려면 SRV REQ 와 같이 되살린다(git 이력).
 */

import { DomainError, ErrorKind } from "../../../shared/domain";

/** 소유자가 아니거나 전망이 없다 — 404. "막혔다"는 안내조차 주지 않는다(ADR-003). */
export class ForecastNotAvailableError extends DomainError {
  constructor() {
    super("COACH_FORECAST_NOT_AVAILABLE", ErrorKind.NotFound, "Forecast not available");
  }
}

/** 전망 대상자인가 — 서버 설정의 이메일 목록(소문자 비교). 비면 아무도 아니다(ADR-003 §5 되돌리기). */
export const isForecastOwner = (email: string | undefined, owners: readonly string[]): boolean =>
  !!email && owners.some((owner) => owner.trim().toLowerCase() === email.trim().toLowerCase());
