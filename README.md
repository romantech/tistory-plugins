# tistory-plugins

![데스크톱 목차에 마우스를 올렸을 때의 모습](/docs/images/toc-desktop-hover.png)

티스토리 블로그에 인라인 코드, 수식, 다이어그램, 목차 등을 추가합니다. 스킨 HTML에 필요한 플러그인의 `<script>` 태그를 넣으면 됩니다. 파일을 따로 업로드하거나 본문 구조를 바꿀 필요는 없습니다.

## 플러그인 목록

| 플러그인 | 설명 |
| --- | --- |
| [inline-code](src/plugins/inline-code/README.md) | 백틱으로 감싼 텍스트를 `<code>`로 변환합니다. |
| [katex](src/plugins/katex/README.md) | `$...$`, `$$...$$` 수식을 렌더링합니다. |
| [mermaid](src/plugins/mermaid/README.md) | Mermaid 문법을 라이트·다크 모드에 맞는 SVG 다이어그램으로 변환합니다. |
| [copy-code](src/plugins/copy-code/README.md) | 코드 블록 오른쪽 위에 복사 버튼을 추가합니다. |
| [focus-guard](src/plugins/focus-guard/README.md) | 사이드바를 열고 닫을 때 발생하는 `aria-hidden` 포커스 경고를 줄입니다. |
| [heading-anchor](src/plugins/heading-anchor/README.md) | 제목에 링크를 추가하고 고정 헤더에 가리지 않도록 이동 위치를 조정합니다. |
| [toc](src/plugins/toc/README.md) | 넓은 화면에는 본문 옆 목차를, 좁은 화면에는 팝업 목차를 표시합니다. |

## 설치

1. 티스토리 관리자 → 스킨 편집 → HTML 편집 페이지로 이동합니다.
2. 원하는 플러그인의 `<script>` 태그를 `</body>` 바로 위에 추가합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

CSS가 필요한 플러그인은 스타일시트도 자동으로 불러옵니다. `katex`와 `mermaid`는 렌더링 라이브러리를 외부 CDN에서 추가로 불러옵니다.

## CDN 경로 규칙

```text
JS:  https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.js
CSS: https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.css
```

- CSS 파일은 `copy-code`, `heading-anchor`, `mermaid`, `toc`에만 있습니다. 직접 `<link>` 태그를 추가할 필요는 없습니다.
- `<version>`에는 `latest`(최신 릴리스), `main`(개발 브랜치), 릴리스 태그(예: `0.1.27`)를 넣습니다. 특정 버전을 유지하려면 태그를 사용하세요.

## 조합 예시

여러 플러그인을 함께 쓸 때는 필요한 스크립트를 나란히 추가합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/mermaid/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/toc/index.min.js"></script>
```

## 전역 설정

기본 설정으로 사용할 때는 별도 선언이 필요 없습니다. 옵션을 바꾸려면 플러그인 스크립트 **앞에** `window.RPPlugins`를 선언합니다. 아래는 본문 영역, 복사 버튼 문구, 고정 헤더 높이를 지정하는 예시입니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".my-article", "#main-content"],
    copyCode: { buttonText: "복사", successText: "완료" },
    headingAnchor: { headerOffset: 64 },
    toc: { headerOffset: 64 },
  };
</script>
```

각 플러그인 문서의 설정 예시를 함께 쓸 때도 `window.RPPlugins` 하나에 합쳐 넣으세요. 여러 번 대입하면 앞서 지정한 설정을 덮어씁니다.

| 옵션 | 설정할 수 있는 항목 |
| --- | --- |
| `articleSelectors` | 우선 탐색할 본문 셀렉터 |
| `copyCode` | 버튼 문구와 접근성 레이블 |
| `headingAnchor` | 제목 레벨과 스크롤 오프셋 |
| `inlineCode` | 변환 대상과 제외 셀렉터 |
| `katex` | 수식 구분자, 제외 클래스·태그, 오류 처리 |
| `mermaid` | 테마 (`auto`, `light`, `dark`) |
| `toc` | 제목 레벨과 스크롤 오프셋 |

## 본문 컨테이너 감지

본문을 처리하는 플러그인은 아래 셀렉터를 순서대로 찾습니다. 하이픈(`-`)을 밑줄(`_`)로 바꾼 이름도 함께 확인합니다.

- `.contents-style`
- `.entry-content`
- `.area-view`
- `.post-content`
- `.article-view`
- `#article`
- `.article-cont`

위 셀렉터로 찾지 못하면 `.tt-article-useless-p-margin`, `.inner-content`를 확인합니다. 이때는 공백을 제외한 텍스트가 200자 이상이고 문단·이미지·코드 블록 등의 요소가 있어야 본문으로 인식합니다.

스킨 구조가 다르면 [전역 설정](#전역-설정)의 `articleSelectors`에 본문 셀렉터를 지정하세요. 지정한 셀렉터를 먼저 찾고, 없으면 기본 목록을 확인합니다. 본문을 찾지 못하면 해당 플러그인은 동작하지 않습니다.

## 저장소 구조

```text
src/plugins   플러그인 소스 및 개별 README
src/shared    공통 유틸리티
dist          CDN 배포용 빌드 산출물
```

## 개발 명령어

`package.json`의 Node.js 버전 조건에 맞는 환경에서 `pnpm install`로 의존성을 설치합니다.

| 명령어 | 설명 |
| --- | --- |
| `pnpm check` | Biome 검사 |
| `pnpm check:write` | Biome 자동 수정 |
| `pnpm typecheck` | TypeScript 타입 검사 |
| `pnpm test` | 전체 테스트 |
| `pnpm test:watch` | 파일 변경 시 테스트 재실행 |
| `pnpm clean` | `dist` 삭제 |
| `pnpm build` | `dist`를 비우고 배포 파일 생성 |

### 블로그에서 미리 보기

`pnpm preview`는 [예제 글](https://romantech.net/1079)을 열고, 이 저장소의 jsDelivr 플러그인 요청을 로컬 빌드로 대체합니다. 소스가 바뀌면 다시 빌드하고 페이지를 새로고침합니다.

```sh
pnpm preview
pnpm preview --plugin mermaid
```

다른 글에서 확인하려면 스크립트를 직접 실행합니다. 해당 글에 플러그인이 이미 설치되어 있으면 `--plugin`을, 설치되어 있지 않으면 `--inject`를 사용하세요. 두 옵션은 함께 쓸 수 없습니다.

```sh
node scripts/preview-dist.mjs https://example.tistory.com/123 --plugin mermaid --watch
node scripts/preview-dist.mjs https://example.tistory.com/123 --inject mermaid --watch
```

여러 플러그인은 쉼표로 구분합니다. `--viewport 390x844`로 화면 크기를 지정할 수 있고, `--headless --close-after-ms 3000`을 붙이면 창 없이 실행한 뒤 자동으로 종료합니다. 직접 실행할 때 URL을 생략하면 마지막으로 미리 본 URL을 사용합니다.
