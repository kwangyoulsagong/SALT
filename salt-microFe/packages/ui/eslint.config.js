// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  ...storybook.configs["flat/recommended"],
  {
    // Storybook 빌드 산출물은 lint 대상이 아니다(build-storybook 실행 후 경고가 쏟아진다).
    ignores: ["storybook-static/**"],
  },
  {
    rules: {
      // props를 DOM으로 스프레드하지 않기 위해 destructuring으로 제외하는 패턴을 허용한다.
      // 예: TableRow의 memoKey는 React.memo 비교 전용 prop이다.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },
];
