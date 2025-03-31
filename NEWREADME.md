<div align="center">

<h1>SALT</h1>
<img src="https://github.com/kwangyoulsagong/SALT/blob/feat2/adding-goals/readmeAsset/main.png">
<h3> "금융과 재미를 결합한 새로운 방식의 자산 관리 플랫폼" </h3>
<br />

<h2>재미있고 지속 가능한 저축 습관을 위한 공간</h2>

저축 목표를 설정하고, 게임화된 요소와 소셜 기능을 활용하여  
즐겁게 금융 습관을 만들어보세요.

최적화된 저축 관리 시스템으로 목표 달성을 더 쉽게!

다양한 목표 설정 방식 지원
리워드 기반의 동기 부여 시스템
친구들과 함께하는 소셜 저축 기능

직관적인 인터페이스로 저축 경험을 새롭게 정의하세요.

</br>

</div>

<br />

# 목차

### [1. 프로젝트 소개](#%EF%B8%8F-프로젝트-소개)

- [< SALT >를 만들게 된 계기](#-SALT-를-만들게-된-계기)
- [주요 기능 설명](#주요-기능-설명)
- [프로젝트 실행 방법](#프로젝트-실행-방법)

### [2. 기술 스택](#%EF%B8%8F-기술-스택)

### [3. 기술적 경험](#-기술적-경험)

- [FE](#FE)
  - [성능 최적화](#성능-최적화)
  - [FSD 아키텍처](#fsd-아키텍처)

<br />

# ⭐️ 프로젝트 소개

## < SALT >를 만들게 된 계기

많은 사람들이 저축을 계획하지만, 꾸준히 유지하는 것은 쉽지 않습니다.  
목표 없이 저축을 하면 동기부여가 어렵고, 단순히 숫자로만 표시되는 저축 금액은 지루하게 느껴질 수 있습니다.

우리는 저축을 보다 직관적이고 재미있는 경험으로 만들고 싶었습니다.  
목표를 설정하고, 게임처럼 즐기면서 저축할 수 있다면 더 지속 가능하지 않을까?  
이런 고민에서 **SALT**가 탄생했습니다.

#### 기존 저축 방식의 한계

금융 앱을 사용해 본 경험이 있다면 이런 불편함을 느껴봤을 겁니다:

- **목표 설정이 어렵다**: 단순히 금액만 입력하는 방식은 동기부여가 부족합니다.
- **저축이 지루하다**: 숫자만 쌓이는 구조라 흥미를 잃기 쉽습니다.
- **꾸준히 유지하기 힘들다**: 실시간 피드백과 보상이 부족해 동기부여가 약합니다.
- **소셜 기능이 없다**: 함께하는 재미가 없으면 쉽게 포기하게 됩니다.

#### 그래서 우리는 새로운 방식의 저축 서비스를 만들기로 했습니다.

저축을 단순한 ‘금융 관리’가 아니라 **게임처럼 즐길 수 있는 경험**으로 바꾸고 싶었습니다.  
목표를 설정하고, 도전하며, 보상을 받으며 성장하는 재미있는 서비스,  
그것이 바로 **SALT**입니다.

<br />

## 주요 기능 설명

( gif 로딩이 느릴 수 있습니다🥹 조금만 기다려주세요 )

### [ 메인 페이지 ]

<table>
  <tr>
    <td><img src="https://assetkungya.s3.ap-northeast-2.amazonaws.com/%E1%84%82%E1%85%A1%E1%84%8B%E1%85%B4-%E1%84%83%E1%85%A9%E1%86%BC%E1%84%8B%E1%85%A7%E1%86%BC%E1%84%89%E1%85%A1%E1%86%BC-3.gif" alt="블록 에디터 1" /></td>
    <td><img src="https://assetkungya.s3.ap-northeast-2.amazonaws.com/%E1%84%82%E1%85%A1%E1%84%8B%E1%85%B4-%E1%84%83%E1%85%A9%E1%86%BC%E1%84%8B%E1%85%A7%E1%86%BC%E1%84%89%E1%85%A1%E1%86%BC-4.gif" alt="블록 에디터 2" /></td>
  </tr>

  <img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EB%B8%94%EB%A1%9D%EC%97%90%EB%94%94%ED%84%B0.gif" alt="블록에디터">
</table

#### 1. **블록 기반 편집**

- 각 콘텐츠(문단, 이미지, 목록 등)를 블록 단위로 분리하여, 사용자가 자유롭게 콘텐츠를 삽입, 이동, 삭제할 수 있습니다.
- 이를 통해 직관적이고 유연한 글 작성이 가능합니다.

#### 2. **실시간 미리보기**

- 작성 중인 콘텐츠를 실시간으로 미리 볼 수 있어, 포스트의 레이아웃을 즉시 확인하고 수정할 수 있습니다.
- 글 작성과 동시에 포스트의 최종 형태를 시각적으로 확인할 수 있어 효율적인 작성이 가능합니다.

#### 3. **다양한 블록 타입**

- 텍스트, 이미지, 코드 블록, 목록 등 다양한 블록 타입을 제공하여, 사용자는 포스트의 내용에 맞는 다양한 형식으로 글을 작성할 수 있습니다.
- 또한, 차트를 삽입할 수 있는 기능을 제공하여, 데이터를 시각적으로 표현할 수 있습니다.

### [ 글 조회 ]

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EA%B8%80%EC%A1%B0%ED%9A%8C.gif" alt="글 작성 이미지">

- 글은 블록 타입 형식으로 적용된 글을 볼 수 있습니다.
- 헤딩(Heading) 내비게이션을 통해 해당 헤딩으로 라우팅 지원합니다.

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EB%8C%93%EA%B8%80%20%EB%8C%80%EB%8C%93%EA%B8%80.gif" alt="글 커스텀 이미지">

- 해당 게시물에 댓글을 달 수 있습니다.
- 답글도 지원해서 커뮤니티 활성화를 할 수 있습니다.

### [ 메인 페이지 ]

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EB%A9%94%EC%9D%B8%ED%8E%98%EC%9D%B4%EC%A7%80.gif" alt="메인 페이지">

- Top 8 인기 게시물 최신 트렌드로 애니메이션 반영했습니다.
- 최근 게시물들을 좋아요 순으로 탑 3을 먼저 표시하고,
- 그 이후로는 최신 날짜 기준으로 정렬하는 방식으로 반영했습니다.

### [ 실시간 알림 시스템 ]

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EC%95%8C%EB%A6%BC.gif" alt="실시간 알림 시스템"/>

- 실시간 알림을 통한 댓글, 좋아요, 즐겨찾기 이벤트 발생시 즉시 전송했습니다.

### [ 글 검색 ]

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/%EA%B2%80%EC%83%89.gif" alt="글 검색">

- 검색은 제목 또는 작성자로 검색할 수 있습니다.
- 검색해서 해당 블로그로 이동할 수 있습니다..

<br />

## 프로젝트 실행 방법

```bash
pnpm install

pnpm dev
```

<br />

# ⚒️ 기술 스택

<img src="https://github.com/kwangyoulsagong/Reflective/blob/main/readmeAssets/skills.png" height="500" alt="기술스택 이미지"/>

![Reflective 시스템 아키텍처](https://assetkungya.s3.ap-northeast-2.amazonaws.com/reflective.png)

# 💪🏻 기술적 경험

## FE

프론트엔드의 주요 기술적 도전은 블록 에디터를 구현하는 것이었습니다. 기존의 마크다운 에디터와는 달리, 블록 에디터는 각 콘텐츠 요소(텍스트, 이미지, 코드 등)를 독립적인 '블록'으로 다루어 더 직관적이고 유연한 편집 경험을 제공합니다.

먼저 아래는 블록 에디터 구현 과정입니다.

- [마크다운에서 블록 에디터로: 내 블로그 에디터 개발기](https://velog.io/@tkrhdrhkdduf/%EB%A7%88%ED%81%AC%EB%8B%A4%EC%9A%B4%EC%97%90%EC%84%9C-%EB%B8%94%EB%A1%9D-%EC%97%90%EB%94%94%ED%84%B0%EB%A1%9C-%EB%82%B4-%EB%B8%94%EB%A1%9C%EA%B7%B8-%EC%97%90%EB%94%94%ED%84%B0-%EA%B0%9C%EB%B0%9C%EA%B8%B0)

- [메인 페이지 최근 게시물 UX 개선 (가상 스크롤)](https://velog.io/@tkrhdrhkdduf/%EA%B0%80%EC%83%81-%EC%8A%A4%ED%81%AC%EB%A1%A4-Virtual-Scroll-%EA%B5%AC%ED%98%84)

<br />

### 성능 최적화

- [블록 에디터 성능 개선](https://velog.io/@tkrhdrhkdduf/%EB%B8%94%EB%A1%9D-%EC%97%90%EB%94%94%ED%84%B0-%EC%84%B1%EB%8A%A5-%EA%B0%9C%EC%84%A0)

처음 블록 에디터를 개발했을 때, 몇 가지 심각한 성능 문제가 있었습니다:

- 텍스트 입력할 때마다 화면이 버벅였습니다.
- 블록이 많아질수록 에디터가 느려졌습니다.
- 메모리 사용량이 계속 증가했습니다.
- 초기 로딩이 느렸습니다.

---

#### 1. React의 렌더링 개선 기법 적용

제가 선택한 첫 번째 최적화 방식은 **React의 렌더링 개선 기법**을 적용하는 것이었습니다.  
React의 렌더링 사이클은 크게 **렌더 페이즈**와 **커밋 페이즈**로 구성됩니다.  
불필요한 렌더 페이즈를 줄이기 위해 `React.memo`, `useMemo`, `useCallback`과 같은 기법을 적용했습니다.  
특히 `BlockEditor` 컴포넌트에 `React.memo`를 적용하여 **특정 블록만 변경되었을 때 해당 블록만 리렌더링**되도록 개선했습니다.

하지만 이런 기본적인 최적화만으로는 충분하지 않았고,  
특히 문서 크기가 커질수록 여전히 성능 저하가 발생했습니다.

---

#### 2. Map 자료구조를 활용한 상태 관리 개선

추가적인 최적화를 위해 **블록 데이터 관리 방식을 변경**했습니다.  
기존에는 **배열 기반**으로 블록 상태를 관리했는데, 이 방식은  
하나의 블록이 변경될 때마다 전체 배열이 갱신되어 **모든 블록이 리렌더링**되는 문제가 있었습니다.  
이를 해결하기 위해 **Map 자료구조**를 도입했습니다.

#### 3. 디바운싱을 통한 입력 최적화

마지막으로 적용한 최적화는 사용자 입력에 대한 디바운싱 처리였습니다.
초기에는 모든 키 입력마다 상태를 업데이트했고,
이로 인해 과도한 렌더링과 성능 저하가 발생했습니다.

이를 해결하기 위해 lodash의 debounce 함수를 사용하여
300ms 지연 시간을 설정, 연속된 입력을 하나의 업데이트로 처리했습니다.

<table>
  <tr>
    <td><img src="https://velog.velcdn.com/images/tkrhdrhkdduf/post/50919b5d-41e1-4055-b723-cfd532f28d5d/image.png" alt="블록 에디터 1" /></td>
    <td><img src="https://velog.velcdn.com/images/tkrhdrhkdduf/post/e9375921-e6ed-49f0-8e6f-732e16291fda/image.png" alt="블록 에디터 2" /></td>
  </tr>
</table

<table>
  <tr>
    <td><img src="https://velog.velcdn.com/images/tkrhdrhkdduf/post/6060341a-1af9-4768-8bd5-c07eaec8cd22/image.png" alt="블록 에디터 1" /></td>
    <td><img src="https://velog.velcdn.com/images/tkrhdrhkdduf/post/9efc3d54-a6be-4354-9e4d-415a8880db15/image.png" alt="블록 에디터 2" /></td>
  </tr>
</table>

### FSD 아키텍처

그동안 개발을 하면서 점점 서비스가 확장되면서 폴더들이 복잡해지고 찾기가 어려워져서 나누는게 낫다고 판단하여 마이그레이션 했습니다.
여러 폴더 구조와 아키텍쳐들에 대해 조사해보았고, 결과적으로 [FSD(Feature-Sliced Design)](https://feature-sliced.design/) 아키텍처를 적용하게 되었습니다.

프로젝트의 규모가 커지면서 코드의 복잡성을 관리하기 위해 FSD 방식은 폴더를 세세하게 나누는 구조로 대규모 프로젝트에 적합하다고 판단했습니다. 또한 프로젝트를 분할하여 정복하는 이 방식의 장점이 매력적으로 느껴졌고, 학습 목적이 강한 이 프로젝트에서 새로운 폴더구조를 적용해보고 싶었습니다.

<img src="https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2Fl3RRQ%2FbtsJsii7gUo%2FqEDelkesLO4SGTkta6pzt1%2Fimg.png">\_출처: https://world-developer.tistory.com/87

FSD 아키텍처는 app, pages, widgets, features, entities, shared라는 6개의 `Layer`로 이루어져있습니다. 그리고 각각의 `Layer`는 `Slice`들로 이루어져있고, 그 `Slice`는 `Segment`로 이루어져있습니다. 하위요소들을 조합하여 상위 요소를 구성하는 방식으로, 이 매커니즘이 저희에게 굉장히 매력적으로 다가왔습니다.
이렇게 각자의 역할이 분명한 폴더구조를 적용해봄으로써 모듈을 만들 때 각 모듈의 역할을 명확히 정의하게 되었습니다. 또한 하위 요소들이 모두 개별적으로 기능할 수 있기 때문에 훨씬 유지보수성이 높은 코드를 작성할 수 있게 되었습니다.

아래는 Reflective 프로젝트의 폴더구조입니다.

```
📦src
 ┣ 📂app
 ┃ ┣ 📜App.css
 ┃ ┣ 📜App.tsx
 ┃ ┗ 📜error
 ┃ ┗ 📜errorboundary
 ┃ ┗ 📜provider
 ┃ ┗ 📜routes
 ┣ 📂entities
 ┃ ┣ 📂BlockEditor
 ┃ ┣ 📂Comments
 ┃ ┃ ┗ 📂model
 ┃ ┗ 📂Notification
 ┣ 📂features
 ┃ ┣ 📂auth
 ┃ ┣ 📂Comments
 ┃ ┣ 📂favorite
 ┃ ┣ 📂MyPage
 ┃ ┣ 📂Notification
 ┃ ┣ 📂Post
 ┃ ┣ 📂Search
 ┃ ┣ 📂Setting
 ┃ ┗ 📂Write
 ┣ 📂pages
 ┃ ┣ 📂Home
 ┃ ┣ 📂Mypage
 ┃ ┣ 📂Post
 ┃ ┣ 📂Setting
 ┃ ┣ 📜SearchPage.tsx
 ┃ ┣ 📜SignUpPage.tsx
 ┃ ┣ 📜StartPage.tsx
 ┃ ┗ 📜WritePage.tsx
 ┣ 📂shared
 ┃ ┣ 📂api
 ┃ ┣ 📂BlockView
 ┃ ┣ 📂CircleImage
 ┃ ┣ 📂constants
 ┃ ┣ 📂Header
 ┃ ┣ 📂styles
 ┃ ┣ 📂Toast
 ┃ ┣ 📜Search.tsx
 ┃ ┣ 📜useApiError.ts
 ┃ ┣ 📜useInfinitePostsQuery.ts
 ┃ ┗ 📜useVirtualScroll.ts
```

<br />
