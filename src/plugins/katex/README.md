# katex

티스토리 본문의 `$...$`, `$$...$$` 수식을 KaTeX로 렌더링하는 플러그인입니다.

## 주요 기능

- 인라인 수식 구분자 `$...$`를 렌더링합니다.
- 블록 수식 구분자 `$$...$$`를 렌더링합니다.
- KaTeX CSS, 본체 스크립트, auto-render 스크립트를 jsDelivr에서 한 번만 로드합니다.
- 렌더링이 끝난 본문에는 `data-katex-rendered="true"`를 남겨 중복 실행을 막습니다.
- `throwOnError: false`, `strict: false` 설정으로 수식 오류가 있어도 전체 렌더링이 중단되지 않습니다.

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

아래 셀렉터는 fallback 후보로 사용하며, 글 길이와 콘텐츠 신호가 충분할 때만 채택합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

스킨 구조가 다르면 `window.RPPlugins.articleSelectors`로 우선 탐색할 본문 셀렉터를 지정할 수 있습니다. 지정한 셀렉터를 먼저 확인한 뒤, 기본 후보를 이어서 탐색합니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".article-view", ".contents_style"],
  };
</script>
```

## 구분자

- 인라인 수식: `$...$`
- 블록 수식: `$$...$$`

## 렌더링 제외 태그

- `script`
- `noscript`
- `style`
- `textarea`
- `pre`
- `code`

코드블록이나 인라인 코드 안의 달러 표시는 무시됩니다.

## 선택 설정

`window.RPPlugins.katex` 속성을 통해 KaTeX 옵션을 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

```html
<script>
  window.RPPlugins = {
    katex: {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      ignoredClasses: ["math-ignore", "no-katex"],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      // katex options...
    },
  };
</script>
```

- `delimiters`: 수식 구분자 설정.
- `ignoredClasses`: KaTeX 렌더링 제외 클래스.
- `ignoredTags`: KaTeX 렌더링 제외 태그(추가 시 기본값을 덮어씁니다).

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```

## 참고 사항

- 별도 CSS를 직접 추가할 필요는 없습니다. 플러그인이 KaTeX `stylesheet`를 자동으로 삽입합니다.
- 네트워크 환경으로 인해 KaTeX 자산 로드에 실패하면 렌더링을 중단하고 콘솔에 에러를 남깁니다.
- 그리스 문자나 적분 기호처럼 KaTeX 명령을 쓸 때는 `\`가 필요합니다. 예: `$\alpha + \beta$`, `$$\int_0^1 x^2 dx$$`
- `$` 뒤에 숫자가 이어지는 가격 표기는 일반 텍스트로 유지되며, KaTeX 인라인 수식으로 해석하지 않습니다.
  - `$14`
  - `$12.99`
  - `$1,299`
  - `$1,299.99`
  - `$ 99`
  - `$12~$20`
