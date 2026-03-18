# copy-code

티스토리 본문 안의 코드블록에 복사 버튼을 붙여 주는 플러그인입니다.

## 주요 기능

- `<code>`를 포함한 `pre` 블록에만 복사 버튼을 추가합니다.
- 버튼은 기본적으로 hover 또는 focus 상태에서 보이고, 터치 환경에서는 항상 보입니다.
- 보안 컨텍스트에서는 `Clipboard API`를 우선 사용하고, 사용할 수 없으면 `execCommand("copy")`로 복사합니다.
- 줄바꿈을 유지한 채 복사하며, `highlight.js` 줄 번호 마크업(`.hljs-ln-code`, `.hljs-ln-line`)도 처리합니다.
- 이미 처리한 블록에는 `data-copy-code-ready="true"`를 남겨 중복 초기화를 막습니다.

## 본문 컨테이너 감지

아래 셀렉터를 위에서부터 순서대로 확인해 가장 먼저 찾은 본문 영역에서 동작합니다.

- `.contents_style`
- `.entry-content`
- `.area_view`
- `.post-content`
- `.article_view`
- `.article-view`
- `#article`
- `.article_cont`

아래 셀렉터는 본문 텍스트와 콘텐츠 신호가 충분할 때만 fallback 후보로 사용합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

## 버튼 상태

- 기본: `Copy`
- 성공: `Copied`
- 실패: `Error`

성공 또는 실패 상태는 약 2초 뒤 기본 상태로 돌아갑니다.

## 설치 방법

### 1. CSS 추가

아래 코드를 `</head>` 바로 앞에 넣습니다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.css">
```

### 2. JS 추가

아래 코드를 `</body>` 바로 앞에 넣습니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```

## 참고 사항

- 빈 코드블록이거나 복사에 실패하면 버튼이 `Error` 상태로 바뀝니다.
- 코드블록 안에 `<code>` 요소가 없으면 버튼을 추가하지 않습니다.
- 복사 버튼 텍스트는 현재 빌드 기준으로 영문(`Copy`, `Copied`, `Error`)입니다.
