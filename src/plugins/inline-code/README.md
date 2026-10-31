# inline-code

티스토리 본문에서 백틱으로 감싼 텍스트를 `<code>`로 바꿉니다. 별도 CSS 없이 스킨의 코드 스타일을 사용합니다.

## 설치

스킨 HTML 편집에서 `</body>` 바로 위에 스크립트를 추가합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```

## 사용법

본문에 백틱 한 쌍으로 감싼 텍스트를 작성합니다.

```html
<p>설치 명령어는 `pnpm install`입니다.</p>
```

페이지가 열리면 다음처럼 변환됩니다.

```html
<p>설치 명령어는 <code>pnpm install</code>입니다.</p>
```

기본 처리 대상은 `p`, `blockquote`, `.table-content`, `h1`~`h4`, `li`, `figcaption`입니다. `code`, `pre`, `script`, `style`, `textarea` 안의 텍스트와 Mermaid 원본·렌더링 결과는 건너뜁니다.

본문을 찾는 방식과 스킨별 설정은 [본문 컨테이너 감지](../../../README.md#본문-컨테이너-감지)를 참고하세요.

## 설정

플러그인 스크립트 앞에 선언합니다. 지정한 셀렉터는 기본값을 대체합니다.

```html
<script>
  window.RPPlugins = {
    inlineCode: {
      targetSelector: "p, li, td, figcaption",
      blockedSelector: "code, pre, script, style, textarea",
    },
  };
</script>
```

- `targetSelector`: 변환할 텍스트가 들어 있는 요소.
- `blockedSelector`: 변환에서 제외할 요소. Mermaid 원본과 결과는 이 설정과 관계없이 제외합니다.

## 제한사항

백틱 쌍은 같은 텍스트 노드 안에 있어야 합니다. 백틱 사이에 HTML 태그나 줄바꿈이 있으면 변환하지 않습니다. 이미 `<code>`로 작성한 부분은 그대로 둡니다.
