# focus-guard

티스토리 스킨의 사이드바 토글 과정에서 발생할 수 있는 `aria-hidden` 관련 포커스 경고를 완화하는 플러그인입니다. 일부 스킨은 사이드바를 열거나 닫는 과정에서 포커스가 남아 있는 요소 또는 그 조상 요소에 `aria-hidden="true"`를 적용합니다. 이 경우 브라우저 콘솔에 아래와 같은 접근성 경고가 표시될 수 있습니다.

> Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus. For more details, see the aria-hidden section of the WAI-ARIA specification at https://w3c.github.io/aria/#aria-hidden.

이 플러그인은 다음 방식으로 포커스가 숨겨진 영역에 남지 않도록 보조합니다.

- 사이드바 열기/닫기 버튼의 `pointerdown`에서 기본 포커스 이동을 방지
- 클릭 이후 버튼에 포커스가 남아 있으면 `blur()` 처리
- `aria-hidden="true"`로 변경된 요소 내부에 활성 요소가 남아 있으면 `blur()` 처리

## 동작 대상

다음 버튼을 대상으로 동작합니다.

- `button[data-func="close-sidebar"]`
- `button[data-func="open-sidebar"]`

## 사용 방법

아래 스크립트를 복사하여 티스토리 HTML 편집기의 `</body>` 태그 앞에 삽입합니다.

```html
<script src="https://cdn.jsdelivr.net/gh/romantech/tistory-plugins@latest/dist/focus-guard/index.min.js"></script>
```

## 주의 사항

- 이 플러그인은 스킨 원본 코드를 직접 수정하지 않고, 런타임에서 포커스 흐름을 보조하는 방식입니다.
- 스킨 구조나 이벤트 처리 방식에 따라 경고가 완전히 사라지지 않을 수 있습니다.
- 가장 좋은 해결 방법은 스킨 원본에서 포커스 이동과 aria-hidden 적용 순서를 함께 조정하는 것입니다.
