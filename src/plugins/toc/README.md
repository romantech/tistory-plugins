# toc

본문 우측에 레일 스타일 목차를 표시하는 플러그인입니다. 본문 제목을 기준으로 사이드 목차를 생성하고, 현재 보고 있는 섹션을 강조합니다.

## 주요 기능

- `h2`, `h3`, `h4` 제목을 기준으로 우측 고정 목차를 생성합니다.
- 제목에 `id`가 없으면 텍스트 기반 `slug`를 만들고, 중복되면 고유한 ID로 보정합니다.
- 목차 항목을 클릭하면 해시를 갱신하고 고정 헤더 높이를 반영해 해당 섹션으로 스크롤합니다.
- 스크롤 위치에 따라 현재 섹션을 강조합니다.
- 데스크톱 폭과 우측 여백이 충분할 때만 표시되며, 좁은 레이아웃에서는 자동으로 숨겨집니다.

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

- 기본 제목 셀렉터: `h2`, `h3`, `h4`
- 기본 헤더 오프셋: `84px`
- 최소 표시 폭: `1280px`

목차는 제목이 2개 이상일 때만 렌더링합니다.

## 선택 설정

`window.RPPlugins.toc` 속성으로 처리할 제목 레벨과 헤더 오프셋을 조정할 수 있습니다.

```html
<script>
  window.RPPlugins = {
    toc: {
      levels: [2, 3, 4, 5],
      headerOffset: 64,
    },
  };
</script>
```

- `levels`: 목차에 포함할 제목 레벨.
- `headerOffset`: 스크롤 보정에 사용할 헤더 오프셋 픽셀 값.

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다. 스크립트가 실행되면 같은 경로의 `index.min.css`를 자동으로 로드합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/toc/index.min.js"></script>
```

## 동작 흐름

1. 본문에서 설정된 제목 레벨을 찾습니다.
2. 각 제목의 최종 `id`를 결정합니다.
3. 본문 우측 여백이 충분하면 고정 목차를 렌더링합니다.
4. 사용자가 목차를 클릭하면 현재 해시를 갱신하고 헤더 높이를 반영해 스크롤합니다.
5. 스크롤/리사이즈 시 현재 섹션 강조와 우측 배치를 다시 계산합니다.

## 참고 사항

- 모바일과 좁은 데스크톱 레이아웃에서는 자동으로 숨겨집니다.
- 본문 우측 여백이 거의 없는 스킨에서는 표시되지 않을 수 있습니다.
- 본문 뒤에 `.another-category` 영역이 있으면 그 섹션이 끝날 때까지 목차를 유지합니다.
- `heading-anchor`와 함께 사용해도 같은 제목 ID 규칙을 공유하므로 충돌하지 않습니다.
