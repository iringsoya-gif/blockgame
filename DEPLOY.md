# BlockQuest 배포 가이드

테트리스 배틀 × AI 게임마스터 TRPG 웹게임의 배포 절차입니다.
무료 인프라(Supabase Free / Railway / Vercel / Groq) 기준으로 작성되었습니다.

---

## 아키텍처

```
[Vercel]  프론트엔드 (React + Vite)
   │  VITE_API_URL
   ▼
[Railway] 백엔드 (FastAPI)
   │           │
   ▼           ▼
[Supabase]  [Groq / Gemini]
 DB+Auth      AI 게임마스터
```

---

## 0. 사전 준비 — 계정 발급

| 서비스 | 용도 | 무료 한도 | 가입 |
|---|---|---|---|
| Supabase | DB + 인증 | 50K MAU, 500MB DB | supabase.com |
| Groq | 주 AI | 14,400 req/day | console.groq.com |
| Google AI | 폴백 AI | 1,500 req/day | aistudio.google.com |
| Railway | 백엔드 호스팅 | $5 크레딧/월 | railway.app |
| Vercel | 프론트 호스팅 | 무제한(취미) | vercel.com |
| Polar | 결제(선택) | 수수료만 | polar.sh |

---

## 1. Supabase 설정

1. 새 프로젝트 생성 → 리전은 주 사용자와 가까운 곳(예: Northeast Asia)
2. **SQL Editor**에서 `backend/app/data/schema.sql` 전체 실행 (테이블 + RLS + 뷰 생성)
3. **Settings → API**에서 다음 값 복사:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` 키 → `VITE_SUPABASE_ANON_KEY` (프론트, 공개 가능)
   - `service_role` 키 → `SUPABASE_SERVICE_KEY` (백엔드 전용, **절대 노출 금지**)
4. **Authentication → Providers**에서 이메일 또는 OAuth(Google 등) 활성화
5. **Authentication → URL Configuration**에서 배포된 프론트 URL을 Redirect URLs에 추가

> ⚠️ service_role 키는 RLS를 우회합니다. 백엔드 환경변수에만 두고, 절대 프론트나 git에 올리지 마세요.

---

## 2. AI 제공자 설정 (최소 1개 필수)

- **Groq** (강력 추천, 주 제공자): console.groq.com → API Keys → `GROQ_API_KEY`
- **Gemini** (폴백): aistudio.google.com → Get API Key → `GEMINI_API_KEY`

둘 다 설정하면 Groq 한도 소진 시 자동으로 Gemini로 폴백됩니다.

---

## 3. 백엔드 배포 (Railway)

1. Railway에서 New Project → Deploy from GitHub repo → `backend` 디렉토리 선택
   (또는 Root Directory를 `backend`로 설정)
2. **Variables** 탭에서 환경변수 입력 (아래 체크리스트 참고)
3. `railway.json`이 자동 인식되어 `/health`로 헬스체크합니다
4. 배포 후 생성된 도메인(예: `https://blockgame-api.onrender.com`)을 기록
   - 프론트 `VITE_API_URL`에 `<도메인>/api` 형태로 설정

### 백엔드 환경변수 체크리스트

```
SUPABASE_URL=https://xxxxx.supabase.co       # 필수
SUPABASE_SERVICE_KEY=eyJ...                   # 필수 (service_role)
GROQ_API_KEY=gsk_...                          # AI 최소 1개 필수
GEMINI_API_KEY=AIza...                        # 폴백 권장
FRONTEND_URL=https://blockgame-beta.vercel.app    # 필수 (CORS)
DEBUG=False                                    # 프로덕션은 False
POLAR_API_KEY=polar_oat_...                   # 결제 사용 시 (Organization Access Token)
POLAR_WEBHOOK_SECRET=...                       # 결제 사용 시 (웹훅 서명 검증)
POLAR_PREMIUM_PRICE_ID=...                     # 결제 사용 시 (Polar 상품의 price ID — 서버가 가격 결정)
POLAR_SERVER=production                         # production 또는 sandbox(테스트)
```

> 배포 전 검증: `python scripts/check_env.py`

---

## 4. 프론트엔드 배포 (Vercel)

1. Vercel에서 New Project → GitHub repo import → Root Directory `frontend`
2. Framework Preset: **Vite** (자동 감지)
3. `vercel.json`이 SPA 라우팅(새로고침 404 방지)을 처리합니다
4. **Environment Variables**에 입력:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...                 # anon 키 (service 키 아님!)
VITE_API_URL=https://blockgame-api.onrender.com/api
```

5. 배포 후 도메인을 백엔드 `FRONTEND_URL`과 Supabase Redirect URLs에 반영

> 배포 전 검증: `python scripts/check_env.py --frontend`

---

## 5. 결제 설정 (선택 — Polar)

1. polar.sh에서 제품 생성 (프리미엄 구독, 9,900원/월)
2. API Key 발급 → `POLAR_API_KEY`
3. Webhook 등록 → URL: `https://<백엔드>/api/payment/webhook`
   - 시크릿 → `POLAR_WEBHOOK_SECRET`
4. 결제 키가 없으면 결제 엔드포인트는 503을 반환하며, 게임은 무료 범위로 정상 작동합니다

---

## 6. 배포 후 점검 (Smoke Test)

- [ ] `https://<백엔드>/health` → `{"status":"ok"}` 응답
- [ ] 프론트 접속 → 회원가입/로그인 동작
- [ ] 게스트 체험(/try) 동작
- [ ] 스토리 시작 → GM이 응답 (AI 연결 확인)
- [ ] 전투 진입 → 테트리스 동작, 사운드 재생
- [ ] 새로고침 시 404 안 뜸 (SPA 라우팅)
- [ ] 전적/프로필 저장·로드 동작 (DB 연결)
- [ ] 모바일에서 터치 컨트롤 동작
- [ ] (결제 시) 업그레이드 → 결제 → 프리미엄 반영

---

## 7. 흔한 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| GM이 응답 안 함 | AI 키 누락/한도 | check_env.py로 키 확인, Groq+Gemini 둘 다 설정 |
| CORS 오류 | FRONTEND_URL 불일치 | 백엔드 FRONTEND_URL = 실제 프론트 도메인 |
| 새로고침 404 | SPA 설정 누락 | frontend/vercel.json 존재 확인 |
| 로그인 후 리다이렉트 실패 | Supabase Redirect URL 미등록 | Auth 설정에 프론트 도메인 추가 |
| 저장 안 됨 | service_key 또는 RLS | service_role 키 확인, schema.sql 실행 확인 |
| 첫 요청 느림 | Railway 콜드스타트 | 정상 (프론트가 자동 재시도 + /warmup) |

---

## 무료 인프라 한도 요약

| 제공자 | 모델 | 일 한도 | 분 한도 |
|---|---|---|---|
| Groq | llama-3.1-8b | 14,400 | 30 |
| Groq | llama-3.3-70b | 1,000 | 30 |
| Gemini | 2.5-flash-lite | 1,000 | 15 |
| Gemini | 2.5-flash | 250 | 10 |

AI 호출은 rate limiter로 보호되며, 한도 소진 시 폴백 → fallback 응답 순으로 graceful하게 처리됩니다.
