# tistory-plugins

티스토리 HTML 편집기에서 외부 스크립트로 불러와 사용할 수 있는 플러그인 저장소입니다. 각 플러그인은 jsDelivr CDN을 통해 사용할 수 있습니다.

## 저장소

- GitHub: https://github.com/romantech/tistory-plugins
- Releases: https://github.com/romantech/tistory-plugins/releases

## 구조

- `src`: 플러그인별 폴더
- 필요 시 각 플러그인 폴더에 `README.md` 설명을 추가합니다.

## 플러그인

| 플러그인 | 용도 | 문서 |
|---|---|---|
| [`inline-code`](src/inline-code) | 백틱으로 감싼 텍스트를 `<code>`로 변환합니다. | [README](src/inline-code/README.md) |
| [`katex`](src/katex) | `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다. | [README](src/katex/README.md) |

## 버전 정책

- `main`: 개발 및 테스트용
- `@latest`: 기본 배포용 CDN 경로
- 버전을 고정하려면 `@0.1.0` 같은 태그를 사용합니다.
