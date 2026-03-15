# copy-code

티스토리 본문 영역의 코드블록 우측 상단에 복사 버튼을 추가합니다.

## 기능

- 코드블록 우측 상단에 복사 버튼 추가
- 클릭 시 코드 내용을 클립보드에 복사
- `Clipboard API` 우선 사용, 실패 시 fallback 복사 방식 사용
- 중복 실행 방지 처리 포함

## 대상 컨테이너

- `#article`
- `.article-view`
- `.tt_article_useless_p_margin`

## 대상 요소

- `pre code`

## 버튼 상태

- 기본: `복사`
- 성공: `복사됨`
- 실패: `실패`

## 사용 방법

티스토리 HTML 편집기에서 아래 스크립트를 붙여 넣습니다.

```html
<!-- 코드블록 복사 버튼 CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.css">
<!-- 코드블록 복사 버튼 JS -->
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```
