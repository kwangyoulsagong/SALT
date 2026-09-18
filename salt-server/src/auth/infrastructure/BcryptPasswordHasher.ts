import { PasswordUtil } from "../../shared/lib/password";
import type { PasswordHasher } from "../domain";

/** 해시 알고리즘은 `infrastructure` 의 판단이다. 도메인은 "해시된 값"만 안다. */
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return PasswordUtil.hash(plain);
  }

  matches(plain: string, hash: string): Promise<boolean> {
    return PasswordUtil.compare(plain, hash);
  }
}
