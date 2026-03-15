# katex

티스토리 본문 영역의 `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다.

## 기능

- 인라인 수식: `$...$`
- 블록 수식: `$$...$$`
- KaTeX CSS/JS를 jsDelivr CDN에서 자동으로 불러와 렌더링
- 중복 실행 방지 처리 포함

## 대상 컨테이너

- `#article`
- `.article-view`
- `.tt_article_useless_p_margin`

## 구분자

- 인라인: `$...$`
- 블록: `$$...$$`

## 제외 태그

- `script`
- `noscript`
- `style`
- `textarea`
- `pre`
- `code`

## 사용 방법

티스토리 HTML 편집기에서 아래 스크립트를 붙여 넣습니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```
