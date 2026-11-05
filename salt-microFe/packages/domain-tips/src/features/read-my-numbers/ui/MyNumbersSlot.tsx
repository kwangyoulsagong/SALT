"use client";

import dynamic from "next/dynamic";

/**
 * 내 숫자 칸 자리 — **지연 로딩되는 클라이언트 잎**(`HeaderWatchlistStar` 와 같은 꼴). 칸은 로그인한 사람에게만 뜻이 있고
 * 조회 훅(`useQuery`)이 첫 로드 JS 를 6 kB 늘렸다(글 115 → 121 kB, 2026-11-05 S2d 실측) — 검색으로 들어온 공개 글 독자에게 싣지 않는다.
 * 서버 HTML 에는 칸이 없다(세션을 모른다) — 수화가 어긋나지 않는다. 배럴엔 이 자리만 올린다(패널을 올리면 정적으로 딸려 간다).
 */
const MyNumbersPanel = dynamic(() => import("./MyNumbersPanel").then((mod) => mod.MyNumbersPanel), { ssr: false, loading: () => null });

export const MyNumbersSlot = ({ slug }: { slug: string }) => <MyNumbersPanel slug={slug} />;
