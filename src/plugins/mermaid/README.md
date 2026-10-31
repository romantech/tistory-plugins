# mermaid

티스토리 본문의 Mermaid 문법을 [Pele](https://pele.run/)로 SVG 다이어그램으로 렌더링합니다.

## 설치

스킨 HTML 편집에서 `</body>` 바로 위에 스크립트를 추가합니다. 같은 경로의 CSS는 자동으로 불러옵니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/mermaid/index.min.js"></script>
```

## 작성 방법

코드블록에 Mermaid 문법을 입력하고 HTML 모드에서 언어를 `mermaid`로 지정합니다. 에디터의 언어 목록에 Mermaid가 없어도 HTML 속성을 직접 바꾸면 됩니다.

```html
<pre data-ke-language="mermaid"><code>flowchart LR
  A[시작] --> B{조건}
  B -->|성공| C[완료]
  B -->|실패| D[재시도]
</code></pre>
```

HTML 요소에 `class="mermaid"`를 지정해도 됩니다.

```html
<div class="mermaid">
sequenceDiagram
  participant U as 사용자
  participant S as 서버
  U->>S: 요청
  S-->>U: 응답
</div>
```

감지하는 마크업은 다음과 같습니다.

- `.mermaid` (`div`, `pre`, `code` 등)
- `pre[data-ke-language="mermaid"]`
- `pre > code.language-mermaid`
- `pre > code.lang-mermaid`

본문 컨테이너 안에서만 동작합니다. 공통 감지 방식과 `articleSelectors` 설정은 [루트 문서](../../../README.md#본문-컨테이너-감지)를 참고하세요. 원본의 개행과 들여쓰기를 유지하며, 중첩된 마커는 하나의 다이어그램으로 처리합니다.

## 라이트·다크모드

기본값은 시스템의 `prefers-color-scheme`을 따릅니다. Pele의 `--pele-bg`, `--pele-fg`, `--pele-muted`, `--pele-line`, `--pele-surface`, `--pele-surface-alt`, `--pele-border`, `--pele-accent` 변수를 지정해 배경·텍스트·화살표·노드의 대비를 맞춥니다. 시퀀스 메시지 레이블에도 같은 변수가 적용됩니다.

스크립트보다 먼저 설정하면 특정 테마로 고정할 수 있습니다.

```html
<script>
  window.RPPlugins = {
    mermaid: { theme: "auto" }, // "auto" | "light" | "dark"
  };
</script>
```

스킨이 별도 클래스나 속성으로 테마를 전환한다면 해당 선택자에 맞춰 CSS를 추가하세요. 예를 들어 `html[data-theme]`을 쓰는 스킨은 다음과 같이 연결합니다.

```css
html[data-theme="light"] .rp-mermaid { color-scheme: light; }
html[data-theme="dark"] .rp-mermaid { color-scheme: dark; }
```

색 변경은 CSS로 즉시 반영되며 SVG를 다시 생성하지 않습니다. 색을 직접 조정하려면 컨테이너에 변수를 재정의합니다.

```css
html[data-theme="dark"] .rp-mermaid {
  --pele-bg: #181a1f;
  --pele-fg: #e6edf3;
  --pele-line: #b6c2cf;
}
```

변수 전체 목록은 [Pele 테마 문서](https://pele.run/theming)를 참고하세요. Mermaid 소스의 `style`, `classDef` 등에서 직접 지정한 고정 색은 테마 전환을 따르지 않습니다. 테마 기본 스타일은 `light-dark()`를 지원하는 최신 브라우저가 필요합니다.

## 동작 및 제한

- 다이어그램이 있는 페이지에서만 Pele **1.6.0**의 브라우저 번들을 jsDelivr에서 불러옵니다. 플러그인 번들에 포함하지 않으며, 중복 실행 시 로딩 요청을 공유합니다. 이미 `window.pele.mount`가 있으면 재사용합니다.
- [Pele의 `mount()`](https://pele.run/api#mount)가 본문 너비에 맞춰 렌더링하고 너비·웹폰트 변경을 처리합니다. 좁은 화면에서는 지원하는 다이어그램의 방향과 줄바꿈이 조정될 수 있습니다. 확대·이동 UI는 추가하지 않습니다.
- `copy-code`는 Mermaid 블록에 버튼을 붙이지 않습니다. `katex`와 `inline-code`는 원본 Mermaid 및 렌더링 결과를 건너뜁니다. 함께 쓰는 플러그인도 같은 버전으로 업데이트하세요.
- 빈 블록은 그대로 둡니다. 문법 오류·렌더링 실패·CDN 로딩 실패(15초 제한) 시 원본 DOM을 유지하고 콘솔에 오류를 기록합니다. 다른 다이어그램과 페이지 기능은 계속 동작합니다.
- [Pele의 SVG 이스케이프·URL 필터·크기 제한](https://pele.run/security)을 그대로 사용합니다. Mermaid.js와 레이아웃이나 일부 문법 동작이 다를 수 있습니다.
- 최초 본문만 처리합니다. 페이지 로드 후 동적으로 삽입하는 다이어그램은 자동 감지하지 않습니다.
