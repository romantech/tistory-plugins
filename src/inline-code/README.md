# inline-code

티스토리 본문에서 백틱으로 감싼 텍스트를 `<code>`로 변환합니다.

- 대상: `#article` 내부의 `p`, `blockquote`, `.table-content`, `h1`-`h4`, `li`, `figcaption`
- 제외: `code`, `pre`, `script`, `style`, `textarea`

## 사용

운영 환경에서는 `main` 브랜치 대신 고정된 태그 버전으로 불러오는 것을 권장합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<tag>/src/inline-code/index.js"></script>
```
