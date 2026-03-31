# copy-code

티스토리 본문 코드블록에 복사 버튼을 붙여 주는 플러그인입니다.

## 주요 기능

- `<code>`를 포함한 `pre` 블록에만 복사 버튼을 추가합니다.
- 기본 상태에서는 우측 상단에 간결한 언어 축약 라벨을 표시합니다. 언어를 찾지 못하면 `Code`를 표시합니다.
- 데스크톱에서는 코드블록 hover 또는 focus 상태에서만 복사 버튼을 표시합니다.
- 모바일에서는 코드블록을 한 번 터치하면 복사 버튼을 표시하고, 바깥 영역을 터치하거나 복사 상태가 끝나면 다시 언어 라벨로 돌아갑니다.
- 보안 컨텍스트에서는 `Clipboard API`를 우선 사용하고, 사용할 수 없으면 `execCommand("copy")`로 복사합니다.
- 줄바꿈을 유지한 채 복사합니다. `highlight.js` 줄 번호 마크업(`.hljs-ln-code`, `.hljs-ln-line`)도 처리합니다.
- `pre[data-ke-language]`, `data-language`, `lang`, `language-*` 클래스 등에서 언어명을 감지합니다.
- 이미 처리한 블록은 `data-copy-code-ready="true"`를 남겨 중복 초기화를 막습니다.

## 본문 컨테이너 감지

아래 셀렉터 중 가장 먼저 찾은 본문 영역에서 동작합니다.

- `.contents_style`
- `.entry-content`
- `.area_view`
- `.post-content`
- `.article_view`
- `.article-view`
- `#article`
- `.article_cont`

아래 셀렉터는 fallback 후보로 사용합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

## 버튼 상태

- 기본: `Copy`
- 성공: `Copied`
- 실패: `Failed`

성공/실패 후 약 2초 뒤 기본 상태로 돌아갑니다.

## 선택 설정

`window.RPPlugins.copyCode`로 버튼 문구를 조정할 수 있습니다.

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
- 복사 버튼 텍스트는 `Copy`, `Copied`, `Failed` 입니다.
