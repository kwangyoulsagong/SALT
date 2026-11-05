"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { tipQueryKeys, type QuizResult } from "@/entities/tip";

const answerQuiz = async (slug: string, choice: number): Promise<QuizResult> => {
  // 세션 쿠키가 있으면 BFF 가 기록 경로로 보낸다 — 로그인 없이도 채점은 된다(정답 판정은 늘 서버)
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/tips/${encodeURIComponent(slug)}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  });
  if (!response.ok) throw await readApiError(response, "tip-quiz");
  return (await response.json()) as QuizResult;
};

/** 풀이 한 번 — 채점은 서버. 처음 카드가 되면 모음을 다시 받는다. 재시도하지 않는다(사용자가 다시 누른다) */
export const useAnswerQuiz = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation<QuizResult, Error, number>({
    mutationFn: (choice) => answerQuiz(slug, choice),
    onSuccess: (result) => {
      if (result.collected) void queryClient.invalidateQueries({ queryKey: tipQueryKeys.quizCards });
    },
  });
};
