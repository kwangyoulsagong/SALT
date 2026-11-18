---
id: SLICE-FORECAST-DROP-EXTRA-SYMBOLS
title: "예측 — 읽는 곳 없는 설정 FORECAST_EXTRA_SYMBOLS 삭제"
priority: low
labels: [forecast, chore, slice]
created: 2026-11-18
status: done
---

## Summary

사용자가 `.env` 의 `FORECAST_EXTRA_SYMBOLS` 용도를 물었다 — 코드가 읽는 곳이 0(정의 · 도우미 함수만)이라 값을 넣어도 효과가 없었다.
사용자 "정리해"(2026-11-18). 처음엔 따로 브랜치였다가 사용자 "한 브랜치로" — `feat/fc-req-024-personal-projection-scoring` 에 같이.

## 범위

| REQ | 이번 몫 |
|---|---|
| `FC-REQ-007` | `config.py` `extra_symbols` · `extra_symbol_list` 삭제 · `.env.example` 줄 삭제 |

## 판단

1. 동작 변경 0 — 예측 대상은 업비트 원화 마켓 전체 그대로. `FORECAST_KR_EVENT_SYMBOLS` 는 쓰이는 덮어쓰기라 남긴다

## 범위 밖

없음

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-18 | 신규 · done |
