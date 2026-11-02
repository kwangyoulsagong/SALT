const formatter = new Intl.NumberFormat("ko-KR");

/** 금액 **표시** 포맷. 계산은 서버가 한다 (`fsd-shared.md`). */
export const formatPrice = (value: number): string => formatter.format(value);
