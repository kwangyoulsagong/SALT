/**
 * 서버가 준 키 → 문구. 자기 키만 보고(상속 키 "constructor" 가 함수를 돌려주지 않게) 없거나 비면 대체 문구.
 * 도메인과 무관한 조회라 shared(`fsd-shared.md`). `Object.hasOwn` 대신 `hasOwnProperty.call` — iOS 15.0~15.3 웹뷰에 hasOwn 이 없다(저축 리뷰 8차)
 */
export const labelOr = (map: Readonly<Record<string, string>>, key: string | null | undefined, fallback: string): string =>
  (key && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined) || fallback;
