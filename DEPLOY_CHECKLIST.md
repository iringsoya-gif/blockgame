# BlockQuest 배포 체크리스트

## 1. Supabase 설정
- [ ] 프로젝트 생성 (supabase.com)
- [ ] SQL Editor에서 `backend/app/data/schema.sql` 전체 실행
- [ ] Authentication → Providers → Google, Discord OAuth 활성화
- [ ] Redirect URLs 등록: 배포 도메인 + `http://localhost:5173`
- [ ] Project Settings → API에서 service_role key, anon key 복사

## 2. AI 제공자 (최소 1개 필수)
- [ ] Groq: console.groq.com → API Keys (무료, 카드 불필요, 하루 14,400회)
- [ ] (선택) Gemini: aistudio.google.com (폴백용, 하루 1,000회)
- 우선순위: Groq 8B → Groq 70B(보스/엔딩) → Gemini Flash-Lite → Gemini Flash

## 3. 백엔드 (Railway)
- [ ] `backend/.env` 작성 (.env.example 참고)
- [ ] 필수: SUPABASE_URL, SUPABASE_SERVICE_KEY, GROQ_API_KEY
- [ ] `railway up` 또는 GitHub 연동 자동 배포
- [ ] 배포 후 `/health` 엔드포인트로 DB 연결 확인

## 4. 프론트엔드 (Vercel)
- [ ] `frontend/.env` 작성: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
- [ ] VITE_API_URL은 Railway 백엔드 URL + `/api`
- [ ] `vercel --prod` 또는 GitHub 연동

## 5. 결제 (선택 — 없어도 무료 기능 전부 동작)
- [ ] Polar.sh 계정 + 상품 등록 → POLAR_API_KEY, POLAR_PRODUCT_ID
- [ ] 웹훅 URL: `{백엔드}/api/payment/webhook`
- [ ] POLAR_WEBHOOK_SECRET 설정

## 6. 배포 후 점검
- [ ] 로그인 (Google/Discord) 동작
- [ ] 게스트 모드 (`/try`) 동작
- [ ] 스토리 시작 → GM 응답 정상 (AI 키 확인)
- [ ] 전투 진입 → 튜토리얼 → 테트리스 동작
- [ ] 일일 챌린지 + 랭킹 표시
- [ ] PWA 설치 프롬프트

## 콘텐츠 현황
- 스토리 5개: 망각의 탑(무료), 폐허의 기억, 심연의 노래, 별을 삼킨 성채, 정지된 함선(프리미엄)
- 클래스 5개: 전사/마법사/도적(무료), 성기사/소환사(엔딩 해금)
- 업적 24개, 칭호 18개
- 무료: 스토리 1 + 기본 클래스 3 + 챌린지 + 랭킹 전부
- 프리미엄 ₩9,900: 전체 스토리 + 전체 클래스 + 무제한 스킬 트리
