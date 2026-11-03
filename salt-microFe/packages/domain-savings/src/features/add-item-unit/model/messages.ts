/** 실물 단위 문구 — 단가는 사용자가 정한 값이다(상품 · 가격 안내 없음) */
export const ITEM_UNIT_MESSAGES = {
  title: "실물로 바꿔 보기",
  description: "모은 돈을 내가 정한 단위로 세어 봐요. 목표마다 3개까지",
  name: "단위 이름",
  namePlaceholder: "예: 제주 왕복",
  price: "한 개 가격",
  add: "단위 추가",
  remove: (name: string) => `${name} 지우기`,
  removeMark: "×",
  line: (name: string, count: number) => `${name} ${count}개`,
  empty: "아직 단위가 없어요",
  failed: "저장하지 못했어요. 다시 시도해 주세요",
  errorCode: {
    UNIT_LIMIT: "단위는 목표마다 3개까지예요",
    UNIT_NAME_INVALID: "이름은 1~30자로 적어 주세요",
  } as Readonly<Record<string, string>>,
} as const;
