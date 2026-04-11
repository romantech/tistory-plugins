# inline-code

티스토리 본문에서 백틱으로 감싼 텍스트를 `<code>`로 변환하는 플러그인입니다.

## 주요 기능

- 한 줄 안의 `` `...` `` 패턴을 찾아 `<code>`로 감쌉니다.
- 같은 텍스트 노드 안에 여러 개의 백틱 구간이 있어도 모두 처리합니다.
- 지정한 본문 요소 안에서만 동작하고, `code`, `pre` 같은 제외 태그 내부는 건드리지 않습니다.
- 별도 CSS 없이 스킨의 기본 `code` 스타일을 그대로 사용합니다.

## 본문 컨테이너 감지

아래 셀렉터를 순서대로 탐색합니다. kebab-case 기준으로 정의되어 있으며, snake_case 변형도 함께 확인합니다.

- `.contents-style`
- `.entry-content`
- `.area-view`
- `.post-content`
- `.article-view`
- `#article`
- `.article-cont`

아래 셀렉터는 fallback 후보로 사용하며, 글 길이와 콘텐츠 신호가 충분할 때만 채택합니다.

- `.tt-article-useless-p-margin`
- `.inner-content`

스킨 구조가 다를 경우 `window.RPPlugins.articleSelectors`로 우선 탐색할 셀렉터를 지정할 수 있습니다. 지정한 셀렉터를 먼저 확인한 뒤 기본 후보를 이어서 탐색합니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".my-article", "#main-content"],
  };
</script>
```

## 처리 대상 요소

- `p`
- `blockquote`
- `.table-content`
- `h1`
- `h2`
- `h3`
- `h4`
- `li`
- `figcaption`

## 제외 태그

- `code`
- `pre`
- `script`
- `style`
- `textarea`

## 선택 설정

`window.RPPlugins.inlineCode` 속성을 통해 처리 대상과 제외 셀렉터를 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

```html
<script>
  window.RPPlugins = {
    inlineCode: {
      targetSelector: "p, li, td, figcaption",
      blockedSelector: "code, pre, script, style, textarea",
    },
  };
</script>
```

- `targetSelector`: 백틱 변환을 적용할 대상 셀렉터.
- `blockedSelector`: 변환에서 제외할 셀렉터.

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```

## 참고 사항

- 줄바꿈을 포함한 백틱 구간은 처리하지 않습니다.
- 처리 대상 요소 바깥의 텍스트는 변환하지 않습니다.
- 본문 HTML 안에서 이미 `<code>`를 직접 쓰고 있다면 그 부분은 그대로 유지됩니다.
