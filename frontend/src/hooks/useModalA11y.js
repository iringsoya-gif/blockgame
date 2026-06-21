/**
 * 모달 접근성 훅
 * - ESC 키로 닫기
 * - 포커스 트랩 (Tab이 모달 밖으로 안 나감)
 * - 열릴 때 첫 포커스 가능 요소로 이동
 * - 닫힐 때 이전 포커스 복원
 */
import { useEffect, useRef } from 'react'

export function useModalA11y(onClose) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prevFocus = document.activeElement

    // 포커스 가능한 요소들
    const getFocusable = () =>
      Array.from(node.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.disabled && el.offsetParent !== null)

    // 첫 요소로 포커스
    const focusables = getFocusable()
    if (focusables.length) focusables[0].focus()

    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const items = getFocusable()
        if (!items.length) return
        const first = items[0]
        const last  = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }

    node.addEventListener('keydown', handleKey)
    return () => {
      node.removeEventListener('keydown', handleKey)
      // 포커스 복원
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [onClose])

  return ref
}
