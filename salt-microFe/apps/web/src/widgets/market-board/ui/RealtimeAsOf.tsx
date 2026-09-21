"use client";

import { FlexBox } from "@repo/ui/flexBox";
import { Text } from "@repo/ui/text";

import { MARKET_MESSAGES } from "@/entities/market";
import { ConnectionStatus, useRealtimeConnection } from "@/shared/api";
import { formatClockTime } from "@/shared/lib";

/** 기준 시각을 다시 읽는 간격. 표시 단위가 분이라 이보다 촘촘할 이유가 없다. */
const RECEIVED_AT_TICK_MS = 30_000;

/**
 * 실시간 표 헤더의 "기준 시각 / 연결 끊김".
 *
 * **표에서 떼어낸 이유**: 시각이 바뀔 때마다 다시 그려지는 것이 이 컴포넌트 하나여야
 * 한다. 원래는 표가 `receivedAt` state 를 들고 있어서 30초마다 100행이 다시 그려졌다
 * (`FE-REQ-011` FR-13).
 */
export const RealtimeAsOf = () => {
  const { status, lastMessageAt } = useRealtimeConnection(RECEIVED_AT_TICK_MS);

  const live = status === ConnectionStatus.Open && lastMessageAt !== null;
  const label =
    status === ConnectionStatus.Reconnecting
      ? MARKET_MESSAGES.realtimeDisconnected
      : live
        ? MARKET_MESSAGES.realtimeAsOf(formatClockTime(new Date(lastMessageAt)))
        : MARKET_MESSAGES.realtimeWaiting;

  return (
    <FlexBox align="center" gap="xs">
      {/* 점은 장식이다. 상태는 문구가 말한다 — 색만으로 구분하지 않는다 */}
      <Text variant="caption" color={live ? "success" : "muted"} aria-hidden>
        ●
      </Text>
      <Text color="tertiary">{label}</Text>
    </FlexBox>
  );
};
