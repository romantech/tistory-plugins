# toc

![toc-desktop-hover](/docs/images/toc-desktop-hover.png)

본문 제목(heading)을 기준으로 목차를 생성하는 플러그인입니다. 데스크톱에서는 레일형 목차를, 좁은 화면에서는 패널형 목차를 표시하며 현재 보고 있는 섹션을 강조합니다.

## 주요 기능

- `h2`, `h3`, `h4` 제목을 기준으로 목차를 생성합니다.
- 데스크톱에서는 본문 우측 레일형 TOC를, 좁은 화면에서는 하단 버튼으로 여는 모바일 TOC를 표시합니다.
- 제목에 `id`가 없으면 텍스트 기반 `slug`를 만들고, 중복되면 고유한 ID로 보정합니다.
- 목차 항목을 클릭하면 해시를 갱신하고 고정 헤더 높이를 반영해 해당 섹션으로 스크롤합니다.
- 페이지 진입 직후의 처음 섹션 클릭은 안정적인 이동을 위해 스크롤 동작을 보정합니다.
- 스크롤 위치에 따라 현재 섹션을 강조합니다.
- 데스크톱 폭과 우측 여백이 충분하면 우측 레일을 쓰고, 그렇지 않으면 하단 모바일 TOC로 자연스럽게 전환합니다.

## 본문 컨테이너 감지

아래 셀렉터를 순서대로 확인합니다. 각 셀렉터는 kebab-case 기준으로 정의되어 있으며, snake_case 변형도 함께 탐색합니다.

- `.contents-style` (`.contents_style` 포함)
- `.entry-content`
- `.area-view` (`.area_view` 포함)
- `.post-content`
- `.article-view` (`.article_view` 포함)
- `#article`
- `.article-cont` (`.article_cont` 포함)

아래 셀렉터는 fallback 후보로 사용하며, 글 길이와 콘텐츠 신호가 충분할 때만 채택합니다.

- `.tt-article-useless-p-margin` (`.tt_article_useless_p_margin` 포함)
- `.inner-content` (`.inner_content` 포함)

스킨 구조가 다르면 `window.RPPlugins.articleSelectors`로 우선 탐색할 본문 셀렉터를 지정할 수 있습니다. 지정한 셀렉터를 먼저 확인한 뒤, 기본 후보를 이어서 탐색합니다.

```html
<script>
  window.RPPlugins = {
    articleSelectors: [".my-article", "#main-content"],
  };
</script>
```

## 처리 대상

- 기본 제목 셀렉터: `h2`, `h3`, `h4`
- 기본 헤더 오프셋: `84px`
- 데스크톱 레일 최소 표시 폭: `1280px`

목차는 제목이 2개 이상일 때만 렌더링합니다.

## 선택 설정

`window.RPPlugins.toc` 속성으로 처리할 제목 레벨과 헤더 오프셋을 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

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
3. 본문 우측 여백이 충분하면 고정 레일 목차를, 그렇지 않으면 하단 토글형 모바일 목차를 렌더링합니다.
4. 사용자가 목차를 클릭하면 현재 해시를 갱신하고 헤더 높이를 반영해 스크롤합니다.
5. 필요 시 레이아웃 변화를 잠깐 기다린 뒤 예약된 스크롤 이동을 진행합니다.
   - 대기 중에는 클릭한 TOC 항목을 즉시 활성화하고 진행 중 상태를 표시합니다.
   - 대기 중 사용자가 직접 스크롤을 시작하면 예약된 이동은 취소합니다.
6. 스크롤/리사이즈 시 현재 섹션 강조와 데스크톱/모바일 배치를 다시 계산합니다.

## 참고 사항

- 좁은 레이아웃에서는 화면 우하단의 원형 TOC 버튼만 남기고, 터치하면 버튼 위로 카드형 목록이 펼쳐집니다.
- 본문 우측 여백이 거의 없는 스킨에서는 표시되지 않을 수 있습니다.
- 본문 뒤에 `.another-category` 영역이 있으면 그 구간까지 본문 영역으로 간주하여 목차를 유지합니다.
- `heading-anchor`와 함께 사용해도 같은 제목 ID 규칙을 공유하므로 충돌하지 않습니다.

## 스크린샷

### 데스크톱
![toc-desktop](/docs/images/toc-desktop.png)

### 데스크톱 - 좁은 화면(1280px 미만)
![toc-desktop-small](/docs/images/toc-desktop-small.png)

### 모바일
![toc-mobile](/docs/images/toc-mobile.png)
