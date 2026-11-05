/**
 * 금융 팁 브라우저 조회 키 — 풀이(feature)가 카드 모음(page)을 무효화하려고 같이 본다. 상수만 둔다:
 * 브라우저 요청 함수(`apiFetch`)를 이 엔티티 배럴에 올리면 배럴을 값으로 읽는 공개 서버 페이지 번들에 딸려 간다
 * (`performance-frontend.md` §7 — 2026-11-05 S2b `/tips` 143 → 147 kB 실측 뒤 옮김)
 */
export const tipQueryKeys = {
  quizCards: ["tips", "quiz-cards"] as const,
  myNumbers: (slug: string) => ["tips", "my-numbers", slug] as const,
};
