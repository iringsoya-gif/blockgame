/**
 * 법적 고지 — 개인정보처리방침 + 이용약관
 * 유료 서비스 운영에 필요한 최소 법적 문서
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const LAST_UPDATED = '2026년 6월 1일'

export default function Legal() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'terms' ? 'terms' : 'privacy')

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="flex items-center justify-between px-5 py-3 border-b border-brand-border sticky top-0 bg-brand-bg/95 backdrop-blur-sm z-10">
        <button onClick={() => navigate('/')}
          className="font-display text-lg text-brand-accent tracking-widest">BlockQuest</button>
        <button onClick={() => navigate(-1)}
          className="btn-ghost text-xs px-3 py-1.5">← 돌아가기</button>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* 탭 */}
        <div className="flex gap-2 mb-8 border-b border-brand-border">
          {[['privacy', '개인정보처리방침'], ['terms', '이용약관']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 font-mono text-sm transition-colors border-b-2 -mb-px
                ${tab === id ? 'text-brand-accent border-brand-accent' : 'text-brand-muted border-transparent hover:text-brand-text'}`}>
              {label}
            </button>
          ))}
        </div>

        <p className="text-brand-muted text-xs font-mono mb-6">최종 업데이트: {LAST_UPDATED}</p>

        {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className="font-display text-base text-brand-text mb-2">{title}</h3>
      <div className="text-brand-muted font-body text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function PrivacyPolicy() {
  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-xl text-brand-accent mb-5">개인정보처리방침</h2>
      <p className="text-brand-muted font-body text-sm leading-relaxed mb-6">
        BlockQuest(이하 "서비스")는 이용자의 개인정보를 중요하게 여기며, 관련 법령을 준수합니다.
        본 방침은 서비스가 수집하는 정보와 그 이용 방식을 설명합니다.
      </p>

      <Section title="1. 수집하는 정보">
        <p>• 계정 정보: 소셜 로그인(Google, Discord) 시 제공되는 이메일, 표시 이름, 프로필 식별자</p>
        <p>• 게임 데이터: 플레이 기록, 진행 상황, 업적, 통계, 저장 데이터</p>
        <p>• 결제 정보: 유료 구독 시 결제 대행사(Polar 등)를 통해 처리되며, 카드 정보는 서비스가 직접 저장하지 않습니다</p>
        <p>• 자동 수집: 접속 로그, 기기/브라우저 정보(서비스 개선 및 오류 분석 목적)</p>
      </Section>

      <Section title="2. 정보의 이용 목적">
        <p>• 서비스 제공 및 계정 관리</p>
        <p>• 게임 진행 상황 저장 및 동기화</p>
        <p>• 유료 구독 처리 및 고객 지원</p>
        <p>• 서비스 개선, 통계 분석, 부정 이용 방지</p>
      </Section>

      <Section title="3. 정보의 보관 및 파기">
        <p>회원 탈퇴 또는 데이터 삭제 요청 시, 관련 법령에 따라 보존이 필요한 경우를 제외하고 지체 없이 파기합니다.
        프로필 설정에서 직접 데이터를 삭제할 수 있습니다.</p>
      </Section>

      <Section title="4. 제3자 제공 및 위탁">
        <p>서비스는 다음의 외부 서비스를 이용합니다:</p>
        <p>• 인증/데이터베이스: Supabase</p>
        <p>• 결제 처리: Polar 등 결제 대행사</p>
        <p>• AI 생성: Groq, Google(Gemini) — 게임 진행을 위한 텍스트 생성에만 사용되며, 개인 식별 정보는 전송하지 않습니다</p>
        <p>법령에 의한 경우를 제외하고 이용자 동의 없이 개인정보를 제3자에게 판매하지 않습니다.</p>
      </Section>

      <Section title="5. 이용자의 권리">
        <p>이용자는 언제든지 자신의 개인정보를 열람, 수정, 삭제하거나 처리 정지를 요청할 수 있습니다.
        문의는 아래 연락처로 받습니다.</p>
      </Section>

      <Section title="6. 문의처">
        <p>개인정보 관련 문의: support@blockquest.example (운영 시 실제 연락처로 교체 필요)</p>
      </Section>
    </div>
  )
}

function TermsOfService() {
  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-xl text-brand-accent mb-5">이용약관</h2>

      <Section title="제1조 (목적)">
        <p>본 약관은 BlockQuest(이하 "서비스")의 이용 조건과 절차, 이용자와 서비스 간 권리·의무 및 책임 사항을 규정합니다.</p>
      </Section>

      <Section title="제2조 (서비스의 제공)">
        <p>• 서비스는 AI 기반 텍스트 어드벤처와 테트리스 배틀이 결합된 게임을 제공합니다.</p>
        <p>• 무료 이용과 유료 구독(프리미엄)으로 구분되며, 구독 시 추가 콘텐츠가 제공됩니다.</p>
        <p>• 서비스 내용은 사전 고지 후 변경될 수 있습니다.</p>
      </Section>

      <Section title="제3조 (유료 구독 및 결제)">
        <p>• 프리미엄 구독은 결제 시점에 명시된 금액과 주기로 청구됩니다.</p>
        <p>• 결제는 외부 결제 대행사를 통해 안전하게 처리됩니다.</p>
        <p>• 구독은 이용자가 직접 해지할 수 있으며, 해지 시 다음 결제 주기부터 청구가 중단됩니다.</p>
      </Section>

      <Section title="제4조 (청약철회 및 환불)">
        <p>• 디지털 콘텐츠 특성상, 구매 후 콘텐츠를 이용하지 않은 경우 관련 법령(전자상거래법 등)에 따라 청약철회가 가능합니다.</p>
        <p>• 이미 제공이 개시된 디지털 콘텐츠는 환불이 제한될 수 있으며, 구체적 환불 정책은 결제 시 안내됩니다.</p>
        <p>• 환불 문의는 고객 지원 채널로 접수합니다.</p>
      </Section>

      <Section title="제5조 (이용자의 의무)">
        <p>• 타인의 계정을 무단 사용하거나 서비스를 부정한 방법으로 이용해서는 안 됩니다.</p>
        <p>• 서비스의 정상 운영을 방해하는 행위(자동화 봇, 해킹 등)를 금지합니다.</p>
      </Section>

      <Section title="제6조 (책임의 제한)">
        <p>• 서비스는 천재지변, 외부 서비스(AI, 결제, 호스팅) 장애 등 불가항력으로 인한 중단에 대해 책임을 지지 않습니다.</p>
        <p>• AI가 생성하는 콘텐츠는 자동 생성물이며, 그 내용의 정확성이나 적절성을 보증하지 않습니다.</p>
      </Section>

      <Section title="제7조 (준거법)">
        <p>본 약관은 대한민국 법률에 따라 해석되며, 분쟁은 관할 법원에서 처리합니다.</p>
      </Section>
    </div>
  )
}
