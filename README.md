# tistory-plugins

jsDelivr를 통해 불러와 티스토리 HTML 편집기에서 사용할 수 있는 스크립트 모음입니다.

## 구조

- `src`: 브라우저에서 바로 실행할 수 있는 독립형 스크립트

## 현재 플러그인

- `inline-code.js`: 본문에서 백틱으로 감싼 텍스트를 `<code>`로 감쌉니다.

## 사용 방법

이 저장소를 GitHub에 올린 뒤, 티스토리 HTML 편집 영역에서 아래처럼 스크립트를 불러오면 됩니다.

```html
<script src="https://cdn.jsdelivr.net/gh/<github-user>/tistory-plugins@main/src/inline-code.js"></script>
```

업데이트를 배포할 때는 `main` 대신 태그를 사용해야 캐시를 더 안정적으로 관리할 수 있습니다.

## 개발 명령

```bash
pnpm format
pnpm check
```
