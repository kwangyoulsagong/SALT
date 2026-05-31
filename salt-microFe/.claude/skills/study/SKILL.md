---
name: study
description: "REQ 구현 과정을 블로그형 학습 보고서로 작성한다"
argument-hint: <REQ 번호 또는 요구사항 파일 경로 또는 주제>
---

# Study Report

## 컨텍스트

!`cat salt-microFe/CLAUDE.md`
!`cat salt-microFe/.claude/rules/study-report.md`
!`cat salt-microFe/.claude/rules/requirements-management.md`
!`find salt-microFe/requirements -maxdepth 4 -type f -name '*.md' -print 2>/dev/null | sort`
!`git diff --stat -- salt-microFe/`
!`git diff -- salt-microFe/`
!`git status --porcelain -- salt-microFe/`

## 입력 해석

`$ARGUMENTS`를 아래 순서로 해석한다.

1. `REQ-숫자`: `salt-microFe/requirements/specs/**/REQ-숫자.md`를 찾는다.
2. 파일 경로: 해당 요구사항 또는 메모 파일을 읽는다.
3. 자유 텍스트: 보고서 주제로 사용한다.
4. 인자 없음: 최근 변경 diff와 대화 맥락을 기준으로 주제를 정한다.

## 작성 절차

1. 요구사항과 구현 diff에서 핵심 의사결정을 뽑는다.
2. 관련 rule을 확인해 "왜 이 구조가 프로젝트 규칙과 맞는지" 설명한다.
3. 공식 문서 링크를 우선으로 참고 링크를 붙인다.
4. 브라우저 API가 등장하면 MDN 링크를 붙인다.
5. 라이브러리가 등장하면 공식 문서 링크와 채택 이유를 함께 쓴다.
6. Mermaid 또는 ASCII 다이어그램을 최소 1개 포함한다.
7. `requirements/reports/studies/`에 보고서를 작성한다.

## 보고서 필수 섹션

```md
# {제목}: 구현 과정 스터디

## TL;DR

## 문제 상황

## 요구사항 정리

## 선택지 비교

## 왜 이 방식으로 구축했나

## 구현 흐름

## 다이어그램

## 핵심 코드 읽기

## 검증과 결과

## 더 공부하면 좋은 것

## 회고
```

## 링크 선택 규칙

- Web API: [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- React: [React Documentation](https://react.dev/)
- Next.js: [Next.js Documentation](https://nextjs.org/docs)
- Module Federation: [Module Federation Documentation](https://module-federation.io/)
- Next Module Federation: [@module-federation/nextjs-mf](https://module-federation.io/guide/framework/nextjs.html)
- Monorepo/build: [Turborepo](https://turbo.build/repo/docs), [pnpm Workspaces](https://pnpm.io/workspaces)
- Styling: [Vanilla Extract](https://vanilla-extract.style/)
- UI docs: [Storybook](https://storybook.js.org/docs)
- Server state: [TanStack Query](https://tanstack.com/query/latest)
- Client state: [Zustand](https://zustand.docs.pmnd.rs/)

## 스타일 참고

- [Toss Tech - Frontend](https://toss.tech/tech?category=frontend): 문제 배경, 제약, 선택지, 구현 모델, 결과 흐름을 참고한다.
- [Frontend Fundamentals](https://frontend-fundamentals.com/): 코드 품질, 번들링, 접근성, 디버깅 학습 링크로 참고한다.

## 완료 조건

- 보고서 파일이 생성되었다.
- TL;DR과 다이어그램이 있다.
- 선택지 비교와 채택 이유가 있다.
- 실제 변경 파일 경로와 검증 결과가 있다.
- 참고 링크가 하이퍼링크로 포함되어 있다.
