const formatter = new Intl.NumberFormat("ko-KR");
export const FormatPrice = (num: number) => formatter.format(num);
