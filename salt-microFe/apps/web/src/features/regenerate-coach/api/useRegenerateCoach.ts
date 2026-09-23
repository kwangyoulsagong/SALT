"use client";

import {
  readGenerationOutcome,
  type CoachGenerationAccepted,
} from "@repo/core/coach";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { coachApi, coachQueryKeys } from "@/entities/coach";
import { readAccessToken } from "@/shared/api";

import { regenerateCoachApi, type RegenerateResult } from "./regenerateCoachApi";

/** `FE-REQ-028` FR-22 — 2초 간격 · 최대 15회(30초) */
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 15;
/** 폴링 밖에서 버튼 상태를 위해 부르는 생성 상태. 쿨다운은 로컬 타이머가 센다 */
const GENERATION_STATUS_STALE_TIME_MS = 30_000;
const TICK_MS = 1_000;

/** 화면이 한 번만 알리는 결과(`FE-REQ-029` FR-51) */
export type RegenerateNotice = "done" | "failed" | "timeout" | "requestFailed" | null;

/**
 * 코치 재생성 — 요청 · 쿨다운 · 완료 폴링 (`FE-REQ-027` FR-40~46 · `FE-REQ-028` FR-20~27).
 *
 * ## 쿨다운은 서버가 판정한다
 *
 * 남은 시간의 출처는 둘뿐이다: `generation-status` 의 `retryAfterSeconds` 와 429 본문. 로컬
 * 타이머는 **표시**만 하고, 0 이 되면 상태를 다시 불러 확인한다(FR-42). 프론트가 쿨다운
 * 길이를 알지 못한다 — 상수가 없다.
 *
 * ## 폴링의 중단 조건 4개 (FR-46 · `FE-REQ-029` FR-10)
 *
 * 완료(`succeeded` · `settled`) · 실패(`failed`) · 언마운트(쿼리 관찰자가 사라진다) ·
 * 최대 15회. 탭이 백그라운드면 React Query 가 간격 호출을 멈춘다(`refetchIntervalInBackground`
 * 기본값 false, FR-26). 요청마다 `signal` 이 붙는다(FR-25).
 *
 * 재생성 mutation 은 **재시도 0회**다(FR-44) — 다시 보내면 쿨다운만 건드린다.
 */
export const useRegenerateCoach = () => {
  const queryClient = useQueryClient();
  const token = readAccessToken();

  const [accepted, setAccepted] = useState<CoachGenerationAccepted | null>(null);
  const [notice, setNotice] = useState<RegenerateNotice>(null);
  /** 쿨다운이 끝나는 시각(ms). 서버가 준 남은 초를 받은 순간 기준이다 */
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const attemptsRef = useRef(0);
  const inFlightRef = useRef(false);

  const status = useQuery({
    queryKey: coachQueryKeys.generationStatus(),
    queryFn: ({ signal }) => coachApi.generationStatus(signal),
    enabled: Boolean(token),
    staleTime: GENERATION_STATUS_STALE_TIME_MS,
    retry: 0,
    refetchInterval: accepted ? POLL_INTERVAL_MS : false,
  });

  const { data, dataUpdatedAt, refetch } = status;
  /**
   * 이미 읽은 응답의 시각. `accepted` 가 바뀌어도 효과가 다시 돌지만, 그때 손에 있는 것은
   * **요청 전** 응답이다 — 그것을 첫 폴링으로 세면 옛 행을 보고 바로 `settled` 로 끝난다
   */
  const processedAtRef = useRef(0);

  // 상태가 올 때마다: 쿨다운을 서버 값으로 맞추고, 폴링 중이면 내 요청이 끝났는지 본다
  useEffect(() => {
    if (!data || dataUpdatedAt === processedAtRef.current) return;
    processedAtRef.current = dataUpdatedAt;

    setCooldownEndsAt(
      data.retryAfterSeconds > 0 ? dataUpdatedAt + data.retryAfterSeconds * 1000 : null,
    );
    setNow(Date.now());

    if (!accepted) return;
    attemptsRef.current += 1;
    const outcome = readGenerationOutcome(data, accepted);

    if (outcome === "pending") {
      if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        setAccepted(null);
        setNotice("timeout");
      }
      return;
    }

    setAccepted(null);
    setNotice(outcome === "failed" ? "failed" : "done");
    // 실패여도 다시 부른다 — 서버가 이전 리포트를 그대로 준다. 성공이면 새 리포트다
    void queryClient.invalidateQueries({ queryKey: coachQueryKeys.report() });
  }, [data, dataUpdatedAt, accepted, queryClient]);

  // 남은 시간 표시용 1초 타이머. 0 에 닿으면 서버에 다시 묻는다(FR-42)
  useEffect(() => {
    if (cooldownEndsAt === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownEndsAt) {
        clearInterval(timer);
        setCooldownEndsAt(null);
        void refetch();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [cooldownEndsAt, refetch]);

  const mutation = useMutation<RegenerateResult, Error, void>({
    mutationFn: () => regenerateCoachApi.generate(),
    retry: 0,
    onSuccess: (result) => {
      if (result.kind === "cooldown") {
        // 429 는 오류가 아니다 — 남은 시간으로 바꿔 보여 준다(FR-43 · FR-76)
        setCooldownEndsAt(Date.now() + result.retryAfterSeconds * 1000);
        setNow(Date.now());
        return;
      }
      attemptsRef.current = 0;
      setAccepted(result.accepted);
      void refetch();
    },
    onError: () => setNotice("requestFailed"),
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const { mutate } = mutation;
  const regenerate = useCallback(() => {
    // 같은 프레임의 연타는 `disabled` 반영 전에 들어온다 — 상태가 아니라 ref 로 막는다
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setNotice(null);
    mutate();
  }, [mutate]);

  const remainingSeconds =
    cooldownEndsAt === null ? 0 : Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000));

  return {
    regenerate,
    /** 요청 중이거나 완료를 기다리는 중 — 버튼 `loading` */
    isGenerating: mutation.isPending || accepted !== null,
    remainingSeconds,
    notice,
    isSignedOut: !token,
  };
};
