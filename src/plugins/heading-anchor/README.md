# heading-anchor

티스토리 본문 내 제목에 앵커 링크를 자동으로 추가하는 플러그인입니다. 제목을 클릭하거나 제목 옆 `#` 앵커를 클릭하면 현재 섹션의 URL 해시를 갱신하고, 해당 링크를 클립보드에 복사한 뒤 헤더 높이를 고려해 해당 위치로 스크롤합니다.

이미지가 많은 글에서 초기 해시 진입 시 스크롤 위치가 어긋날 수 있는 문제를 줄이기 위해, 대상 제목 이전 이미지들의 로딩이 끝난 뒤 한 번 더 위치를 보정합니다.

이 플러그인은 다음 방식으로 섹션 링크 이동과 복사를 보조합니다.

- `h2`, `h3`, `h4` 제목에 `#` 앵커 링크 자동 추가
- 제목 클릭 시 현재 섹션 링크를 클립보드에 복사하고 해당 위치로 스크롤
- 제목에 `id`가 없으면 텍스트 기반 `slug`를 생성하고, 중복 시 고유 `ID`로 보정
- 초기 해시 진입 시 이미지 로딩 완료 후 스크롤 위치 재보정
- CSS 변수 `--header-height` 값을 기준으로 고정 헤더 높이 반영

## 동작 대상

다음 본문 컨테이너 중 먼저 발견되는 영역을 대상으로 동작합니다.

- `#article`
- `.article-view`
- `.tt_article_useless_p_margin`

다음 제목 요소를 처리합니다.

- `h2`
- `h3`
- `h4`

## 사용 방법

### 1. CSS 추가하기

아래 CSS를 티스토리 HTML 편집기의 `</head>` 태그 앞에 삽입합니다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.css">
```

### 2. 자바스크립트 추가하기

아래 스크립트를 티스토리 HTML 편집기의 `</body>` 태그 앞에 삽입합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

필요하다면 고정 헤더 높이에 맞게 CSS 변수 값을 조정합니다.

```css
:root {
  --header-height: 84px;
}
```
## 주의 사항

- 이 플러그인은 런타임에서 제목 요소에 앵커 링크와 ID를 추가하는 방식입니다.
- 제목에 이미 `id`가 있으면 해당 값을 그대로 사용합니다.
- 클립보드 API를 사용할 수 없는 환경에서는 링크 복사가 생략될 수 있지만, 해시 변경과 스크롤 이동은 계속 동작합니다.
- 스킨 구조나 이미지 로딩 방식에 따라 초기 해시 보정 결과가 일부 다를 수 있습니다.
- `--header-height` 값은 스킨의 실제 고정 헤더 높이와 맞춰 두는 것이 좋습니다.
