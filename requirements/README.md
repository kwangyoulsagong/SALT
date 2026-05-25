# Global Requirements

루트 `requirements/`는 PM, 프론트엔드, BFF, 서버 요구사항을 한 번에 추적하기 위한 글로벌 작업 허브다.

## Directory

```text
requirements/
  specs/
    to-do/
    in-progress/
    done/
  reports/
    checklists/
    retrospects/
    feature-audits/
```

## Area Requirements

- PM: `pm/requirements/`
- Frontend: `salt-microFe/requirements/`
- BFF: `bff/requirements/`
- Backend: `salt-server/requirements/`

## Workflow

1. 글로벌 기획/조율 문서는 `requirements/specs/in-progress/`에서 시작한다.
2. 영역별 구현 요구사항은 각 영역의 `requirements/specs/in-progress/`에 둔다.
3. 검증 결과는 각 영역의 `requirements/reports/checklists/`에 남긴다.
4. 모든 영역을 함께 검증해야 하는 결과는 루트 `requirements/reports/checklists/`, `requirements/reports/retrospects/`에 남긴다.
