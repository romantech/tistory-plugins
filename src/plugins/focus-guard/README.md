# focus-guard

티스토리 스킨의 사이드바 토글 과정에서 발생할 수 있는 `aria-hidden` 포커스 경고를 완화하는 플러그인입니다.

일부 스킨은 사이드바를 열거나 닫을 때 포커스가 남아 있는 버튼이나 그 조상 요소에 `aria-hidden="true"`를 적용합니다. 이 경우 브라우저 콘솔에 다음과 같은 접근성 경고가 나타날 수 있습니다.

> Blocked aria-hidden on an element because its descendant retained focus.

## 동작 방식

- 사이드바 열기/닫기 버튼의 `pointerdown` 단계에서 기본 포커스 이동을 막습니다.
- 클릭 이후 토글 버튼에 포커스가 남아 있으면 `blur()` 처리합니다.
- 문서 전체에서 `aria-hidden` 속성 변화를 감시하다가, 숨겨진 영역 안에 활성 요소가 남아 있으면 `blur()` 처리합니다.

## 대상 버튼

- `button[data-func="open-sidebar"]`
- `button[data-func="close-sidebar"]`

## 설치 방법

티스토리 HTML 편집 페이지에서 아래 코드를 `</body>` 위에 삽입합니다.

```html
<script defer src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/focus-guard/index.min.js"></script>
```

## 주의 사항

- 이 플러그인은 스킨 원본을 수정하지 않고 런타임에서 포커스 흐름만 보조합니다.
- 경고를 줄이는 용도이지, 접근성 구조 자체를 완전히 교정하는 플러그인은 아닙니다.
- 스킨이 포커스를 강제로 다시 이동시키거나, `aria-hidden` 적용 순서가 더 복잡하면 경고가 일부 남을 수 있습니다.
- 근본적인 해결은 스킨 원본에서 포커스 이동과 `aria-hidden` 적용 순서를 함께 조정하는 것입니다.
