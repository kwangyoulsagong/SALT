import { EmptyState } from "@repo/ui/emptyState";
import { Illustration } from "@repo/ui/illustration";
import Link from "next/link";

import { ROUTES } from "@/shared/config";

import { NOT_FOUND_MESSAGES } from "../model/messages";

import { link, page } from "./NotFoundPage.css";

/**
 * 404 (`FE-REQ-044` P-15) — 서버 컴포넌트.
 *
 * Next 기본 404 는 영문 한 줄이라 앱 밖으로 떨어진 느낌을 준다. 캔들 장면 + 한 줄 + 돌아갈 길 하나.
 * `notFound()` 는 상세 화면(잘못된 종목 코드)에서 부른다.
 */
export const NotFoundPage = () => (
  <main className={page}>
    <EmptyState
      iconFrame="none"
      icon={<Illustration scene="candles" size="lg" />}
      title={NOT_FOUND_MESSAGES.title}
      description={NOT_FOUND_MESSAGES.description}
      action={
        <Link href={ROUTES.investments} className={link}>
          {NOT_FOUND_MESSAGES.toInvestments}
        </Link>
      }
    />
  </main>
);
