# BlockQuest 🧩

> AI 게임 마스터 × 테트리스 배틀 TRPG

AI가 이야기를 엮고, 테트리스 배틀로 운명을 결정하는 웹 게임.

**🔗 Live:** https://blockgame-beta.vercel.app/

## 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 18 + Vite, Tailwind CSS, Phaser.js 3 |
| 백엔드 | FastAPI (Python 3.11) |
| DB/Auth | Supabase (PostgreSQL + RLS) |
| AI GM | Groq Llama 3.1 8B (주) / Gemini 2.5 Flash-Lite (폴백) |
| 결제 | Polar.sh (영구 구매 ₩9,900) |
| 배포 | Vercel(프론트) + Railway(백엔드) |

---

## 로컬 개발 환경

### 사전 요구사항
- Node.js 20+
- Python 3.11+
- Supabase 프로젝트
- Gemini API 키 (aistudio.google.com)

### 백엔드

```bash
cd backend
cp .env.example .env
# .env 파일에 환경변수 입력

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
cp .env.example .env
# .env 파일에 환경변수 입력

npm install
npm run dev
```

---

## 환경변수

### backend/.env

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GEMINI_API_KEY=AIza...
POLAR_API_KEY=polar_sk_...        # 결제 기능 사용 시
POLAR_WEBHOOK_SECRET=...          # 웹훅 서명 검증
FRONTEND_URL=http://localhost:5173
DEBUG=True
```

### frontend/.env

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000/api
```

---

## Supabase 설정

1. Supabase 대시보드 → SQL Editor
2. `backend/app/data/schema.sql` 파일 전체 실행
3. Authentication → Providers → Google, Discord OAuth 설정
4. Redirect URL: `https://your-domain.com`, `http://localhost:5173`

---

## 배포

### Vercel (프론트엔드)

```bash
cd frontend
npx vercel --prod
```

환경변수를 Vercel 대시보드에 등록.

### Railway (백엔드)

```bash
cd backend
railway login
railway init
railway up
```

`backend/.env`의 변수를 Railway 환경변수로 등록.

---

## 주요 기능

- **AI 게임 마스터**: Gemini가 실시간으로 스토리 전개
- **테트리스 배틀**: SRS 회전, T-spin, B2B, 콤보, 홀드
- **클래스 5종**: 전사 / 마법사 / 도적 / 성기사* / 소환사*
- **스토리 3편**: 망각의 탑 / 폐허의 기억* / 심연의 노래*
- **일일 챌린지**: 매일 새 조건, 글로벌 랭킹
- **업적 18개**: 희귀도 5단계
- **PWA 지원**: 앱 설치 가능, 오프라인 폴백

> `*` = 프리미엄 전용

---

## 라이선스

MIT
