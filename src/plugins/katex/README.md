# katex

티스토리 본문 영역의 `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다.

## 기능

- 인라인 수식: `$...$`
- 블록 수식: `$$...$$`
- KaTeX CSS/JS를 jsDelivr CDN에서 자동으로 불러와 렌더링
- 중복 실행 방지 처리 포함

## 대상 컨테이너

티스토리 스킨별 차이를 고려하여 여러 본문 컨테이너 후보 중 먼저 발견되는 영역에서 동작합니다.

- `#article`
- `.article-view`
- `.area_view`
- `.entry-content`
- ...

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

아래 스크립트를 복사하여 티스토리 HTML 편집기의 `</body>` 태그 앞에 삽입합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```
