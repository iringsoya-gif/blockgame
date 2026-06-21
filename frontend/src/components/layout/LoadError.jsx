/**
 * 데이터 로드 실패 시 재시도 UI
 * 네트워크 오류 등으로 페이지 데이터를 못 불러왔을 때 표시
 */
export default function LoadError({ onRetry, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center animate-fade-in">
      <div className="text-4xl opacity-60">📡</div>
      <div>
        <p className="font-display text-lg text-brand-text mb-1">데이터를 불러오지 못했습니다</p>
        <p className="text-brand-muted text-sm font-body max-w-xs">
          {message ?? '서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'}
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
          ↻ 다시 시도
        </button>
      )}
    </div>
  )
}
