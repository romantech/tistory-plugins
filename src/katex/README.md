# katex

티스토리 본문에서 `$...$`, `$$...$$` 형태의 수식을 KaTeX로 렌더링합니다.

- 대상 컨테이너: `#article`, `.article-view`, `.tt_article_useless_p_margin`
- 구분자: 인라인 `$...$`, 블록 `$$...$$`
- 제외 태그: `script`, `noscript`, `style`, `textarea`, `pre`, `code`
- KaTeX CSS/JS는 내부적으로 jsDelivr CDN에서 불러옵니다.

## 사용 방법

티스토리 HTML 편집기에서 아래 스크립트를 붙여넣습니다. 기본값으로 `@latest`를 사용하지만, 필요 시 `@0.1.1`처럼 원하는 버전을 직접 지정할 수 있습니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```
