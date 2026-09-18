/** 목표 추가 폼의 입력 계약. */
export interface AddGoalFormInput {
  title: string;
  amount: number;
}

/** 서버 `POST /api/goals` 요청. 필드 이름은 서버 DTO 를 따른다. */
export interface CreateGoalRequest {
  title: string;
  category: string;
  targetAmount: number;
  startDate: string;
  targetDate: string;
}
