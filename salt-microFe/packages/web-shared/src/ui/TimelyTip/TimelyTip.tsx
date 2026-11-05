"use client";

// 클라이언트 잎: 로그인 여부 · 조회 · 닫기 상태를 갖는다. 서버 HTML 에는 칸이 없다(때맞춘 팁은 곁 칸 — 없으면 화면이 그대로다).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TimelyTipCard } from "@repo/ui/timely-tip-card";

import { apiFetch, readApiError, useHasSession } from "../../api";
import { INVESTMENTS_BASE_URL, ROUTES } from "../../config";
import { TIMELY_TIP_MESSAGES as M } from "../../i18n";
import { CrossZoneLink } from "../CrossZoneLink/CrossZoneLink";
import type { TimelyTipContext } from "./context";


/** BFF `TipForMeVM`(`BFF-REQ-049`) — 서버가 고른 0~1건 */
interface TimelyTipResponse {
  tip: { slug: string; title: string; summary: string; trigger: string; sourceUrl: string; sourceName: string; validUntil: string } | null;
  degraded: boolean;
}

const TIPS_API = `${INVESTMENTS_BASE_URL}/api/app/tips`;
const timelyTipKey = (context: TimelyTipContext) => ["timely-tip", context] as const;
/** 하루 안에 바뀔 일이 드물다(트리거는 목표 만들기 · 달) — 포커스마다 다시 부르지 않는다 */
const STALE_MS = 10 * 60_000;

const fetchTip = async (context: TimelyTipContext, signal: AbortSignal): Promise<TimelyTipResponse> => {
  const response = await apiFetch(`${TIPS_API}/for-me?context=${context}`, { signal });
  if (!response.ok) throw await readApiError(response, "timely-tip");
  return (await response.json()) as TimelyTipResponse;
};

/**
 * 때맞춘 팁 칸(`FE-REQ-058` FR-6) — 도메인 zone 화면이 맥락 하나를 주고 놓는다. **무엇을 띄울지는 서버가 고른다**(0~1건 · 닫은 것 제외 ·
 * 공개 플래그). 이 칸은 조회 · 닫기 · 그리기만 한다 — 글 문장 · 트리거를 모른다.
 *
 * shared 에 둔 이유: 저축 · 가계부(뒤에 셸 홈) 세 zone 이 같은 BFF 칸을 같은 모양으로 쓰고, `domain-*` 끼리는 import 할 수 없다.
 * 도메인 개념(제도 · 글)은 서버 · BFF 에 있고 여기는 "서버가 고른 카드 한 장"이라는 칸 계약만 안다.
 *
 * 로그아웃 · 실패 · 없음이면 아무것도 그리지 않는다(빈 카드 0). 닫으면 바로 지우고 서버에 남긴다 — 실패하면 다시 보인다.
 */
export const TimelyTip = ({ context, className }: { context: TimelyTipContext; className?: string }) => {
  const signedIn = useHasSession();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: timelyTipKey(context),
    queryFn: ({ signal }) => fetchTip(context, signal),
    enabled: signedIn === true,
    staleTime: STALE_MS,
    retry: false,
  });
  const dismiss = useMutation<void, Error, string, { previous?: TimelyTipResponse }>({
    mutationFn: async (slug) => {
      const response = await apiFetch(`${TIPS_API}/${encodeURIComponent(slug)}/dismiss`, { method: "POST" });
      if (!response.ok) throw await readApiError(response, "timely-tip-dismiss");
    },
    // 닫기는 금액이 아닌 상태라 먼저 지운다(`fsd-features.md` 낙관적 갱신 허용 범위)
    onMutate: async () => {
      const previous = queryClient.getQueryData<TimelyTipResponse>(timelyTipKey(context));
      queryClient.setQueryData<TimelyTipResponse>(timelyTipKey(context), { tip: null, degraded: false });
      return { previous };
    },
    onError: (_error, _slug, ctx) => queryClient.setQueryData(timelyTipKey(context), ctx?.previous),
  });

  const tip = data?.tip;
  if (!tip) return null;
  return (
    <TimelyTipCard
      className={className}
      eyebrow={M.eyebrow}
      title={tip.title}
      summary={tip.summary}
      sourceUrl={tip.sourceUrl}
      sourceName={tip.sourceName}
      sourceLabel={M.official}
      readMore={<CrossZoneLink href={ROUTES.tip(tip.slug)}>{M.readMore}</CrossZoneLink>}
      dismissLabel={M.dismiss}
      onDismiss={() => dismiss.mutate(tip.slug)}
      dismissing={dismiss.isPending}
    />
  );
};
