---
id: SRV-REQ-061
feature: F008
area: backend
kind: FIX
title: "시세 등락 기준 바로잡기 — '24시간'이 아니라 전일 대비(해설 프롬프트 · AI 입력 공개 · 문장 검사)"
priority: high
created: 2026-11-20
status: done
source: "FE-REQ-074 검증 2회차에서 찾음 · 사용자 2026-11-20 \"베스트 케이스로\""
---

## Summary

업비트 시세의 `signed_change_rate` · `high_price` · `low_price` 는 **당일**(한국 시각 오전 9시에 넘어감) 값 — 전일 종가 대비 등락 · 당일 고저다.
진짜 24시간 누적은 `acc_trade_price_24h` · `acc_trade_volume_24h` 뿐이다. 우리 계약 필드 이름(`change24h` · `high24h` · `low24h`)을 보고
해설 프롬프트가 LLM 에 `24시간 변동률` 이라 주었고, AI 입력 공개 문구 · 주석도 같았다. 필드 이름은 계약이라 그대로 두고 **뜻을 적은 곳**을 고친다.
과거 검산(`judgmentBacktest` — 일봉 종가 / 전일 종가)은 원래 같은 기준이라 값 · 채점은 바뀌지 않는다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 해설 프롬프트 줄 `24시간 변동률` → `전일 대비 변동률`. `24시간 거래대금` 은 그대로(진짜 24시간). 프롬프트 문구 허용 목록(`PROMPT_PHRASES`)에서 뺀다 |
| FR-2 | AI 입력 공개(`llmInputs`) "현재가 · 24시간 변동률 · 거래대금" → "현재가 · 전일 대비 변동률 · 24시간 거래대금" |
| FR-3 | 해설 문장 검사 `wrong_change_window` — 뉴스 아닌 칸에서 등락(%·오르내림)을 지난 24시간에 붙인 문장은 버린다. 통과: 24시간 거래대금 · 거래량 · "판단 뒤 / 다음 / 앞으로 24시간"(앞으로의 기간) · 시장이 24시간 열린다는 말 · 뉴스 칸 제목 인용. 배치 · 스트림 같은 함수(`guardExplanationLine`) |
| FR-4 | 뜻을 잘못 적은 주석 · Swagger 설명 — `UpbitClient.toQuote` 에 필드별 창 표 · 시장 요약 · 검색 · `wide_move` 임계 |

## 하지 않는 것

- 계약 필드 이름 바꾸기(`change24h` → …) — 서버 · BFF · 웹 · 예측 · DB 열(`price_change_24h`)까지 걸린다. 뜻은 `toQuote` 표 한 곳에 적는다
- 저장된 해설 다시 만들기 — 실측 결과 바꿀 문장 0(아래)

## 확인

- 시험 2,036 통과(새 경계 표 11 — `explanationGate.test.ts`) · `tsc` · `lint`
- 저장된 해설 223벌 중 뉴스 아닌 칸의 "24시간" 문장 50개를 새 규칙에 대 봄 — 걸림 0 · 50개 전부 "판단 뒤 24시간"(앞으로의 기간). 오탐 0 · 고칠 저장 문장 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규 · done — 짝 `FE-REQ-075`(화면 이름표). 루트 `requirements/specs/done/MARKET-change-basis-slice.md` |
