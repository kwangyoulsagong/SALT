/** 사용자 식별자. 전 컨텍스트가 참조한다. */
export class UserId {
  private constructor(readonly value: string) {}

  static of(value: string): UserId {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error("UserId 가 비어 있다");
    }
    return new UserId(trimmed);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
