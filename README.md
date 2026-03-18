# tistory-plugins

티스토리 HTML 편집기에 스크립트와 필요한 경우 CSS 링크를 추가하는 방식으로 바로 적용할 수 있는 티스토리 블로그용 플러그인 모음입니다. 각 플러그인은 스킨 HTML 구조를 직접 바꾸지 않고, 런타임에서 필요한 요소를 찾아 동작을 추가합니다. 모든 플러그인은 jsDelivr CDN을 통해 제공되므로 별도 파일 업로드 없이 즉시 사용할 수 있습니다.

## 링크

- [저장소](https://github.com/romantech/tistory-plugins)
- [릴리즈 노트](https://github.com/romantech/tistory-plugins/releases)

## 플러그인 목록

| 플러그인 | 에셋       | 설명 | 문서 |
| --- |----------| --- | --- |
| [`inline-code`](src/plugins/inline-code) | JS       | 백틱으로 감싼 인라인 텍스트를 `<code>`로 변환합니다. | [README](src/plugins/inline-code/README.md) |
| [`katex`](src/plugins/katex) | JS       | `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다. | [README](src/plugins/katex/README.md) |
| [`copy-code`](src/plugins/copy-code) | JS + CSS | 코드블록 우측 상단에 복사 버튼을 추가합니다. | [README](src/plugins/copy-code/README.md) |
| [`focus-guard`](src/plugins/focus-guard) | JS       | 사이드바 토글 과정의 `aria-hidden` 포커스 경고를 완화합니다. | [README](src/plugins/focus-guard/README.md) |
| [`heading-anchor`](src/plugins/heading-anchor) | JS + CSS | 제목에 앵커 링크를 추가하고 해시 이동 위치를 보정합니다. | [README](src/plugins/heading-anchor/README.md) |

본문 감지 셀렉터, 처리 대상, 주의사항은 플러그인마다 다르므로 실제 적용 전에는 각 README를 함께 확인하는 편이 안전합니다.

## 빠른 적용 방법

1. 티스토리 관리자에서 `스킨 편집 > HTML 편집`을 엽니다.
2. CSS 파일이 필요한 플러그인은 `</head>` 바로 앞에 `<link>`를 추가합니다.
3. JS 파일은 `</body>` 바로 앞에 `<script>`를 추가합니다.

예시:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.css">
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

## CDN 경로 규칙

- JS: `https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.js`
- CSS: `https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<version>/dist/<plugin>/index.min.css`

버전 자리에 다음 값을 넣을 수 있습니다.

- `latest`: 최신 릴리즈
- 브랜치명: 예시 `main`
- 태그: 예시 `0.1.27`

## 조합 예시

인라인 코드, 수식, 코드 복사 버튼, 제목 앵커를 함께 쓰고 싶다면 다음과 같이 추가합니다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.css">

<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/katex/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

## 저장소 구조

- `src/plugins`: 플러그인 소스, 개별 README
- `src/shared`: 공통 유틸리티
- `dist`: CDN 배포용 빌드 산출물

## 개발 명령어

- `pnpm build`: `dist` 폴더에 배포용 파일을 생성합니다.
- `pnpm check`: Biome 포맷팅과 린트 검사를 수행하고 가능한 항목은 자동 수정합니다.
- `pnpm typecheck`: TypeScript 타입 검사를 수행합니다.
- `pnpm test`: Vitest 테스트를 실행합니다.
- `pnpm test:watch`: 테스트를 watch 모드로 실행합니다.
