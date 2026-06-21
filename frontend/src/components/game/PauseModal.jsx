/**
 * 전투 일시정지 모달 (ESC 또는 버튼)
 */
import { useModalA11y } from '../../hooks/useModalA11y'

export default function PauseModal({ onResume, onQuit, onSettings }) {
  const ref = useModalA11y(onResume)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 animate-fade-in"
      role="dialog" aria-modal="true" aria-label="일시정지 메뉴">
      <div ref={ref} className="panel p-8 w-72 flex flex-col gap-3 animate-scale-in text-center">
        <h2 className="font-display text-2xl text-brand-accent tracking-widest mb-2">일시정지</h2>

        <button onClick={onResume}
          className="btn-primary py-3 text-base font-display tracking-widest">
          ▶ 계속하기
        </button>

        <button onClick={onSettings} className="btn-ghost py-2.5 text-sm">
          🔊 사운드 설정
        </button>

        <button onClick={onQuit}
          className="btn-ghost py-2.5 text-sm hover:text-brand-danger hover:border-brand-danger/40">
          나가기 (진행 저장 안 됨)
        </button>

        <p className="text-brand-muted font-mono text-2xs mt-2">ESC로 재개</p>
      </div>
    </div>
  )
}
