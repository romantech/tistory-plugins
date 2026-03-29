# heading-anchor

티스토리 본문 제목에 앵커 링크를 추가하고, 해시 이동 시 고정 헤더 높이를 고려해 스크롤 위치를 보정하는 플러그인입니다.

## 주요 기능

- `h2`, `h3`, `h4` 제목에 앵커 링크를 추가합니다.
- 제목에 `id`가 없으면 텍스트 기반 `slug`를 만들고, 이미 있더라도 중복되면 고유한 ID로 보정합니다.
- 제목 또는 앵커를 클릭하면 `history.replaceState`로 해시를 갱신한 뒤 부드럽게 스크롤합니다.
- 초기 해시 진입 시 폰트 로딩, `load` 이후 지연 시점, `visualViewport.resize`, bfcache 복원(`pageshow`)까지 고려해 위치를 재보정합니다.
- 제목 안에 이미 다른 `<a>` 요소가 있으면 링크 중첩을 피하기 위해 앵커 래핑은 생략하고 ID만 정리합니다.

## 본문 컨테이너 감지

아래 셀렉터 중 가장 먼저 찾은 본문 영역에서 동작합니다.

- `.contents_style`
- `.entry-content`
- `.area_view`
- `.post-content`
- `.article_view`
- `.article-view`
- `#article`
- `.article_cont`

아래 셀렉터는 fallback 후보로 사용합니다.

- `.tt_article_useless_p_margin`
- `.inner_content`

## 처리 대상

- 제목 셀렉터: `h2`, `h3`, `h4`
- 기본 헤더 오프셋: `84px`
- 조정용 CSS 변수: `--header-height`

## 선택 설정

`window.RPPlugins.headingAnchor` 속성을 통해 처리할 제목 레벨과 해시 이동 오프셋을 조정할 수 있습니다.

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
- `headerOffset`: 해시 이동 시 사용할 헤더 오프셋 픽셀 값.

## 설치 방법

### 1. CSS 추가

아래 코드를 `</head>` 위에 삽입합니다.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.css">
```

### 2. JS 추가

아래 코드를 `</body>` 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/heading-anchor/index.min.js"></script>
```

## 동작 흐름

1. 본문에서 `h2`, `h3`, `h4`를 찾습니다.
2. 각 제목의 최종 `id`를 결정합니다.
3. 제목 안에 링크가 없으면 텍스트 전체를 앵커로 감싸고 끝에 `#` 마커를 붙입니다.
4. 사용자가 제목을 클릭하면 현재 섹션 해시를 갱신하고 헤더 높이를 반영해 스크롤합니다.
5. 해시가 있는 URL로 직접 들어온 경우 여러 시점에서 위치를 다시 맞춰 이미지, 폰트, 뷰포트 변화로 생기는 오차를 줄입니다.

## 헤더 높이 조정

고정 헤더 높이가 기본값 `84px`와 다르면 CSS 변수만 덮어쓰면 됩니다.

```css
:root {
  --header-height: 72px;
}
```

## 참고 사항

- 플러그인은 제목 요소를 런타임에서 수정하므로, 스킨 CSS가 제목 내부 링크 스타일을 강하게 덮고 있다면 추가 조정이 필요할 수 있습니다.
- 제목 내부에 기존 링크가 있으면 앵커 래핑을 생략하므로 `#` 마커도 추가되지 않습니다.
- 초기 해시 보정은 보수적으로 여러 번 수행하므로, 환경에 따라 아주 짧은 추가 스크롤이 보일 수 있습니다.
