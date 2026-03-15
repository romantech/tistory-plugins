# tistory-plugins

외부 스크립트 방식으로 간편하게 적용할 수 있는 티스토리 블로그용 커스텀 플러그인 모음입니다. 모든 플러그인은 jsDelivr CDN을 통해 제공되므로 별도 파일 업로드 없이 즉시 사용할 수 있습니다.

## 링크

- 저장소: https://github.com/romantech/tistory-plugins
- 릴리즈 노트: https://github.com/romantech/tistory-plugins/releases

## 폴더 구조

- `src`: 플러그인별 TypeScript 소스
- `dist`: jsDelivr CDN을 통해 배포되는 minified 빌드 파일

## 사용 방법

티스토리 관리자의 [스킨 편집] > [HTML 편집]에서 원하는 플러그인의 CDN 경로를 스크립트로 추가하여 사용합니다.

예시:

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/inline-code/index.min.js"></script>
```

## 플러그인 목록

| 플러그인 | 용도 | 문서 |
|---|---|---|
| [`inline-code`](src/inline-code) | 백틱으로 감싼 텍스트를 `<code>`로 변환합니다. | [README](src/inline-code/README.md) |
| [`katex`](src/katex) | `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다. | [README](src/katex/README.md) |
| [`copy-code`](src/copy-code) | 코드블록 우측 상단에 복사 버튼을 추가합니다. | [README](src/copy-code/README.md) |

## 개발 명령어
프로젝트 환경 설정 및 빌드 명령어입니다. 패키지 매니저는 `pnpm`을 사용합니다.

- `pnpm build`: `dist` 폴더에 배포용 파일 생성
- `pnpm check`: 코드 포맷팅 및 린트 검사/수정
- `pnpm typecheck`: TypeScript 타입 유효성 검사
- `pnpm test:run`: Vitest 테스트 실행


## 버전 지정
CDN URL에 태그나 브랜치를 지정하여 원하는 기준으로 사용할 수 있습니다.

- `@latest`: 최신 배포 버전
- `@<branch>`: 특정 브랜치 (예: `@main`)
- `@<tag>`: 특정 버전 (예: `@0.1.5`)
