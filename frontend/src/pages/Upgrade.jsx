import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { showToast } from '../components/game/Toast'
import { sound } from '../lib/sound'

// api.js에 subscription 엔드포인트 추가 필요
async function getSubscriptionStatus() {
  return api.paymentStatus()
}
async function createCheckout() {
  return api.createCheckout('blockquest-premium-lifetime')
}

function FeatureRow({ label, free, premium, highlight }) {
  return (
    <tr className={`border-b border-brand-border/50 ${highlight ? 'bg-brand-accent/4' : ''}`}>
      <td className="py-3 px-5 text-brand-textMuted text-sm font-body">{label}</td>
      <td className="py-3 px-5 text-center">
        {free === true    ? <span className="text-brand-muted text-base">✓</span>
        : free === false  ? <span className="text-brand-border opacity-50 text-base">—</span>
        : <span className="text-brand-muted font-mono text-xs">{free}</span>}
      </td>
      <td className="py-3 px-5 text-center">
        {premium === true   ? <span className="text-brand-success font-bold text-base">✓</span>
        : premium === false ? <span className="text-brand-border opacity-50 text-base">—</span>
        : <span className="text-brand-accent font-mono text-xs font-bold">{premium}</span>}
      </td>
    </tr>
  )
}

const FEATURES = [
  { label: '스토리: 망각의 탑',          free: true,      premium: true,      highlight: false },
  { label: '스토리: 폐허의 기억',         free: false,     premium: true,      highlight: true  },
  { label: '스토리: 심연의 노래',         free: false,     premium: true,      highlight: true  },
  { label: '기본 클래스 (전사/마법사/도적)', free: true,    premium: true,      highlight: false },
  { label: '성기사 · 소환사 클래스',      free: false,     premium: true,      highlight: true  },
  { label: '일일 챌린지',                 free: true,      premium: true,      highlight: false },
  { label: '스킬 트리 구매',              free: '최대 3개', premium: '무제한', highlight: true  },
  { label: '런 기록 보관',               free: '10개',    premium: '100개',   highlight: false },
  { label: '세이브 슬롯',                free: '1개',     premium: '5개',     highlight: false },
  { label: '프리미엄 뱃지',              free: false,     premium: true,      highlight: false },
]

export default function Upgrade() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [isPremium,  setIsPremium]  = useState(false)
  const [processing, setProcessing] = useState(false)
  const [fetching,   setFetching]   = useState(true)

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    getSubscriptionStatus()
      .then(r => setIsPremium(r?.status === 'active'))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user])

  const handleUpgrade = async () => {
    setProcessing(true)
    sound.menuClick()
    try {
      const res = await createCheckout()
      if (res?.checkout_url) {
        window.location.href = res.checkout_url
      } else {
        showToast('결제 링크를 가져오지 못했습니다', 'error')
      }
    } catch (e) {
      // 결제 미설정(503) 등 상황별 안내
      const msg = e?.status === 503
        ? '결제 시스템이 아직 준비 중입니다. 잠시 후 다시 시도해주세요.'
        : e?.status === 400
        ? '결제 세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
        : '결제 오류가 발생했습니다: ' + (e?.message ?? '알 수 없는 오류')
      showToast(msg, 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* 헤더 */}
        <div className="text-center space-y-4 animate-fade-in">
          {fetching ? (
            <div className="h-24 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : isPremium ? (
            <>
              <div className="text-5xl animate-float">✦</div>
              <h1 className="font-display text-4xl text-brand-gold">프리미엄 회원</h1>
              <p className="text-brand-muted font-body">모든 콘텐츠를 자유롭게 이용하고 있습니다</p>
              <button onClick={() => navigate('/story-select')} className="btn-primary px-8 py-3">
                지금 플레이
              </button>
            </>
          ) : (
            <>
              <p className="font-mono text-brand-accent text-xs tracking-[0.3em]">— UPGRADE —</p>
              <h1 className="font-display text-4xl text-brand-text">프리미엄으로 업그레이드</h1>
              <p className="text-brand-muted font-body text-base max-w-md mx-auto leading-relaxed">
                더 많은 스토리, 클래스, 무제한 스킬 트리.<br />
                <strong className="text-brand-text">단 한 번의 결제로 영구히.</strong>
              </p>
            </>
          )}
        </div>

        {/* 플랜 카드 (비프리미엄만) */}
        {!isPremium && !fetching && (
          <div className="flex flex-col sm:flex-row gap-5 justify-center animate-slide-up">
            {/* 무료 */}
            <div className="panel p-6 flex-1 max-w-xs">
              <div className="text-center mb-5">
                <h2 className="font-display text-xl text-brand-textMuted mb-1">무료</h2>
                <div className="font-display text-3xl text-brand-text">₩0</div>
                <div className="text-brand-muted font-mono text-xs mt-1">영구</div>
              </div>
              <ul className="space-y-2 text-sm font-body text-brand-muted">
                {['스토리 1개', '기본 클래스 3종', '일일 챌린지'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-brand-success">✓</span>{f}
                  </li>
                ))}
                {['추가 스토리', '특수 클래스', '무제한 스킬'].map(f => (
                  <li key={f} className="flex items-center gap-2 opacity-40">
                    <span>—</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/story-select')}
                className="btn-ghost w-full mt-5 text-sm py-2.5">
                무료로 시작
              </button>
            </div>

            {/* 프리미엄 */}
            <div className="flex-1 max-w-xs relative">
              {/* 추천 배지 */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-brand-accent text-white shadow-glow-accent">
                  ✦ 추천
                </span>
              </div>
              <div className="panel p-6 h-full animate-glow-pulse"
                style={{ borderColor: 'rgba(124,92,252,0.7)' }}>
                <div className="text-center mb-5">
                  <h2 className="font-display text-xl text-brand-accent mb-1">프리미엄</h2>
                  <div className="font-display text-4xl text-brand-text">₩9,900</div>
                  <div className="text-brand-muted font-mono text-xs mt-1">영구 구매 · 추가 요금 없음</div>
                </div>
                <ul className="space-y-2 text-sm font-body text-brand-text">
                  {[
                    { text: '스토리 3개 전체',    color: '#4ade80' },
                    { text: '모든 클래스 5종',    color: '#4ade80' },
                    { text: '무제한 스킬 트리',   color: '#4ade80' },
                    { text: '100개 런 기록',      color: '#8b5cff' },
                    { text: '5개 세이브 슬롯',    color: '#8b5cff' },
                    { text: '프리미엄 뱃지',      color: '#ffd23f' },
                  ].map(({ text, color }) => (
                    <li key={text} className="flex items-center gap-2">
                      <span style={{ color }}>✓</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={processing}
                  className="btn-primary w-full mt-5 py-3 font-display tracking-widest text-base">
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      처리 중...
                    </span>
                  ) : '₩9,900 결제하기'}
                </button>
                <p className="text-brand-muted text-2xs text-center mt-2 font-mono">
                  Polar.sh 보안 결제 · 7일 환불 보장
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 비교표 */}
        <div className="panel overflow-hidden animate-fade-in">
          <div className="px-5 py-3 border-b border-brand-border bg-brand-panelLight">
            <h3 className="font-display text-sm text-brand-text tracking-widest">기능 비교</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="py-3 px-5 text-left text-brand-muted font-mono text-xs">기능</th>
                <th className="py-3 px-5 text-center text-brand-muted font-mono text-xs w-28">무료</th>
                <th className="py-3 px-5 text-center text-brand-accent font-mono text-xs w-28">프리미엄</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="space-y-2 animate-fade-in">
          <h3 className="font-display text-lg text-brand-text mb-4">자주 묻는 질문</h3>
          {[
            { q: '영구 구매란?',            a: '한 번 결제하면 추가 요금 없이 모든 프리미엄 콘텐츠를 영구 이용합니다.' },
            { q: '환불 가능한가요?',         a: '구매 후 7일 이내 전액 환불 가능합니다. 고객센터로 문의해주세요.' },
            { q: '무료 콘텐츠는?',           a: '망각의 탑 스토리, 기본 클래스 3종, 일일 챌린지는 영구 무료입니다.' },
            { q: '향후 콘텐츠도 포함되나요?', a: '추후 추가 스토리는 별도 DLC로 제공될 예정이며, 프리미엄 구매자에게 할인이 적용됩니다.' },
          ].map(({ q, a }) => (
            <details key={q} className="panel p-4 cursor-pointer group">
              <summary className="font-body text-sm text-brand-text flex justify-between items-center select-none">
                <span>{q}</span>
                <span className="text-brand-muted text-xs group-open:rotate-180 transition-transform ml-4">▼</span>
              </summary>
              <p className="text-brand-muted text-sm font-body mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
