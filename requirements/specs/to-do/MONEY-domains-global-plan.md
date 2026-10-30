---
id: GLOBAL-MONEY-DOMAINS
title: "돈 관리 앱 재정의 — 도메인 zone · 서버 MSA(Kotlin) · 예측 온톨로지 · F012~F015 전 영역 계획"
priority: high
labels: [F012, F013, F014, F015, architecture, db, server, bff, fe, rn, forecast]
created: 2026-10-30
---

## Summary

SALT 는 투자 앱이 아니라 **돈 관리 앱**이다(사용자 2026-10-30: *"지금 이상해 요즘 너무 투자쪽만 밀다 보니"*).
도메인 다섯 — 셸(홈) · 투자 · 저축 · 가계부 · 금융 팁 — 을 프론트 zone · 서버 서비스 · RN 번들 · BFF 경로가 같은 이름으로 나눈다.
**투자는 동결**(지금 기획된 것까지), 새 기능은 F012~F015. 바탕은 **모으는 재미**(칭찬 · 재촉 · 벌칙 · 뽑기 없이).

| 읽을 것 | 위치 |
|---|---|
| 기능 기획서(읽기 쉬운 판 · 리서치 출처) | `pm/docs/2026-10-30-money-domains-spec.html` |
| 기획서 MD | `pm/requirements/specs/in-progress/FEATURE-012`~`015` |
| 프론트 설계 | `salt-microFe/docs/architecture/2026-10-30-domain-zones.html` |
| 서버 설계 | `salt-server/docs/2026-10-30-msa-kotlin-migration.html` |
| 예측 설계 | `salt-forecast/docs/2026-10-30-ontology-agent.html` |
| 결정 | `ADR-005`(도메인 zone) · `ADR-006`(서버 MSA · Kotlin) · `ADR-007`(예측 스키마 주인 · 온톨로지) |

## REQ 지도

### 아키텍처 (기능 무관)

| 영역 | REQ | 몫 | 단계 |
|---|---|---|---|
| FE | `FE-REQ-052` | 규칙 개정 · 레지스트리 5 zone · lint 도메인 축 · `web-tax` 삭제 | F0 |
| FE | `FE-REQ-053` | 투자 zone 분리(`domain-invest` · `apps/web-investment`) | F1 |
| RN | `RN-REQ-032` | 번들 이름 · 4탭 · 네이티브/웹뷰 경계 · 기존 RN REQ 18건 대체 블록 | 착수 전 |
| SRV | `SRV-REQ-043` | Kotlin 플랫폼(S0) | S0 |
| SRV | `SRV-REQ-044` | 이벤트 · 아웃박스 · `contracts/events` | S0~S1 |
| SRV | `SRV-REQ-049` | 투자 서비스 이전 S4~S7 · Express 종료(기능 추가 0) | S4~S7 |
| DB | `DB-REQ-036` | 서비스별 스키마 · 계정 · Flyway 주인 이전 · export 뷰 | S0~S6 |
| BFF | `BFF-REQ-045` | 라우팅 스위치 · 골든 JSON · 그림자 · 이중 토큰 | S0 |
| FC | `FC-REQ-025` | forecast DDL 주인 · public 읽기 제거 · 일봉 이벤트 | O5(= S5) |

### 기능 × 영역

| 기능 | DB | SRV | BFF | FE | RN | FC |
|---|---|---|---|---|---|---|
| **F012** 저축 목표 | `DB-REQ-037` | `SRV-REQ-045` | `BFF-REQ-047` | `FE-REQ-056` | `RN-REQ-033` | `FC-REQ-024` |
| **F013** 가계부 | `DB-REQ-038` | `SRV-REQ-046` | `BFF-REQ-048` | `FE-REQ-057` | `RN-REQ-034` | (`FC-REQ-024` 착지 채점) |
| **F014** 금융 팁 | `DB-REQ-039` | `SRV-REQ-047` | `BFF-REQ-049` | `FE-REQ-058` | (웹뷰 — `RN-REQ-035` FR-5) | — |
| **F015** 셸 · 홈 · 온보딩 | `DB-REQ-040` | `SRV-REQ-048` | `BFF-REQ-046` | `FE-REQ-054` · `055` | `RN-REQ-035` | — |
| **F008** 온톨로지 · 에이전트 (투자 동결 범위 안 · 예측 바탕) | — | — | — | — | — | `FC-REQ-022` · `023` |

영역 REQ 를 기능당 한 파일로 묶었다(F011 이후 관례). 종류(UI · FUNC · API · PERF)는 파일 안 FR 표로 나눈다.

## 순서 — 무엇이 무엇을 막는가

```
ADR-005 ─ FE-052(F0) ─ FE-053 + FE-055 + BFF-046 (F1, 한 PR: 홈 계약 변경) ─ FE-054(F2) ─ FE-056(F3) ─ FE-057(F4) ─ FE-058(F5)
ADR-006 ─ SRV-043 + DB-036 + BFF-045 + SRV-044 (S0) ─ DB-037/038 + SRV-045/046 (S1) ─ DB-039 + SRV-047 + notification (S2) ─ DB-040 + SRV-048 (S3) ─ SRV-049 (S4~S7)
ADR-007 ─ FC-022(O1 · O2) ─ FC-023(O3) ;  FC-024(O4) 는 S1 과 같이 ;  FC-025(O5) 는 S5 와 같이
```

- 새 도메인(저축 · 가계부)이 **처음부터 Kotlin 서비스로** 태어난다 — S1 이 F3 · F4 보다 먼저거나 같이.
- 셸 홈 카드(BFF-046)는 S0 전에도 된다 — 지금 Express 의 goals · coach · portfolio 를 BFF 가 카드로 감싼다.
- 투자 남은 작업은 마스터 인덱스 §4-1 목록 그대로, 새 도메인 작업과 번갈아(투자만 연속으로 잡지 않는다).

## 판단 — 리뷰가 볼 곳

1. **zone = 도메인** — 하단 탭이 zone 을 넘는 대가를 prerender · 문서 간 전환으로 가린다. Safari 는 일반 이동(실측 QA-001 항목)
2. **BFF 는 Node 유지** — 이전의 안전장치. 프론트 계약 무변경이 서버 이전의 합격 기준
3. **개인 재무 전망도 채점** — 계산은 도메인 서비스, 채점만 forecast(사용자 해시)
4. **결제 문자 원문 0** — DB 열 · 로그 · BFF 로그 · 앱 저장소 어디에도. 연동이 아니라 사용자가 붙여넣거나 공유 시트로 보낸다
5. **재미는 보여 주기로, 평가는 하지 않는다** — 연속 일수 · 실패 표시 · 순위 · 뽑기 · 앱 칭찬 0

## 사용자 결정

- 2026-10-30 **미국 주식 TBA 6건(F008 FR-33~38)은 보류** — "만들지 않음"으로 닫지 않는다. 동결 기간에는 착수하지 않는다.
- 2026-10-30 **금융 팁은 공개 전 법무 확인을 받는다** — 금소법(광고 · 중개) · 자본시장법(유사투자자문) 원문 대조 포함. 확인 기록이 없으면 `FE-REQ-058` robots 차단 · `SRV-REQ-047` 공개 플래그 꺼짐을 유지한다. 공제 계기판(F013 FR-11) · 제도 계산(F012 FR-12)도 같은 검토에 넣는다.

### 대기

| 항목 | 막는 것 |
|---|---|
| DART 공시 수집을 동결 범위에 넣을지(F008 FR-22 · 23 · 27 "미사용" vs FR-70 "허용 대기") | F008 슬라이스 24 2단계 · 온톨로지 O6 |
| 배포 환경(zone 5 + 서비스 — Compose 이후) | F1 배포 · S7 |

## 검증 · 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 모든 REQ | 문서만 — 코드 착수 전 | 각 REQ 착수 시 |
| 기준선 통계 · 공제율 · 제도 파라미터 원문 대조 | 보도 기준 숫자 | `FEATURE-012` FR-1 · `SRV-REQ-047` 착수 전 |
| Spring Boot 4 · Kotlin 2.2 실제 호환 조합 | 설계는 공개 발표 기준 | `SRV-REQ-043` S0 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규 — ADR 3 · 영역 REQ 32(FE 7 · RN 4 · BFF 5 · SRV 7 · DB 5 · FC 4) |
| 2026-10-30 | 미국 주식 TBA 보류 결정 반영 |
| 2026-10-30 | 금융 팁 공개 전 법무 확인 결정 반영 |
