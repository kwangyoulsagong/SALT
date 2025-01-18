import { User } from "@/types/store/auth/types";

const fetchUser = async (): Promise<User> => {
  try {
    const response = await fetch("api/v1/auth");
    if (!response.ok) {
      throw new Error("회원 정보를 알 수 없습니다.");
    }
    return await response.json();
  } catch (error) {
    console.error("회원 정보 조회 에러:", error);
    throw error;
  }
};
export default fetchUser;
