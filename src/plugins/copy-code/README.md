# copy-code

![copy-code demo](/docs/images/copy-code.gif)

티스토리 본문 코드블록에 복사 버튼을 추가합니다.

## 주요 기능

- `<code>`를 포함한 `pre` 블록에만 복사 버튼을 추가하며, 중복 초기화를 방지합니다.
- 기본 상태에서는 복사 버튼 대신 언어 축약 라벨을 표시합니다. 언어를 감지하지 못하면 `Code`를 표시합니다.
- 보안 컨텍스트에서는 `Clipboard API`를 우선 사용하고, 사용할 수 없으면 `execCommand("copy")`로 폴백합니다.
- 줄바꿈을 유지한 채 복사하며, `highlight.js` 줄 번호 마크업(`.hljs-ln-code`, `.hljs-ln-line`)도 처리합니다.
- `data-ke-language`, `data-language`, `data-code-language`, `lang`, `language-*`, `lang-*`, `brush: js` 등 다양한 속성에서 언어명을 감지합니다.

## 동작 방식

| 환경 | 동작 |
|------|------|
| 데스크톱 | 코드 블록 hover·focus 시 복사 버튼 표시 |
| 모바일 | 코드 블록 터치 시 표시, 외부 터치 또는 복사 완료 후 언어 라벨로 복귀 |

## 본문 컨테이너 감지

본문 컨테이너 감지 방식(셀렉터, `window.RPPlugins.articleSelectors`)은 [링크](../../../README.md#본문-컨테이너-감지)를 참고하세요.

## 버튼 상태

| 상태 | 문구 |
|------|------|
| 기본 | `Copy` |
| 성공 | `Copied` |
| 실패 | `Failed` |

성공·실패 후 약 2초 뒤 기본 상태로 돌아갑니다.

## 선택 설정

`window.RPPlugins.copyCode`로 버튼 문구를 조정할 수 있습니다. 설정 코드는 스크립트보다 먼저 선언해야 합니다.

```html
<script>
  window.RPPlugins = {
    copyCode: {
      buttonText: "복사",
      successText: "완료",
      errorText: "실패",
      ariaLabel: "코드 복사",
    },
  };
</script>
```

| 옵션 | 설명 |
|------|------|
| `buttonText` | 기본 버튼 문구 |
| `successText` | 복사 성공 후 문구 |
| `errorText` | 복사 실패 후 문구 |
| `ariaLabel` | 복사 버튼 접근성 레이블 |

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다. 스크립트가 실행되면 같은 경로의 `index.min.css`를 자동으로 로드합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```

## 참고 사항

- `<code>` 요소가 없는 코드 블록에는 버튼을 추가하지 않습니다.
- 코드 블록이 비어 있거나 복사에 실패하면 버튼이 `Failed` 상태로 바뀝니다.
