# inline-code

티스토리 본문 영역에서 백틱으로 감싼 텍스트를 `<code>`로 변환합니다.

## 기능

- 백틱으로 감싼 인라인 텍스트를 `<code>`로 변환
- 본문 내 지정한 텍스트 요소만 대상으로 처리
- 제외 태그 내부는 변환하지 않음
- 중복 실행 방지 처리 포함

## 대상 컨테이너

- `#article`
- `.article-view`
- `.tt_article_useless_p_margin`

## 대상 요소

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

## 사용 방법

아래 스크립트를 복사하여 티스토리 HTML 편집기의 `</body>` 태그 앞에 삽입합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```
