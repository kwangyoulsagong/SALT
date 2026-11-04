/** 고정비 찾기 동작 문구 — 사실만, 재촉 · 경고 0. 가맹점은 사용자가 쓴 이름이라 조사(는 · 를)를 붙이지 않는다(받침을 모른다) */
export const FIND_FIXED_COST_MESSAGES = {
  toTemplate: "매달 적기로",
  toTemplateLabel: (merchant: string) => `${merchant} 매달 적기로 옮기기`,
  hide: "아니에요",
  hideLabel: (merchant: string) => `${merchant} — 매달 나가는 돈 아니에요`,
  hidden: (merchant: string) => `${merchant}, 목록에서 뺐어요`,
  undo: "되돌리기",
  templated: (merchant: string) => `${merchant}, 매달 적기에 넣었어요`,
  templates: "매달 나가는 돈 보기",
  templateLimit: "매달 적기는 더 넣을 수 없어요",
  failed: "저장하지 못했어요",
};
