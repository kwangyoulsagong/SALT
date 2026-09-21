---
id: SRV-REQ-028
feature: F006
area: srv
kind: FUNC
title: "F006 코치 대화 & 3탭 IA — 도메인 로직 정의 (대화 · 컨텍스트 라우팅 · 홈 조립)"
priority: critical
labels: [ddd, domain, conversation, llm, streaming, homebriefing]
created: 2026-09-09
---

> **2026-09-21 개정.** `ADR-002` — `homebriefing`은 **3블록**(`portfolio` · `plan` · `coach`), 대화 컨텍스트에서 `tax` · `invoice`가 빠졌다. 도메인 작업 4개를 추가했다: ④ `portfolio` 포지션(1년 구간 · MDD · 리스크 레이더 · 거래 미리보기) ⑤ `notification` 1종 생성 · 끄기 ⑥ `onboarding` 2단계 교체 ⑦ 설정 조립. 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14 · B16.

## Summary

**대화가 제품의 핵심이 된다.** 서버 도메인 작업은 ① 대화 유스케이스 ② **질문에 맞는 컨텍스트만 프롬프트에 넣는 라우팅** ③ `homebriefing` 조합 컨텍스트 셋이다.

## 컨텍스트 배치

| 컨텍스트 | 신규 |
|---|---|
| `coach` | `CoachConversation`·`CoachMessage` Aggregate + `policy/{contextRouting,promptGuard,answerGuard}` + `AnswerCoachMessage`·`ListConversations`·`ListMessages` 유스케이스 |
| `homebriefing` | **조합 컨텍스트 신규.** Aggregate 없이 `application`(+`presentation`)만. `BuildHomeBriefing` 유스케이스 |
| `portfolio` | *(2026-09-21)* `GetPositionOverview` · `GetPerformance`(+`1y` · MDD) · `GetRiskRadar` · `PreviewTransaction` + `policy/riskRadar` |
| `notification` | *(2026-09-21)* `RecordSignalUpdate` · `ListAlerts` · `MarkRead` · `MarkAllRead` · `CountUnread` · `Get/UpdateAlertPreferences` |
| `onboarding` | *(2026-09-21)* 2단계 `first_holding` 판정 · `SkipOnboardingStep` |

## 대화 유스케이스

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `AnswerCoachMessage`가 ① `messageId` 선발급 ② 사용자 메시지 저장 ③ 컨텍스트 조립 ④ LLM 스트리밍 ⑤ 부분 저장 ⑥ 카드 생성 ⑦ 완료 저장 순서로 진행한다 | Must |
| FR-2 | **`messageId`를 요청 시점에 선발급**한다. 재연결 멱등의 근거다 | Must |
| FR-3 | 재연결 시 **같은 `messageId`면 LLM을 다시 부르지 않고** 저장된 부분을 이어 보낸다 | Must |
| FR-4 | 같은 `messageId`로 **두 LLM 호출이 동시에 돌지 않게** advisory lock으로 막는다 | Must |
| FR-5 | 부분 저장은 **2초 또는 500자** 중 먼저 오는 것. 트랜잭션 없이 단일 UPDATE | Must |
| FR-6 | 클라이언트 연결 종료 시 **LLM 호출을 `AbortController`로 취소**하고 상태를 마감한다 | Must |
| FR-7 | 대화당 최대 **60초**. 초과 시 `failed` + `errorCode: LLM_TIMEOUT` | Must |
| FR-8 | 서버 재기동 시 `streaming` 잔여 메시지를 **`failed`로 정리**한다 | Must |
| FR-9 | `messageCount`·`lastMessageAt`을 메시지 생성과 **같은 트랜잭션**에서 갱신한다 | Must |
| FR-10 | 첫 메시지에서 `title`을 만든다. **실패해도 대화가 성립**한다(nullable) | Should |

## 컨텍스트 라우팅 (`policy/contextRouting`) — 비용과 지연의 핵심

매 질문마다 포트폴리오·지표·성적표·행동 기록을 전부 프롬프트에 넣으면 **비용과 지연이 커진다.**

| 질문 유형 | 붙이는 컨텍스트 |
|---|---|
| "지금 팔아야 하나?" | 보유 + 최신 추천 + 성적표 + 실패이력 + 지표 |
| "이번 주 얼마 넣을까?" | 주간 계획 + 밴드 + 지표 + 김프 |
| "내 포트폴리오 위험한가?" | 보유 + **리스크 레이더 4축** + 집중도 상한 *(개정 2026-09-21 — "세금 언제까지?" 대체, ADR-002)* |
| "내가 뭘 잘못했나?" | 편향 집계 · 행동 기록(F004) *(개정 2026-09-21 — 청구서 요약 삭제)* |
| 그 외 | **최소 컨텍스트**(총자산 + 최신 추천) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `policy/contextRouting`이 질문을 분류해 **필요한 컨텍스트만** 조립한다 | Must |
| FR-21 | 분류는 **규칙 기반으로 시작**한다(키워드 + 추천 질문 Chip의 고정 매핑). LLM 분류는 비용이 두 배다 | Must |
| FR-22 | 분류 실패 시 **최소 컨텍스트**로 폴백한다. 전부 넣지 않는다 | Must |
| FR-23 | 대화 히스토리는 **최근 N턴**만 넣는다(기본 6턴). 전부 넣으면 비용이 선형으로 는다 | Must |
| FR-24 | 컨텍스트 조립은 **각 컨텍스트의 공개 API**를 부른다. Prisma를 직접 읽지 않는다 | Must |
| FR-25 | 컨텍스트 조립이 실패하면 **그 부분만 빼고** 진행한다. 대화가 죽지 않는다 | Must |
| FR-26 | 프롬프트 토큰 수를 측정하고 상한을 둔다. 초과 시 히스토리를 줄인다 | Must |

## 프롬프트 가드 (`policy/promptGuard`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 프롬프트에 **계좌 식별자·거래소 키를 넣지 않는다** | Must |
| FR-31 | 금액은 **필요한 범위만** 넣는다. 전체 거래 내역을 넣지 않는다 | Must |
| FR-32 | 시스템 프롬프트에 **금지 사항을 명시**한다: 확신 표현 · 목표주가 · 수익률 예측 · 2인칭 인격 평가 · 주문 실행 약속 · 개별 미국주식 신규 매수 추천 | Must |
| FR-33 | **숫자는 주입한다.** LLM이 계산하지 않는다 | Must |
| FR-34 | **프롬프트를 저장·로깅하지 않는다** | Must |

## 답변 가드 (`policy/answerGuard`) — 후처리

프롬프트만으로는 막히지 않는다. **후처리가 두 번째 방어선이다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 확신 표현("확실"·"무조건"·"보장"·"100%")을 검출하면 **규칙 기반 문장으로 대체**한다 | Must |
| FR-41 | 목표주가·수익률 예측 표현을 검출하면 대체한다 | Must |
| FR-42 | **주문 실행 약속**("주문했습니다"·"매수 완료"·"체결했습니다")을 검출하면 대체한다. **문맥 검사가 필요**하다 — "체결 내역"은 정당하다 | Must |
| FR-43 | 2인칭 인격 평가("당신은 ~한 사람")를 검출하면 대체한다 | Must |
| FR-44 | 개별 미국주식 신규 매수 추천을 검출하면 **지수/ETF 또는 보유 종목 관리로 되돌린다** | Must |
| FR-45 | 대체가 일어나면 `explanationSource: 'rule'`로 표시한다. 사용자가 알아야 한다 | Must |
| FR-46 | 검출 건수를 측정한다. **자주 걸리면 프롬프트 문제**다 | Must |
| FR-47 | 후처리는 **스트리밍 중에도** 동작해야 한다. 델타가 나간 뒤 검출되면 늦다 → **문장 단위로 버퍼링해 검사한 뒤 흘린다** | Must |

## 카드 생성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 답변에 추천이 포함되면 **`coach`의 기존 게이트(`policy/renderGate`)를 통과**해야 카드를 만든다 | Must |
| FR-51 | 게이트 미충족이면 **카드를 만들지 않고** 텍스트만 답한다 | Must |
| FR-52 | 카드는 **완성 객체로 한 번에** 저장·전송한다. `delta`로 흘리지 않는다 | Must |
| FR-53 | 카드 내용을 **복사**해 저장한다. insight가 갱신되어도 과거 대화가 바뀌지 않는다 | Must |
| FR-54 | 카드에 `renderable`·`blockedReason`·`signalTrackRecord`·`failureCases`를 포함한다 | Must |

## 주문 미실행

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `coach` 도메인에 **주문 관련 Port가 없다** | Must |
| FR-61 | "매수해줘"류 요청에 **계산과 근거까지만** 답하고 "업비트/증권사에서 직접 주문하세요"로 끝낸다 | Must |
| FR-62 | 프롬프트 가드 + 답변 가드 **양쪽에서** 막는다 | Must |
| FR-63 | 합성 프롬프트 10개("사줘"·"팔아줘"·"자동으로 해줘" 등)로 검증한다 | Must |

## `homebriefing` 조합 컨텍스트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `homebriefing`은 **Aggregate가 없다.** `application`(+`presentation`)만 | Must |
| FR-71 | **3블록**을 각 컨텍스트의 **공개 API**로 부른다: `portfolio` · `plan` · `coach`. **개정 2026-09-21** — `tax` · `invoice` 삭제(ADR-002 · D6) | Must |
| FR-72 | **부분 실패를 설계한다.** 하나가 실패해도 나머지를 내려준다 | Must |
| FR-73 | **비즈니스 규칙을 담지 않는다.** 순서와 조합만 | Must |
| FR-74 | 트랜잭션을 열지 않는다. 각 조회가 자기 경계를 갖는다 | Must |
| FR-75 | **금액 블록 실패 시 `null`** 이다. `0`이 아니다 | Must |
| FR-76 | 총자산은 `portfolio`가 준 **원화 합산**이다. 비원화 보유가 있고 현재 환율이 없으면 `null` + `degraded`. **개정 2026-09-21** — `FxRate.kind` 구분 삭제(ADR-002 · 감사 Q2) | Must |
| FR-77 | AI 추천 블록에도 **게이트가 적용**된다. 미충족이면 `renderable: false` | Must |
| FR-78 | 홈은 **읽기 전용**이다. mutation 유스케이스를 만들지 않는다 | Must |

## `portfolio` 포지션 (2026-09-21 추가, B13 · B14)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `GetPositionOverview`가 Hero를 계산한다: 총 평가금 · 평가 손익(금액 · %) · 투자 원금 · 보유 수 · 최대 비중(종목 · %) · 30일 수익률. **(기본안 — 감사 문서 B13)** | Must |
| FR-81 | `PerformanceRange`에 **`1y`** 를 추가한다(365일). 기존 `1d` · `7d` · `30d` · `90d` · `all`은 그대로. 응답에 구간 **MDD**(`pct` · `peakAt` · `troughAt`)를 붙인다 | Must |
| FR-82 | `policy/riskRadar`가 **4축**을 0~100으로 낸다: 집중도(최대 비중) · 변동성(보유 가중 30일 일간 수익률 표준편차) · 낙폭(90일 MDD) · 뉴스 리스크(보유 종목 최근 7일 부정 기사 비중). 축마다 `value` · `limit` · `breached` · `reasonCode`. 현금 비중 축은 없다 | Must |
| FR-83 | 축 정의(구간 · 정규화 기준)와 **상한은 설정 파일**에서 읽는다. 코드 상수 0건. 사용자별 값이 아니다 | Must |
| FR-84 | 표본이 부족한 축(일봉 < 20 · 기사 0건)은 **`value: null` + `reasonCode`** 다. 0으로 채우지 않는다 | Must |
| FR-85 | `PreviewTransaction`이 생성 · 수정 입력을 받아 **쓰지 않고** 전후 수량 · 이동평균 평단 · 총 취득금액을 돌려준다. 저장과 **같은 재계산 함수**다 **(기본안 — 감사 문서 B14)** | Must |
| FR-86 | 보유를 넘는 매도(미리보기 · 저장 · 수정 · 삭제 결과 포함)는 `INSUFFICIENT_QUANTITY`로 거부한다 | Must |
| FR-87 | 거래 수정에 `transactionDate`를 허용한다. **종목 · 매수/매도 변경은 허용하지 않는다** — 삭제 후 다시 만든다 | Must |
| FR-88 | 공개 API `hasTransactions(userId)`를 낸다. `onboarding`이 쓴다 | Must |
| FR-89 | `portfolio`에 **주문 Port가 없고**, 예상 수익 · 목표가 필드가 없다. 전부 과거 사실이다 | Must |

## `notification` 1종 (2026-09-21 추가, D5)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | 새로 만드는 알림은 **`signal_update` 하나**다. 원인은 둘: F004 최신 추천의 action · symbol 변경, F003 주간 밴드 변경 | Must |
| FR-91 | **가격 급등락만으로 만들지 않는다.** 알림에 "무엇을 확인하라"(`messageCode`)와 딥링크 대상 코드(`coach` · `home.weekly-plan`)가 붙는다 | Must |
| FR-92 | `User.alertsEnabled = false`면 만들지 않는다 (D9) | Must |
| FR-93 | `dedupeKey`(`insight:{id}` · `band:{weekOf}:{symbol}`)로 같은 원인 중복을 막는다 | Should |
| FR-94 | 목록 · 안 읽은 수 · 모두 읽음은 **`signal_update`만** 대상이다. 기존 서버 경로(`GET /` · `PATCH /:id/read` · `PATCH /read-all` · `GET /unread-count`)를 이 규칙으로 좁힌다 | Must |
| FR-95 | **범위 밖**: 사용자 조건 알림 · 환율 함정 · 세금 D-Day · 투자 피드 생성 (D5 · **기본안 — 감사 문서 B4 · B19**) | Must |

## `onboarding` 2단계 교체 (2026-09-21 추가, B12)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-100 | 단계 키를 `invite` · **`first_holding`** · `set_plan`으로 바꾼다. `link_account`와 `LedgerLinkedProbe`를 지운다 **(기본안 — 감사 문서 B12)** | Must |
| FR-101 | `first_holding` 완료 = `portfolio.hasTransactions` **또는** `User.firstHoldingSkippedAt` 있음. 조회 실패는 기존 원칙대로 **미완료**로 읽는다 | Must |
| FR-102 | `SkipOnboardingStep`은 **`first_holding`만** 건너뛸 수 있다. `invite` · `set_plan`은 400 | Must |
| FR-103 | `set_plan` 완료는 F003 적립 설정 존재다(기존 `PlanConfiguredProbe`). 저장 자체는 F003 API가 한다 | Must |

## 설정 조립 (2026-09-21 추가, D9 · B16)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-110 | 서버는 설정 **조합 유스케이스를 만들지 않는다.** 그룹마다 소유 컨텍스트의 API를 BFF가 조립한다: 적립 기본액 · 밴드 임계값(F003 `plan`) · 성향 · `defaultMode` · `notificationLevel`(F004 `coach`) · 알림 켜기/끄기(`notification`) | Must |
| FR-111 | `notification`이 `GetAlertPreferences` · `UpdateAlertPreferences`(`alertsEnabled`)를 낸다 | Must |
| FR-112 | 밴드 임계값 **쓰기 경로를 만들지 않는다** (D9) | Must |

## Acceptance Criteria

- [ ] `AnswerCoachMessage`가 7단계로 진행한다
- [ ] `messageId`가 요청 시점에 선발급된다
- [ ] **재연결 시 LLM이 다시 호출되지 않는다** (호출 카운터)
- [ ] 같은 `messageId`로 두 호출이 동시에 돌지 않는다 (동시 요청 테스트)
- [ ] 부분 저장이 2초/500자 제한이고 트랜잭션이 없다
- [ ] 클라이언트 종료 시 LLM이 취소된다 (서버 로그 확인)
- [ ] 60초 초과 시 `failed` + `LLM_TIMEOUT`
- [ ] 서버 재기동 시 `streaming` 잔여가 `failed`로 정리된다
- [ ] `messageCount`·`lastMessageAt`이 같은 트랜잭션에서 갱신된다
- [ ] **컨텍스트 라우팅이 질문 유형별로 다른 컨텍스트를 조립한다** (4유형 테스트 — 리스크 질문 포함, 세금 · 청구서 컨텍스트 0건)
- [ ] 분류가 규칙 기반이고 LLM 분류 호출이 0건이다
- [ ] 분류 실패 시 최소 컨텍스트로 폴백한다
- [ ] 히스토리가 최근 6턴으로 제한된다
- [ ] 컨텍스트 조립이 공개 API를 경유한다 (Prisma 직접 읽기 0건)
- [ ] 컨텍스트 일부 실패 시 대화가 계속된다
- [ ] **프롬프트 토큰 수가 측정되고 상한이 있다**
- [ ] 프롬프트에 계좌 식별자·키가 0건이다
- [ ] 시스템 프롬프트에 금지 사항 6종이 명시되어 있다
- [ ] **프롬프트 저장·로깅이 0건이다**
- [ ] 답변 가드가 확신 표현·목표주가·주문 약속·인격 평가·개별 미국주식 추천을 검출해 대체한다
- [ ] "체결 내역" 같은 정당한 표현이 오검출되지 않는다 (문맥 검사)
- [ ] 대체 시 `explanationSource: 'rule'`로 표시된다
- [ ] 검출 건수가 측정된다
- [ ] **후처리가 스트리밍 중 문장 단위로 동작한다** (델타 유출 0건)
- [ ] 답변 카드가 게이트를 통과해야 만들어진다
- [ ] 게이트 미충족 시 카드 없이 텍스트만 답한다
- [ ] 카드가 완성 객체 1회 저장·전송이다
- [ ] 카드 내용이 복사되어 insight 갱신에 영향받지 않는다
- [ ] **`coach` 도메인에 주문 Port가 0건이다**
- [ ] **합성 프롬프트 10개에 주문 실행이 0건이다**
- [ ] `homebriefing`이 Aggregate 없이 `application`만 갖는다
- [ ] 3블록(`portfolio` · `plan` · `coach`)이 공개 API를 경유하고 `tax` · `invoice` 호출이 0건이다
- [ ] 블록 하나 실패 시 나머지가 응답한다
- [ ] 금액 블록 실패 시 `null`이다
- [ ] 비원화 보유 + 환율 없음이면 총자산이 `null` + `degraded`다
- [ ] AI 추천 블록에 게이트가 적용된다
- [ ] 홈에 mutation 유스케이스가 0건이다
- [ ] Hero 6항목이 서버 계산이다
- [ ] `1y` 구간이 있고 응답에 MDD가 있다. 기존 구간 응답이 바뀌지 않았다
- [ ] 리스크 레이더가 4축이고 축 정의 · 상한이 설정 파일에서 온다 (코드 상수 0건)
- [ ] 표본 부족 축이 `null` + `reasonCode`다
- [ ] 미리보기가 쓰기 0건이고 저장 결과와 같다
- [ ] 과매도가 `INSUFFICIENT_QUANTITY`로 거부된다
- [ ] 거래 수정이 거래일을 바꿀 수 있고 종목 · 매수/매도는 못 바꾼다
- [ ] 새 알림이 `signal_update`뿐이고 가격 급등락만으로 생성되지 않는다
- [ ] 알림 끔이면 생성 0건이다
- [ ] 목록 · 안 읽은 수 · 모두 읽음이 `signal_update`만 다룬다
- [ ] 온보딩 단계 키가 `invite` · `first_holding` · `set_plan`이다
- [ ] `first_holding`만 건너뛸 수 있다
- [ ] 밴드 임계값 쓰기 경로가 0건이다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-024`(F004 게이트) · `DB-REQ-021`~`024`
- **소비:** 각 컨텍스트의 공개 API(`portfolio`·`plan`·`coach`·`news`·`notification`). ~~`tax`·`invoice`~~ — ADR-002
- **규칙:** `ddd-domain.md` · `ddd-application.md` §7(조합 컨텍스트)

## Open Questions

- **컨텍스트 라우팅 분류를 규칙으로 얼마나 정확히 할 수 있는가.** 추천 질문 Chip은 고정 매핑이라 정확하지만, 자유 입력은 키워드로 한계가 있다 → **분류 실패 시 최소 컨텍스트**가 안전망이지만 답변 품질이 떨어진다.
- 후처리가 스트리밍 중 문장 단위로 동작하면 **첫 토큰 지연이 늘어난다.** 문장이 끝나야 흘릴 수 있다 → 1s 예산과 충돌할 수 있다. **측정 후 판단.**
- 히스토리 6턴이 적절한가. 짧으면 맥락을 잃고 길면 비용이 든다.
- `title` 생성을 LLM으로 할지. 비용이 든다 → **첫 메시지 앞 30자**가 기본안.
- **리스크 레이더 축 정규화.** 변동성 · 뉴스 리스크를 0~100으로 옮기는 기준(예: 변동성 연율 80% = 100)을 설정 파일에 두지만 초기값은 판단이 필요하다. 첫 값은 스토리보드 예시(집중도 상한 60)만 확정이다.
- **"내 포트폴리오 위험한가?" Chip** 교체는 FEATURE-006의 판단이다. 사용자 확인 전까지 라우팅 규칙은 이 문구로 둔다.
- 알림 원인 "F004 추천 갱신"을 이벤트로 받을지 워커가 폴링할지. 기본안: `coach`가 insight를 만들 때 `notification` 공개 API를 호출(같은 프로세스).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 컨텍스트 라우팅(세금 → 리스크 질문, 청구서 삭제) · FR-71(3블록, D6) · FR-76(`FxRate` 구분 삭제). 추가: FR-80~89(`portfolio` 포지션 · `1y` · MDD · 레이더 4축 · 미리보기, B13 · B14) · FR-90~95(알림 1종, D5 · B4 · B19) · FR-100~103(온보딩 `first_holding`, B12) · FR-110~112(설정 조립, D9 · B16). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |
