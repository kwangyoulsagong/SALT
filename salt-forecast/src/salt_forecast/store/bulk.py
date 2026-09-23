"""대량 upsert — COPY → 임시 테이블 → INSERT … ON CONFLICT 한 문장(performance.md §3)."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

from sqlalchemy import Engine, Table

CHUNK = 50_000


def _ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def bulk_upsert(
    engine: Engine,
    table: Table,
    columns: Sequence[str],
    rows: Iterable[Sequence[Any]],
    conflict: Sequence[str],
) -> int:
    """rows 를 CHUNK 단위로 커밋한다. conflict 외 컬럼은 새 값으로 덮는다. 반환: 쓴 행 수."""
    target = f"{_ident(table.schema or 'public')}.{_ident(table.name)}"
    cols = ", ".join(_ident(c) for c in columns)
    updates = [c for c in columns if c not in conflict]
    set_clause = ", ".join(f"{_ident(c)} = EXCLUDED.{_ident(c)}" for c in updates)
    on_conflict = f"DO UPDATE SET {set_clause}" if updates else "DO NOTHING"
    written = 0
    batch: list[Sequence[Any]] = []

    def flush() -> None:
        nonlocal written
        if not batch:
            return
        raw = engine.raw_connection()
        try:
            cur = raw.cursor()
            cur.execute(f"CREATE TEMP TABLE _bulk (LIKE {target} INCLUDING DEFAULTS) ON COMMIT DROP")
            with cur.copy(f"COPY _bulk ({cols}) FROM STDIN") as copy:  # pyright: ignore[reportAttributeAccessIssue,reportUnknownMemberType,reportUnknownVariableType]
                for row in batch:
                    copy.write_row(row)  # pyright: ignore[reportUnknownMemberType]
            cur.execute(
                f"INSERT INTO {target} ({cols}) SELECT {cols} FROM _bulk "
                f"ON CONFLICT ({', '.join(_ident(c) for c in conflict)}) {on_conflict}"
            )
            raw.commit()
            written += len(batch)
        except Exception:
            raw.rollback()
            raise
        finally:
            raw.close()
        batch.clear()

    for row in rows:
        batch.append(row)
        if len(batch) >= CHUNK:
            flush()
    flush()
    return written
