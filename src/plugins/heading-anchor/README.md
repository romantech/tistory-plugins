# heading-anchor

![heading-anchor demo](/docs/images/heading-anchor.gif)

티스토리 본문 제목에 앵커 링크를 추가하고, 해시 이동 시 고정 헤더 높이를 반영해 스크롤 위치를 보정하는 플러그인입니다.

## 주요 기능

- `h2`, `h3`, `h4` 제목에 앵커 링크를 추가합니다.
- 제목에 `id`가 없으면 텍스트 기반 slug에 `rp-` 접두사를 붙여 ID를 생성하고, 중복 시 고유한 값으로 보정합니다.
- 제목 또는 앵커 클릭 시 `history.replaceState`로 해시를 갱신한 뒤 부드럽게 스크롤합니다.
- 초기 해시 진입 시 폰트 로딩, `load` 이후 지연, `visualViewport.resize`, bfcache 복원(`pageshow`) 등 다양한 시점에서 스크롤 위치를 재보정합니다.
- 제목 안에 이미 `<a>` 요소가 있으면 링크 중첩을 피하기 위해 앵커 래핑을 생략하고 ID만 부여합니다.

## 본문 컨테이너 감지

아래 셀렉터를 순서대로 탐색합니다. kebab-case 기준으로 정의되어 있으며, snake_case 변형도 함께 확인합니다.

- `.contents-style`
- `.entry-content`
- `.area-view`
- `.post-content`
- `.article-view`
- `#article`
- `.article-cont`

아래 셀렉터는 fallback 후보로 사용하며, 글 길이와 콘텐츠 신호가 충분할 때만 채택합니다.

- `.tt-article-useless-p-margin`
- `.inner-content`

스킨 구조가 다를 경우 `window.RPPlugins.articleSelectors`로 우선 탐색할 셀렉터를 지정할 수 있습니다. 지정한 셀렉터를 먼저 확인한 뒤 기본 후보를 이어서 탐색합니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".my-article", "#main-content"],
  };
</script>
```

## 처리 대상

- 제목 셀렉터: `h2`, `h3`, `h4`
- 기본 헤더 오프셋: `84px`
- 오프셋 조정용 CSS 변수: `--header-height`

## 선택 설정

`window.RPPlugins.headingAnchor`로 처리할 제목 레벨과 해시 이동 오프셋을 조정할 수 있습니다. 설정 코드는 플러그인 스크립트보다 먼저 선언해야 합니다.

```html
<script>
  window.RPPlugins = {
    headingAnchor: {
      levels: [2, 3, 4, 5],
      headerOffset: 64,
    },
  };
</script>
```

- `levels`: 앵커를 추가할 제목 레벨.
- `headerOffset`: 해시 이동 시 적용할 헤더 오프셋(px). 미지정 시 `:root`의 `--header-height` 값을 사용하며, 해당 변수도 없으면 기본값 `84px`를 사용합니다.

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다. 스크립트가 실행되면 같은 경로의 `index.min.css`를 자동으로 로드합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

## 동작 흐름

1. 본문에서 `h2`, `h3`, `h4`를 찾습니다.
2. 각 제목의 최종 `id`를 결정합니다.
3. 제목 안에 기존 링크가 없으면 텍스트 전체를 앵커로 감싸고 끝에 `#` 마커를 추가합니다.
4. 제목 클릭 시 현재 섹션 해시를 갱신하고 헤더 높이를 반영해 스크롤합니다.
5. 해시가 포함된 URL로 직접 진입한 경우 여러 시점에서 위치를 재보정해 이미지·폰트·뷰포트 변화로 인한 오차를 줄입니다.

## 참고 사항

- 플러그인이 제목 요소를 런타임에 수정하므로, 스킨 CSS가 제목 내부 링크 스타일을 강하게 재정의하고 있다면 추가 조정이 필요할 수 있습니다.
- 플러그인이 생성하는 ID는 `rp-` 접두사를 사용해 스킨의 기존 ID(예: `#pagination`)와의 충돌을 방지합니다.
- 제목 내부에 기존 링크가 있으면 앵커 래핑을 생략하므로 `#` 마커도 추가되지 않습니다.
- 초기 해시 보정은 로드 직후 여러 차례에 걸쳐 수행되므로, 환경에 따라 아주 짧은 추가 스크롤이 발생할 수 있습니다.
