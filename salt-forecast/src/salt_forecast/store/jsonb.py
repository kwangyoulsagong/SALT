# pyright: reportUnknownArgumentType=false, reportUnknownVariableType=false
# 재귀 정리는 임의 JSON 모양을 받는다 — 이 파일에만 푼다.
"""jsonb 열 쓰기 — NaN · ±inf 는 JSON 이 아니다(Postgres 가 거절). 결측은 null 로."""

from __future__ import annotations

import json
import math


def _clean(v: object) -> object:
    if isinstance(v, float):
        return v if math.isfinite(v) else None
    if isinstance(v, dict):
        return {str(k): _clean(x) for k, x in v.items()}
    if isinstance(v, list | tuple):
        return [_clean(x) for x in v]
    return v


def dumps(v: object) -> str:
    return json.dumps(_clean(v), allow_nan=False, ensure_ascii=False)
