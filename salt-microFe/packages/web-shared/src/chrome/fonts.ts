import { Inter, Noto_Sans_KR } from "next/font/google";

/**
 * 웹 글꼴 — `@repo/tokens` 의 Inter · Noto Sans KR 을 **빌드 때 받아 같은 origin 으로** 서비스한다(2026-11-02).
 *
 * 전에는 `@repo/ui` 토큰이 구글 폰트 파일 주소를 직접 걸었는데 그 파일이 사라져(404) 시스템 글꼴로 그려지고 있었다.
 * `next/font` 는 빌드 때 받아 자기 정적 자산으로 내보내 런타임 외부 요청이 0 이고, zone 마다 같은 설정이라 같은 글꼴이다.
 * 한글은 유니코드 범위로 나뉜 조각을 쓰는 글자만 받는다(미리 받기는 끔 — 조각이 백 개 남짓이다).
 * 토큰(`@repo/ui/tokens`)은 아래 변수 이름을 읽는다 — 이름을 바꾸면 거기도 바꾼다.
 */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-noto-sans-kr" });

/** 루트 `<html className>` 에 건다 */
export const FONT_VARIABLES = `${inter.variable} ${notoSansKr.variable}`;
