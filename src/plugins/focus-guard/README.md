# focus-guard

티스토리 스킨의 사이드바를 열고 닫을 때 발생하는 `aria-hidden` 포커스 경고를 줄입니다.

일부 스킨은 버튼에 포커스가 남아 있는 상태에서 그 버튼이나 상위 요소에 `aria-hidden="true"`를 적용합니다. 이때 브라우저 콘솔에 다음 경고가 나타날 수 있습니다.

> Blocked aria-hidden on an element because its descendant retained focus.

## 설치

스킨 HTML 편집에서 `</body>` 바로 위에 스크립트를 추가합니다. 별도 설정은 없습니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/focus-guard/index.min.js"></script>
```

## 처리 대상

다음 버튼을 누를 때 기본 포커스 이동을 막고, 클릭 후에도 포커스가 남아 있으면 `blur()`로 해제합니다.

- `button[data-func="open-sidebar"]`
- `button[data-func="close-sidebar"]`

문서 전체의 `aria-hidden` 변경도 감시합니다. `aria-hidden="true"`가 된 영역 안에 포커스가 남아 있으면 해제합니다.

## 제한사항

포커스를 해제할 뿐, 사이드바를 닫은 뒤 어느 요소로 포커스를 옮길지는 지정하지 않습니다. 키보드 탐색 경로와 `aria-hidden` 적용 순서는 스킨에서 조정해야 합니다. 스킨이 포커스를 다시 옮기는 경우에는 경고가 남을 수 있습니다.
