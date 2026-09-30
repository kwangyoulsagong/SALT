import type { Preview } from '@storybook/nextjs-vite'
import { createElement } from 'react'
import { MotionProvider } from '../src/Motion/MotionProvider'

const preview: Preview = {
  // 앱 루트와 같은 모션 설정(FE-REQ-044 FR-3) — `m` 컴포넌트는 LazyMotion 없이 움직이지 않는다
  decorators: [(Story) => createElement(MotionProvider, null, createElement(Story))],

  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;