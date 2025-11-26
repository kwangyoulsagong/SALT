export const FormatPrice = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num);
};
