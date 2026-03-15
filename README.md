# tistory-plugins

티스토리 HTML 편집기에서 외부 스크립트로 불러와 사용할 수 있는 플러그인 저장소입니다. GitHub에 배포한 뒤 jsDelivr CDN을 통해 사용할 수 있습니다.

## 저장소

- GitHub: https://github.com/romantech/tistory-plugins
- Releases: https://github.com/romantech/tistory-plugins/releases

## 구조

- `src`: 플러그인별 폴더
- 필요 시 각 플러그인 폴더에 `README.md` 설명을 추가합니다.

## 플러그인

- [`inline-code`](src/inline-code)
  - 용도: 백틱으로 감싼 텍스트를 `<code>`로 변환합니다.
  - 문서: [src/inline-code/README.md](src/inline-code/README.md)
  - jsDelivr: `https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<tag>/src/inline-code/index.js`
- [`katex`](src/katex)
  - 용도: `$...$`, `$$...$$` 수식을 KaTeX로 렌더링합니다.
  - 문서: [src/katex/README.md](src/katex/README.md)
  - jsDelivr: `https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@<tag>/src/katex/index.js`

## 배포 절차

```bash
git add .
git commit -m "feat: ..."
git push origin main

git tag -a <tag> -m "Release <tag>"
git push origin <tag>

gh release create <tag> --verify-tag --title "<tag>"
```

## 버전 정책

- `main`: 개발 및 테스트용
- `v0.1.0` 같은 태그: 운영 배포용
- 운영 환경에서는 `main` 대신 태그 버전을 사용합니다.
