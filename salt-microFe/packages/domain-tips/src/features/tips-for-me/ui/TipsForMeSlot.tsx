"use client";

import dynamic from "next/dynamic";

/**
 * 내게 맞춘 팁 자리 — **지연 로딩되는 클라이언트 잎**(`MyNumbersSlot` 과 같은 꼴). 로그인한 사람에게만 뜻이 있고 조회 훅이 첫 로드 JS 를 늘린다 —
 * 검색으로 들어온 공개 독자에게 싣지 않는다. 서버 HTML 에는 칸이 없다(세션을 모른다 — ISR 글은 사람마다 같아야 한다). 배럴엔 이 자리만 올린다
 */
const TipsForMePanel = dynamic(() => import("./TipsForMePanel").then((mod) => mod.TipsForMePanel), { ssr: false, loading: () => null });

export const TipsForMeSlot = () => <TipsForMePanel />;
