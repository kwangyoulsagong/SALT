import { SIGN_IN_MESSAGES } from "../model/messages";
import { SignInRequest, SignInResponse } from "../model/types";

/** mutation 은 feature 가 갖는다 (`fsd-entities.md` — entities/api 는 조회만). */
export const signInApi = {
  signIn: async (body: SignInRequest): Promise<SignInResponse> => {
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || SIGN_IN_MESSAGES.failed);
      }

      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : SIGN_IN_MESSAGES.unknownError
      );
    }
  },
};
