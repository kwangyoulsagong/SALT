# 요구사항 관리 규칙

## 디렉터리

```text
requirements/
  specs/
    to-do/
    in-progress/
    done/
  reports/
    checklists/
    retrospects/
    studies/
```

없으면 필요한 시점에 생성한다.

## 요구사항 파일

- 파일명은 `REQ-{번호}.md` 또는 기존 티켓 규칙을 따른다.
- 작업 시작 시 `to-do`에서 `in-progress`로 이동할 수 있다.
- 완료 후 `done`으로 이동한다.
- 요구사항 변경은 본문 최신화 후 `## Changelog`에 날짜와 변경 내용을 남긴다.

## 체크리스트

- validate 단계에서 `requirements/reports/checklists/REQ-{번호}.md`를 작성한다.
- 각 요구사항과 구현 위치를 1:1로 연결한다.
- 미충족 항목은 숨기지 않고 실패로 기록한다.

## 회고

- retrospect 단계에서 `requirements/reports/retrospects/REQ-{번호}.md`를 작성한다.
- 개선점은 실행 가능한 action item만 적는다.
- 과장된 리스크 표현을 피하고 실제 영향 범위를 쓴다.

## 스터디 보고서

- study 단계에서 `requirements/reports/studies/REQ-{번호}.md`를 작성한다.
- 요구사항, 구현 diff, 검증 결과를 근거로 블로그형 학습 보고서를 작성한다.
- 작성 규칙은 `.codex/rules/study-report.md`를 따른다.
