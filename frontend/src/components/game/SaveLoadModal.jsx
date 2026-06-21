/**
 * 세이브/로드 슬롯 관리 모달
 * 무료: 1슬롯, 프리미엄: 5슬롯
 */
import { useState, useEffect, useCallback } from 'react'
import { STORY_LABELS } from '../../game/stories'
import { useModalA11y } from '../../hooks/useModalA11y'
import { api, getGuideId } from '../../lib/api'
import { showToast } from './Toast'
import { CLASSES } from '../../game/classes'



function parseSlot(guideKey) {
  // "default_slot2" → { guide: 'default', slot: 2 }
  // 슬롯 표기가 없으면(자동 세션 저장) null 반환 → 수동 세이브 목록에서 제외
  const m = guideKey?.match(/^(.+)_slot(\d+)$/)
  if (m) return { guide: m[1], slot: parseInt(m[2], 10) }
  return null
}

export default function SaveLoadModal({ mode = 'save', isPremium = false, currentState, onLoad, onClose }) {
  const modalRef = useModalA11y(onClose)
  const maxSlots = isPremium ? 5 : 1
  const guideId  = getGuideId()
  const [saves,   setSaves]   = useState({})   // slot → save data
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)

  // 슬롯별 세이브 로드
  useEffect(() => {
    api.listSaves()
      .then(res => {
        const map = {}
        for (const s of res.saves ?? []) {
          const parsed = parseSlot(s.guide_id)
          if (parsed && parsed.guide === guideId) map[parsed.slot] = s
        }
        setSaves(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [guideId])

  const handleSave = useCallback(async (slot) => {
    if (busy) return
    setBusy(true)
    try {
      await api.saveGame({
        guide_id:      guideId,
        slot,
        story_context: currentState?.story_context ?? {},
        player_stats:  currentState?.player_stats ?? {},
      })
      showToast(`슬롯 ${slot}에 저장했습니다`, 'success')
      // 슬롯 정보 갱신
      setSaves(prev => ({
        ...prev,
        [slot]: {
          guide_id: `${guideId}_slot${slot}`,
          updated_at: new Date().toISOString(),
          player_stats: currentState?.player_stats ?? {},
        },
      }))
    } catch (e) {
      showToast(e?.message ?? '저장 실패', 'error')
    } finally {
      setBusy(false)
    }
  }, [busy, guideId, currentState])

  const handleLoad = useCallback(async (slot) => {
    if (busy || !saves[slot]) return
    setBusy(true)
    try {
      const res = await api.loadGame(guideId, slot)
      if (res.save) {
        onLoad?.(res.save)
        showToast(`슬롯 ${slot}을 불러왔습니다`, 'success')
        onClose?.()
      } else {
        showToast('세이브 데이터가 없습니다', 'warn')
      }
    } catch (e) {
      showToast(e?.message ?? '불러오기 실패', 'error')
    } finally {
      setBusy(false)
    }
  }, [busy, guideId, saves, onLoad, onClose])

  const handleDelete = useCallback(async (slot) => {
    if (busy || !saves[slot]) return
    if (!window.confirm(`슬롯 ${slot}의 저장 데이터를 삭제할까요?`)) return
    setBusy(true)
    try {
      await api.deleteSave(guideId, slot)
      setSaves(prev => { const n = { ...prev }; delete n[slot]; return n })
      showToast(`슬롯 ${slot} 삭제됨`, 'info')
    } catch (e) {
      showToast(e?.message ?? '삭제 실패', 'error')
    } finally {
      setBusy(false)
    }
  }, [busy, guideId, saves])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 animate-fade-in p-4"
      onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} className="panel p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-xl text-brand-accent tracking-widest">
            {mode === 'save' ? '저장하기' : '불러오기'}
          </h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none" aria-label="닫기">✕</button>
        </div>

        <p className="text-brand-muted font-mono text-xs mb-4">
          {STORY_LABELS[guideId] ?? guideId} · {isPremium ? '프리미엄 (5슬롯)' : '무료 (1슬롯)'}
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: maxSlots }).map((_, i) => {
              const slot = i + 1
              const save = saves[slot]
              const stats = save?.player_stats ?? {}
              const cls = CLASSES[stats.playerClass]
              return (
                <div key={slot}
                  className="panel px-4 py-3 flex items-center justify-between bg-brand-panelLight">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-brand-muted text-xs shrink-0">슬롯 {slot}</span>
                    {save ? (
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-brand-text flex items-center gap-2">
                          {cls && <span>{cls.icon}</span>}
                          {cls ? cls.name : '저장됨'}
                          {stats.level && <span className="text-brand-accent text-xs">Lv{stats.level}</span>}
                        </div>
                        <div className="text-brand-muted text-2xs font-mono">
                          {save.updated_at
                            ? new Date(save.updated_at).toLocaleString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
                            : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-brand-muted text-sm font-body opacity-50">— 비어있음 —</span>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {mode === 'save' ? (
                      <button onClick={() => handleSave(slot)} disabled={busy}
                        className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">
                        {save ? '덮어쓰기' : '저장'}
                      </button>
                    ) : (
                      <button onClick={() => handleLoad(slot)} disabled={busy || !save}
                        className="btn-primary text-xs px-3 py-1.5 disabled:opacity-30">
                        불러오기
                      </button>
                    )}
                    {save && (
                      <button onClick={() => handleDelete(slot)} disabled={busy}
                        className="btn-ghost text-xs px-2 py-1.5 hover:text-brand-danger"
                        aria-label="삭제">🗑</button>
                    )}
                  </div>
                </div>
              )
            })}

            {!isPremium && (
              <p className="text-brand-muted text-2xs font-mono text-center pt-2">
                프리미엄으로 업그레이드하면 슬롯 5개를 사용할 수 있습니다
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
