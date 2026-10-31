# copy-code

![코드 블록의 언어 라벨과 복사 버튼](/docs/images/copy-code.gif)

티스토리 본문의 코드 블록 오른쪽 위에 언어 라벨과 복사 버튼을 추가합니다.

## 설치

스킨 HTML 편집에서 `</body>` 바로 위에 스크립트를 추가합니다. CSS는 자동으로 불러옵니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/copy-code/index.min.js"></script>
```

## 사용법

`<code>`가 들어 있는 `<pre>` 블록에 적용됩니다. 평소에는 언어 라벨을 표시하고, 코드를 복사할 때 버튼을 보여줍니다. 언어를 찾지 못하면 `Code`로 표시합니다.

| 환경 | 버튼 표시 |
| --- | --- |
| 마우스·키보드 | 코드 블록에 마우스를 올리거나 내부에 포커스가 있을 때 |
| 터치 | 코드 블록을 터치했을 때. 바깥을 터치하거나 복사 결과 표시가 끝나면 언어 라벨로 복귀 |

버튼 문구는 `Copy` → `Copied` 또는 `Failed`로 바뀌고, 약 2초 뒤 돌아옵니다. 빈 코드 블록을 복사해도 `Failed`로 표시합니다.

- 줄바꿈을 유지해 복사하며, highlight.js의 줄 번호 마크업(`.hljs-ln-code`, `.hljs-ln-line`)도 처리합니다.
- 언어는 `data-ke-language`, `data-language`, `data-code-language`, `lang`, `language-*`, `lang-*`, `brush: js` 등에서 읽습니다.
- 보안 컨텍스트에서 Clipboard API를 사용할 수 있으면 우선 사용하고, 그렇지 않으면 `execCommand("copy")`를 사용합니다.
- Mermaid로 지정한 코드 블록에는 버튼을 추가하지 않습니다. 지원하는 표기는 [Mermaid 작성 방법](../mermaid/README.md#작성-방법)을 참고하세요.

본문을 찾는 방식과 스킨별 설정은 [본문 컨테이너 감지](../../../README.md#본문-컨테이너-감지)를 참고하세요.

## 설정

플러그인 스크립트 앞에 선언합니다. 바꿀 항목만 지정하면 됩니다.

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

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `buttonText` | `Copy` | 기본 버튼 문구 |
| `successText` | `Copied` | 복사 성공 문구 |
| `errorText` | `Failed` | 복사 실패 문구 |
| `ariaLabel` | `Copy code` | 스크린 리더가 읽는 버튼 이름 |
