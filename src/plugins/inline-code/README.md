# inline-code

티스토리 본문에서 백틱으로 감싼 텍스트를 `<code>`로 변환하는 플러그인입니다.

## 주요 기능

- 한 줄 안의 `` `...` `` 패턴을 찾아 `<code>`로 감쌉니다.
- 같은 텍스트 노드 안에 여러 개의 백틱 구간이 있어도 모두 처리합니다.
- 지정한 본문 요소 안에서만 동작하고, `code`, `pre` 같은 제외 태그 내부는 건드리지 않습니다.
- 별도 CSS 없이 스킨의 기본 `code` 스타일을 그대로 사용합니다.

## 본문 컨테이너 감지

아래 셀렉터 중 가장 먼저 찾은 본문 영역에서 동작합니다.

- `.contents_style`
- `.entry-content`
- `.area_view`
- `.post-content`
- `.article_view`
- `.article-view`
- `#article`
- `.article_cont`

아래 셀렉터는 fallback 후보로 사용합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

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

## 설치 방법

아래 스크립트를 `</body>` 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```

## 참고 사항

- 줄바꿈을 포함한 백틱 구간은 처리하지 않습니다.
- 처리 대상 요소 바깥의 텍스트는 변환하지 않습니다.
- 본문 HTML 안에서 이미 `<code>`를 직접 쓰고 있다면 그 부분은 그대로 유지됩니다.
