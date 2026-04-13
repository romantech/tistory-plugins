# katex

![katex demo](/docs/images/katex.png)

티스토리 본문의 `$...$`, `$$...$$` 수식을 KaTeX로 렌더링하는 플러그인입니다.

## 주요 기능

- 인라인 수식 구분자 `$...$` 및 블록 수식 구분자 `$$...$$`를 렌더링합니다.
- 렌더링 완료 후 본문에 `data-katex-rendered="true"` 속성을 추가해 중복 실행을 방지합니다.
- `throwOnError: false`, `strict: false` 설정으로 수식 오류가 있어도 렌더링이 중단되지 않습니다.

## 본문 컨테이너 감지

본문 컨테이너 감지 방식(셀렉터, `window.RPPlugins.articleSelectors`)은 [링크](../../../README.md#본문-컨테이너-감지)를 참고해주세요.

## 구분자

| 유형 | 구분자 |
|------|--------|
| 인라인 수식 | `$...$` |
| 블록 수식 | `$$...$$` |

## 렌더링 제외 태그

`script` `noscript` `style` `textarea` `pre` `code`

코드 블록 및 인라인 코드 안의 `$` 기호는 수식으로 해석하지 않습니다.

## 선택 설정

`window.RPPlugins.katex` 속성으로 KaTeX 옵션을 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

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
      // 추가 KaTeX 옵션...
    },
  };
</script>
```

| 옵션 | 설명 |
|------|------|
| `delimiters` | 수식 구분자 목록 |
| `ignoredClasses` | 렌더링 제외 클래스 |
| `ignoredTags` | 렌더링 제외 태그 (지정 시 기본값을 덮어씁니다) |

## 설치

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 바로 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```

## 참고 사항

- CSS를 별도로 추가할 필요가 없습니다. 플러그인이 KaTeX `stylesheet`를 자동으로 삽입합니다.
- KaTeX 자산 로드에 실패하면 렌더링을 중단하고 콘솔에 오류를 출력합니다.
- 그리스 문자·적분 기호 등 KaTeX 명령어에는 백슬래시(`\`)가 필요합니다.
  - 예: `$\alpha + \beta$`, `$$\int_0^1 x^2\,dx$$`
- 아래 패턴은 가격 표기로 간주하여 수식으로 해석하지 않습니다.

```
  $14 · $12.99 · $1,299 · $1,299.99 · $ 99 · $12~$20
```
