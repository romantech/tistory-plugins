# inline-code

티스토리 본문에서 백틱으로 감싼 텍스트를 `<code>`로 변환합니다.

- 대상: `#article` 내부의 `p`, `blockquote`, `.table-content`, `h1`-`h4`, `li`, `figcaption`
- 제외: `code`, `pre`, `script`, `style`, `textarea`

## 사용 방법

티스토리 HTML 편집기에서 아래 스크립트를 붙여넣습니다. 기본값으로 `@latest`를 사용하지만, 필요 시 `@0.1.1`처럼 원하는 버전을 직접 지정할 수 있습니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```
