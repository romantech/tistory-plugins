# katex

![KaTeX로 렌더링한 본문 수식](/docs/images/katex.png)

티스토리 본문의 수식을 KaTeX로 렌더링합니다.

## 설치

스킨 HTML 편집에서 `</body>` 바로 위에 스크립트를 추가합니다. KaTeX 스크립트와 CSS는 CDN에서 자동으로 불러옵니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
```

## 작성 방법

| 유형 | 구분자 | 예시 |
| --- | --- | --- |
| 인라인 수식 | `$...$` | `$\alpha + \beta$` |
| 블록 수식 | `$$...$$` | `$$\int_0^1 x^2\,dx$$` |

KaTeX 명령어의 백슬래시(`\`)를 빠뜨리지 마세요. 아래처럼 가격으로 쓰인 `$`는 수식으로 처리하지 않습니다.

```text
$14 · $12.99 · $1,299 · $1,299.99 · $ 99 · $12~$20
```

기본적으로 `script`, `noscript`, `style`, `textarea`, `pre`, `code` 안의 텍스트를 제외합니다. Mermaid 원본과 렌더링 결과도 수식 변환과 가격 처리에서 제외하며, 이 규칙은 제외 태그·클래스를 바꿔도 유지됩니다.

본문을 찾는 방식과 스킨별 설정은 [본문 컨테이너 감지](../../../README.md#본문-컨테이너-감지)를 참고하세요.

## 설정

플러그인 스크립트 앞에 선언합니다. 아래 예시는 인라인 수식 구분자를 `\(...\)`로 바꿉니다.

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
    },
  };
</script>
```

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `delimiters` | `$$...$$`, `$...$` | 비어 있지 않은 목록을 지정하면 기본 구분자를 대체 |
| `ignoredClasses` | 사용자 지정 없음 | 기본 제외 클래스에 추가할 클래스 이름 |
| `ignoredTags` | 위의 제외 태그 목록 | 비어 있지 않은 목록을 지정하면 기본 태그를 대체 |
| `throwOnError` | `false` | 수식 오류 시 예외 발생 여부 |
| `strict` | `false` | 엄격한 문법 검사 여부 |

지원하는 옵션은 위 다섯 가지입니다.

## 참고

한 번 렌더링한 본문은 다시 처리하지 않습니다. KaTeX 파일을 불러오지 못하면 변환을 중단하고 콘솔에 오류를 남깁니다.
