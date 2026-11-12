import type { CoachedUsersReader } from "../domain";

/** 사람마다 도는 코치 배치의 대상(준수 판정 · 월간 복기 · 리밸런스) — 정의는 포트 주석(`CoachedUsersReader`) */
export class ListCoachedUsers {
  constructor(private readonly users: CoachedUsersReader) {}

  execute(): Promise<string[]> {
    return this.users.userIds();
  }
}
