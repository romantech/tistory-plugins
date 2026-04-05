# copy-code

티스토리 본문 코드블록에 복사 버튼을 추가합니다.

## 주요 기능

- 기본 상태에서는 복사 버튼 대신 간결한 언어 축약 라벨을 표시합니다. 언어를 찾지 못하면 `Code`를 표시합니다.
- `<code>`를 포함한 `pre` 블록에만 복사 버튼을 추가합니다.
- 보안 컨텍스트에서는 `Clipboard API`를 우선 사용하고, 사용할 수 없으면 `execCommand("copy")`로 복사합니다.
- 줄바꿈을 유지한 채 복사합니다. `highlight.js` 줄 번호 마크업(`.hljs-ln-code`, `.hljs-ln-line`)도 처리합니다.
- 대표적으로 `pre` 또는 내부 `code`의 `data-ke-language`, `data-language`, `data-code-language`, `lang`, `language-*`, `lang-*`, `brush: js` 같은 값에서 언어명을 감지합니다.
- 같은 코드블록에 버튼이 중복으로 붙지 않도록 한 번만 초기화합니다.

## 동작 방식

- 데스크톱: 코드블록 hover 또는 focus 상태에서만 복사 버튼을 표시합니다.
- 모바일: 코드블록을 터치하면 복사 버튼을 표시하고, 바깥 영역을 터치하거나 복사 상태가 끝나면 다시 언어 라벨을 표시합니다.


## 본문 컨테이너 감지

아래 셀렉터를 순서대로 확인합니다. 각 셀렉터는 kebab-case 기준으로 정의되어 있으며, snake_case 변형도 함께 탐색합니다.

- `.contents-style` (`.contents_style` 포함)
- `.entry-content`
- `.area-view` (`.area_view` 포함)
- `.post-content`
- `.article-view` (`.article_view` 포함)
- `#article`
- `.article-cont` (`.article_cont` 포함)

아래 셀렉터는 fallback 후보로 사용하며, 글 길이와 콘텐츠 신호가 충분할 때만 채택합니다.

- `.tt-article-useless-p-margin` (`.tt_article_useless_p_margin` 포함)
- `.inner-content` (`.inner_content` 포함)

스킨 구조가 다르면 `window.RPPlugins.articleSelectors`로 우선 탐색할 본문 셀렉터를 지정할 수 있습니다. 지정한 셀렉터를 먼저 확인한 뒤, 기본 후보를 이어서 탐색합니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".my-article", "#main-content"],
  };
</script>
```

## 버튼 상태

- 기본: `Copy`
- 성공: `Copied`
- 실패: `Failed`

성공/실패 후 약 2초 뒤 기본 상태로 돌아갑니다.

## 선택 설정

`window.RPPlugins.copyCode`로 버튼 문구를 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

```html
<script>
  window.RPPlugins = {
    copyCode: {
      buttonText: "복사",
      successText: "완료",
      errorText: "실패",
      ariaLabel: "코드 복사",
    },
  };
</script>
```

- `buttonText`: 기본 버튼 문구.
- `successText`: 복사 성공 후 문구.
- `errorText`: 복사 실패 후 문구.
- `ariaLabel`: 복사 버튼 접근성 레이블.

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다. 스크립트가 실행되면 같은 경로의 `index.min.css`를 자동으로 로드합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```

## 참고 사항

- 빈 코드블록이거나 복사 실패 시 버튼이 `Failed` 상태로 바뀝니다.
- 코드블록 안에 `<code>` 요소가 없으면 버튼을 추가하지 않습니다.
