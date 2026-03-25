# katex

티스토리 본문의 `$...$`, `$$...$$` 수식을 KaTeX로 렌더링하는 플러그인입니다.

## 주요 기능

- 인라인 수식 구분자 `$...$`를 렌더링합니다.
- 블록 수식 구분자 `$$...$$`를 렌더링합니다.
- KaTeX CSS, 본체 스크립트, auto-render 스크립트를 jsDelivr에서 한 번만 로드합니다.
- 본문에 수식 패턴이 있을 때만 KaTeX 자산을 로드합니다.
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

아래 셀렉터는 fallback 후보로 사용합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

## 구분자

- 인라인 수식: `$...$`
- 블록 수식: `$$...$$`

## 렌더링 제외 태그 및 영역

아래 태그와 영역은 수식 존재 여부 검사와 렌더링 대상에서 제외합니다.

### 태그

- `script`
- `noscript`
- `style`
- `textarea`
- `pre`
- `code`

### 영역

- `[hidden]`
- `[aria-hidden="true"]`
- `.activity-content-wrap`
- `.another-category`
- `.revenue_unit_wrap`
- `[data-tistory-react-app]`

코드블록이나 인라인 코드 안의 달러 표시는 무시됩니다.

## 설치 방법

아래 스크립트를 `</body>` 위에 삽입합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```

## 참고 사항

- 별도 CSS를 직접 추가할 필요는 없습니다. 플러그인이 KaTeX `stylesheet`를 자동으로 삽입합니다.
- 네트워크 환경으로 인해 KaTeX 자산 로드에 실패하면 렌더링을 중단하고 콘솔에 에러를 남깁니다.
- 그리스 문자나 적분 기호처럼 KaTeX 명령을 쓸 때는 `\`가 필요합니다. 예: `$\alpha + \beta$`, `$$\int_0^1 x^2 dx$$`
