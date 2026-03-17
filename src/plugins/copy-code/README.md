# copy-code

티스토리 본문 영역의 코드블록 우측 상단에 복사 버튼을 추가합니다.

## 기능

- 코드블록 우측 상단에 복사 버튼 추가
- 클릭 시 코드 내용을 클립보드에 복사
- `Clipboard API` 우선 사용, 실패 시 fallback 복사 방식 사용
- 중복 실행 방지 처리

## 대상 컨테이너

티스토리 스킨별 차이를 고려하여 여러 본문 컨테이너 후보 중 먼저 발견되는 영역에서 동작합니다.

- `#article`
- `.article-view`
- `.area_view`
- `.entry-content`
- ...

## 대상 요소

본문 컨테이너 내부의 코드블록을 찾아 복사 버튼을 추가합니다.

- `pre code`

## 버튼 상태

- 기본: `복사`
- 성공: `복사됨`
- 실패: `실패`

## 사용 방법

티스토리 HTML 편집기를 열고 아래의 단계에 따라 코드를 삽입합니다.

### 1. CSS 추가하기

아래 코드를 복사하여 `</head>` 태그 앞에 붙여넣습니다.

```html
<!-- 코드블록 복사 버튼 CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.css">
```

### 2. 자바스크립트 추가하기

아래 스크립트를 복사하여 `</body>` 태그 앞에 붙여넣습니다.

```html
<!-- 코드블록 복사 버튼 JS -->
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```
