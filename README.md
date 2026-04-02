# tistory-plugins

외부 스크립트만 추가하면 간편하게 적용할 수 있는 티스토리 블로그용 플러그인 모음입니다. 모든 플러그인은 jsDelivr CDN을 통해 제공되므로 별도 파일 업로드 없이 즉시
사용할 수 있습니다. 스킨 HTML 구조를 직접 바꾸지 않고, 런타임에서 필요한 요소를 찾아 동작을 추가합니다.

## 플러그인 목록

| 플러그인                                           | 에셋 | 설명                                       | 문서                                             |
|------------------------------------------------|----|------------------------------------------|------------------------------------------------|
| [`inline-code`](src/plugins/inline-code)       | JS | 백틱으로 감싼 인라인 텍스트를 `<code>`로 변환합니다.        | [README](src/plugins/inline-code/README.md)    |
| [`katex`](src/plugins/katex)                   | JS | `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다.    | [README](src/plugins/katex/README.md)          |
| [`copy-code`](src/plugins/copy-code)           | JS | 코드블록 우측 상단에 복사 버튼을 추가합니다.                | [README](src/plugins/copy-code/README.md)      |
| [`focus-guard`](src/plugins/focus-guard)       | JS | 사이드바 토글 과정의 `aria-hidden` 포커스 경고를 완화합니다. | [README](src/plugins/focus-guard/README.md)    |
| [`heading-anchor`](src/plugins/heading-anchor) | JS | 제목에 앵커 링크를 추가하고 해시 이동 위치를 보정합니다.         | [README](src/plugins/heading-anchor/README.md) |
| [`toc`](src/plugins/toc)                       | JS | 데스크톱 레일과 모바일 하단 토글형 목차를 표시합니다.          | [README](src/plugins/toc/README.md)            |

- 본문 감지 셀렉터, 처리 대상, 주의사항은 플러그인마다 다르므로 적용 전 README 내용을 확인해주세요.
- `copy-code`, `heading-anchor`, `toc`는 실행 시 같은 경로의 `index.min.css`를 자동으로 로드합니다.
- `katex`는 별도 companion CSS 대신 KaTeX stylesheet를 외부 CDN에서 주입합니다.

## 빠른 적용 방법

1. 티스토리 관리자 > 스킨 편집 > HTML 편집 페이지로 이동합니다.
2. JS 파일을 `</body>` 위에 `<script>`로 추가합니다.

예시:

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

## CDN 경로 규칙

```text
JS:  https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.js
CSS: https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.css
```

- CSS 경로는 `copy-code`, `heading-anchor`, `toc`처럼 companion CSS가 있는 플러그인에만 해당합니다.
- 버전 자리 예시: `latest`(최신 릴리즈), `main`(브랜치명), `0.1.27`(태그)

## 조합 예시

인라인 코드, 수식, 코드 복사 버튼, 제목 앵커를 함께 쓰고 싶다면 다음과 같이 추가합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/toc/index.min.js"></script>
```

## 전역 설정

플러그인 스크립트를 불러오기 전 `window.RPPlugins` 속성을 통해 공통 설정과 옵션을 변경할 수 있습니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".article-view", ".contents_style"],
    copyCode: {
      buttonText: "복사",
      successText: "완료",
      errorText: "실패",
      ariaLabel: "코드 복사"
    },
    headingAnchor: {
      levels: [2, 3, 4, 5],
      headerOffset: 64
    },
    inlineCode: {
      targetSelector: "p, li, td, figcaption",
      blockedSelector: "code, pre, script, style, textarea"
    },
    katex: {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "\\(", right: "\\)", display: false}
      ],
      ignoredClasses: ["math-ignore", "no-katex"],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    },
    toc: {
      levels: [2, 3, 4],
      headerOffset: 64
    }
  };
</script>
```

- `articleSelectors`: 본문 컨테이너 감지용 셀렉터.
- `copyCode`: 버튼 문구와 `aria-label`을 바꿉니다.
- `headingAnchor`: 처리할 제목 레벨과 해시 이동 오프셋.
- `inlineCode`: 인라인 코드 변환 대상/제외 셀렉터.
- `katex`: 수식 구분자, 무시 클래스/태그.
- `toc`: 레일/모바일 목차에 포함할 제목 레벨과 스크롤 오프셋.

## 저장소 구조

- `src/plugins`: 플러그인 소스, 개별 README
- `src/shared`: 공통 유틸리티
- `dist`: CDN 배포용 빌드 산출물

## 개발 명령어

| 명령어                                    | 설명                                                                                                                |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `pnpm clean`                           | `dist` 폴더를 정리합니다.                                                                                                 |
| `pnpm build`                           | `dist` 폴더를 정리한 뒤 배포용 파일을 생성합니다.                                                                                   |
| `pnpm preview <url>`                   | 실제 블로그 페이지를 열고 jsDelivr `dist/*` 요청을 로컬 빌드 결과로 override합니다. 기본적으로 watch 모드로 동작하며, 첫 실행 이후에는 마지막 URL을 재사용할 수 있습니다. |
| `pnpm preview --plugin <plugin>`       | 특정 플러그인만 빌드하고 override 범위를 제한합니다. watch 중에도 해당 플러그인 범위로 재빌드합니다.                                                   |
| `pnpm preview <url> --inject <plugin>` | 플러그인을 설치하지 않은 블로그에도 선택한 로컬 `dist` 에셋을 직접 주입해 미리 확인합니다. 여러 플러그인은 쉼표로 구분할 수 있고, watch 중에도 해당 범위로 재빌드합니다.            |
| `pnpm check`                           | Biome 검사를 읽기 전용으로 수행합니다.                                                                                          |
| `pnpm check:write`                     | Biome 검사 결과를 가능한 범위에서 자동 수정합니다.                                                                                   |
| `pnpm typecheck`                       | TypeScript 타입 검사를 수행합니다.                                                                                          |
| `pnpm test`                            | Vitest 테스트를 실행합니다.                                                                                                |
| `pnpm test:watch`                      | 테스트를 watch 모드로 실행합니다.                                                                                             |
