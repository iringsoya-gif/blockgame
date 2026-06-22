# Neon Candy Hybrid 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BlockQuest React UI를 다크 무대를 유지한 채 뿌요뿌요풍 글로시 캔디 테마로 전환한다.

**Architecture:** 중앙 디자인 토큰(`tailwind.config.js`)과 컴포넌트 레이어(`index.css`)를 먼저 교체해 35개 파일에 자동 전파시키고, 그 다음 Landing 히어로·카드 화면·인라인 하드코딩 색만 폴리시한다. 컴포넌트 클래스 이름은 보존한다.

**Tech Stack:** React 18, Vite 5, Tailwind 3.4, PostCSS/autoprefixer. 테스트 프레임워크 없음 → 검증은 `npm run build` + `npm run lint` + dev 서버 시각 확인.

**작업 디렉터리:** `C:\Users\USER\Downloads\blockquest` (git `main`). 프론트엔드 명령은 `frontend/`에서 실행.

**Spec:** `docs/superpowers/specs/2026-06-22-neon-candy-redesign-design.md`

---

## File Structure

| 파일 | 역할 | 변경 |
|---|---|---|
| `frontend/tailwind.config.js` | 디자인 토큰 (색·그라데이션·섀도·radius) | 수정 |
| `frontend/src/index.css` | 컴포넌트 클래스 (`.btn-primary`, `.panel`, `.badge` 등) | 수정 |
| `frontend/src/pages/Landing.jsx` | 히어로 타이틀·파티클·장식 블록 색 | 수정 |
| `frontend/src/pages/ClassSelect.jsx` | 스탯바 radius 등 미세 폴리시 | 수정 |
| `frontend/src/pages/StorySelect.jsx` | 인라인 하드코딩 색 정리 | 수정 |
| `frontend/src/pages/Challenge.jsx` / `Upgrade.jsx` / `Profile.jsx` | 인라인 하드코딩 hex → 토큰 | 수정 |

검증 명령(모든 태스크 공통):
- 빌드: `cd frontend && npm run build` → `✓ built in` 으로 끝나면 성공
- 린트: `cd frontend && npm run lint` → 경고 20개 이하면 통과
- 시각: `cd frontend && npm run dev` 후 브라우저에서 해당 화면 확인

---

## Task 1: 디자인 토큰 교체 (tailwind.config.js)

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: `brand.accent`를 살짝 화사하게 + candy 팔레트 추가**

`colors.brand` 객체에서 `accent` 값을 바꾸고, `brand` 형제로 `candy`를 추가한다.

`accent: '#7c5cfc',` → `accent: '#8b5cff',` 로 변경.

`colors` 객체 안 `brand: { ... }` 바로 다음에 추가:

```js
candy: {
  pink:   '#ff5d73',
  yellow: '#ffd23f',
  green:  '#4ade80',
  blue:   '#38bdf8',
  purple: '#a855f7',
},
```

- [ ] **Step 2: 글로시 그라데이션 토큰 추가**

`backgroundImage` 객체 안에 다음 3개를 추가한다(기존 항목은 유지):

```js
'candy-pop':     'linear-gradient(90deg, #ff5d73 0%, #a855f7 100%)',
'candy-rainbow': 'linear-gradient(90deg, #ff5d73, #ffd23f, #4ade80, #38bdf8)',
'candy-gloss':   'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), transparent 62%)',
```

- [ ] **Step 3: 부드러운 캔디 섀도 추가**

`boxShadow` 객체 안에 추가(기존 항목 유지):

```js
'candy-soft':  '0 6px 20px rgba(168,85,247,0.35)',
'candy-pink':  '0 6px 18px rgba(255,93,115,0.40)',
'candy-glow':  '0 0 24px rgba(168,85,247,0.45)',
```

- [ ] **Step 4: 빌드로 토큰 유효성 확인**

Run: `cd frontend && npm run build`
Expected: 에러 없이 `✓ built in ...` 출력. (이 시점엔 시각 변화 거의 없음 — 토큰만 추가/`accent` 미세 변경)

- [ ] **Step 5: 커밋**

```bash
git add frontend/tailwind.config.js
git commit -m "feat(design): candy 팔레트·글로시 그라데이션·소프트 섀도 토큰 추가"
```

---

## Task 2: 컴포넌트 레이어 글로시화 (index.css)

목표: 클래스 이름은 유지하되 버튼·패널·뱃지를 둥글고 글로시하게. 35개 파일에 자동 전파.

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: `.btn-primary`를 캔디 글로시 그라데이션 + pill로 교체**

`@layer components` 안의 기존 `.btn-primary { ... }` 블록과 그 아래 두 개의 `.btn-primary:not(:disabled):hover/active` 규칙을 아래로 통째 교체:

```css
.btn-primary {
  @apply relative inline-flex items-center justify-center gap-2
         px-5 py-2.5 rounded-full font-medium text-sm text-white
         transition-all duration-200
         disabled:opacity-35 disabled:cursor-not-allowed;
  background-image: linear-gradient(90deg, #ff5d73 0%, #a855f7 100%);
  box-shadow: 0 4px 14px rgba(168,92,255,0.30);
}
.btn-primary:not(:disabled):hover {
  filter: brightness(1.08);
  box-shadow: 0 6px 20px rgba(168,92,255,0.45);
  transform: translateY(-1px);
}
.btn-primary:not(:disabled):active { transform: translateY(0); filter: brightness(0.98); }
```

- [ ] **Step 2: `.btn-ghost` radius·호버색 캔디화**

기존 `.btn-ghost` 블록의 `rounded-lg`를 `rounded-full`로, `hover:border-brand-accent/60`를 `hover:border-candy-pink/60`로 변경. 최종:

```css
.btn-ghost {
  @apply inline-flex items-center justify-center gap-2
         px-4 py-2 rounded-full text-sm
         border border-brand-border text-brand-muted
         hover:border-candy-pink/60 hover:text-brand-text
         transition-all duration-200
         disabled:opacity-30 disabled:cursor-not-allowed;
}
```

- [ ] **Step 3: `.panel` / `.panel-glow` 라운드 + 상단 글로시 하이라이트**

기존 `.panel`, `.panel-glow` 블록을 아래로 교체:

```css
.panel {
  @apply relative bg-brand-panel border border-brand-border rounded-2xl;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
}
.panel::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  padding-top: 1px;
  background: linear-gradient(180deg, rgba(255,255,255,0.10), transparent 40%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
.panel-glow {
  @apply panel;
  box-shadow: 0 0 0 1px rgba(168,85,247,0.18), 0 8px 36px rgba(0,0,0,0.5);
}
```

참고: `.panel::before`가 자식 레이아웃에 영향 주지 않도록 `pointer-events:none`. 만약 특정 패널에서 깨지면 Step 7 시각 검증에서 잡는다.

- [ ] **Step 4: `.badge` pill + 캔디 변형 추가**

기존 `.badge` 블록을 교체하고 변형 4종 추가:

```css
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono
         border border-brand-border text-brand-muted;
}
.badge-pink   { @apply border-candy-pink/40   text-candy-pink; }
.badge-blue   { @apply border-candy-blue/40   text-candy-blue; }
.badge-green  { @apply border-candy-green/40  text-candy-green; }
.badge-yellow { @apply border-candy-yellow/40 text-candy-yellow; }
```

- [ ] **Step 5: 신규 `.candy-block`, `.text-candy-rainbow` 추가**

`@layer components` 안 글로우 텍스트 영역 근처에 추가:

```css
.candy-block {
  @apply relative rounded-lg;
  background-image: radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), transparent 62%);
}
.text-candy-rainbow {
  background-image: linear-gradient(90deg, #ff5d73, #ffd23f, #4ade80, #38bdf8);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
```

- [ ] **Step 6: 빌드 + 린트**

Run: `cd frontend && npm run build && npm run lint`
Expected: 빌드 `✓ built in`, 린트 경고 20개 이하. (`mask-composite` 등 CSS는 빌드 통과)

- [ ] **Step 7: 시각 검증**

Run: `cd frontend && npm run dev`
브라우저에서 `/` 와 `/class` 진입 → 버튼이 핑크→퍼플 pill, 패널이 둥글고 상단에 미세한 광택 라인. 패널 내부 콘텐츠가 가려지지 않는지 확인. 깨지면 `.panel::before` 조정.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/index.css
git commit -m "feat(design): 버튼·패널·뱃지 글로시 캔디 스타일 + candy-block/rainbow 유틸"
```

---

## Task 3: Landing 히어로 폴리시

**Files:**
- Modify: `frontend/src/pages/Landing.jsx`

- [ ] **Step 1: 파티클·장식 블록 색을 캔디 팔레트로**

`PARTICLES`의 `color` 배열(line 14)을 교체:

```js
color: ['#ff5d73','#ffd23f','#4ade80','#38bdf8','#a855f7'][Math.floor(Math.random()*5)],
```

`DECO_PIECES`(line 18~24)의 각 `color`를 캔디색으로 교체:

```js
const DECO_PIECES = [
  { shape: [[1,1],[1,1]], color: '#ffd23f', top: '15%', left: '8%',  rotate: 15, scale: 1.2 },
  { shape: [[1,1,1,1]],   color: '#38bdf8', top: '65%', left: '5%',  rotate: -20, scale: 0.9 },
  { shape: [[0,1,0],[1,1,1]], color: '#a855f7', top: '25%', right: '7%', rotate: 30, scale: 1.1 },
  { shape: [[1,1,0],[0,1,1]], color: '#ff5d73', top: '70%', right: '6%', rotate: -15, scale: 0.8 },
  { shape: [[1,0,0],[1,1,1]], color: '#4ade80', top: '45%', left: '3%', rotate: 10, scale: 0.7 },
]
```

- [ ] **Step 2: 히어로 타이틀 "BLOCK"을 레인보우 그라데이션으로**

line 171~177의 `<h1>` 안 첫 `<span>`(인라인 `style`로 `#7c5cfc` 지정된 부분)을 교체:

```jsx
<h1 className="font-display font-black tracking-wider leading-none">
  <span className="block text-7xl text-candy-rainbow"
    style={{ filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.45))' }}>
    BLOCK
  </span>
  <span className="block text-7xl text-brand-text">QUEST</span>
</h1>
```

- [ ] **Step 3: 배경 글로우 오브 색을 캔디로**

line 113~115의 글로우 오브 클래스 변경:
- `bg-brand-accent/5` → `bg-candy-purple/10`
- `bg-brand-danger/5` → `bg-candy-pink/10`
- `bg-brand-success/4` → `bg-candy-blue/10`

- [ ] **Step 4: 빌드 + 시각 검증**

Run: `cd frontend && npm run build`
Expected: `✓ built in`. 이어 `npm run dev`로 `/` 확인 → "BLOCK"이 레인보우, 파티클/장식 블록이 캔디색.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/pages/Landing.jsx
git commit -m "feat(design): Landing 히어로 레인보우 타이틀 + 캔디 파티클/배경"
```

---

## Task 4: 카드 화면 미세 폴리시 (ClassSelect / StorySelect)

ClassSelect는 이미 클래스별 `cls.color` 액센트를 쓰므로 Task 2 토큰 전파로 대부분 해결. 잔여 하드코딩만 정리.

**Files:**
- Modify: `frontend/src/pages/ClassSelect.jsx`
- Modify: `frontend/src/pages/StorySelect.jsx`

- [ ] **Step 1: ClassSelect 스탯바 빈칸 색 토큰화**

`StatBar`(line 34~35)의 빈칸 하드코딩 `'#1e1e4a'`는 `brand.border`와 동일하므로 토큰 클래스로 바꾼다. line 34의 `<div>`를 교체:

```jsx
<div key={i}
  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < value ? '' : 'bg-brand-border'}`}
  style={i < value ? { backgroundColor: color } : undefined} />
```

- [ ] **Step 2: StorySelect의 하드코딩 색 점검**

Run: `cd frontend && git grep -nE "#[0-9a-fA-F]{6}" src/pages/StorySelect.jsx`
나온 hex 중 아래 매핑에 해당하면 교체, 스토리 고유색(스토리 데이터에서 온 `color` 변수)은 그대로 둔다:

| 기존 | 변경 |
|---|---|
| `#7c5cfc` | `#8b5cff` (또는 `brand-accent`) |
| `#44ff99` | `#4ade80` |
| `#ff4466` | `#ff5d73` |
| `#ffd700` | `#ffd23f` |

해당 hex가 없으면 이 스텝은 변경 없이 통과.

- [ ] **Step 3: 빌드 + 시각 검증**

Run: `cd frontend && npm run build`
Expected: `✓ built in`. `npm run dev`로 `/class`, `/story-select` 확인 → 카드 둥글고 글로시, 클래스/스토리 고유색 유지.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/ClassSelect.jsx frontend/src/pages/StorySelect.jsx
git commit -m "feat(design): 카드 화면 잔여 하드코딩 색 캔디 토큰으로 정리"
```

---

## Task 5: 인라인 하드코딩 색 정리 (Challenge / Upgrade / Profile)

토큰 전파 후 남은, 구 팔레트를 직접 박은 hex만 캔디로 치환. 레이아웃·기능은 건드리지 않는다.

**Files:**
- Modify: `frontend/src/pages/Challenge.jsx`
- Modify: `frontend/src/pages/Upgrade.jsx`
- Modify: `frontend/src/pages/Profile.jsx`

- [ ] **Step 1: 세 파일의 구 팔레트 hex 탐색**

Run: `cd frontend && git grep -nE "#7c5cfc|#9b7ffe|#44ff99|#22cc66|#ff4466|#cc2244|#ffd700|#cc9900" src/pages/Challenge.jsx src/pages/Upgrade.jsx src/pages/Profile.jsx`
출력된 각 위치를 Step 2 매핑으로 교체할 대상 목록으로 삼는다.

- [ ] **Step 2: 매핑대로 치환**

각 hit을 아래 표대로 1:1 치환(클래스/스토리 데이터에서 동적으로 오는 색 변수는 제외, 리터럴 hex만):

| 기존 | 변경 |
|---|---|
| `#7c5cfc` / `#9b7ffe` | `#8b5cff` |
| `#44ff99` / `#22cc66` | `#4ade80` |
| `#ff4466` / `#cc2244` | `#ff5d73` |
| `#ffd700` / `#cc9900` | `#ffd23f` |

각 파일을 Read로 해당 라인 확인 후 Edit로 정확히 치환한다.

- [ ] **Step 3: 빌드 + 린트**

Run: `cd frontend && npm run build && npm run lint`
Expected: 빌드 `✓ built in`, 린트 경고 20개 이하.

- [ ] **Step 4: 시각 검증**

Run: `cd frontend && npm run dev`
`/challenge`, `/upgrade`, `/profile` 진입 → 구 보라/빨강/금색 잔재 없이 캔디 톤 일관. 깨진 대비(텍스트 가독성) 없는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/pages/Challenge.jsx frontend/src/pages/Upgrade.jsx frontend/src/pages/Profile.jsx
git commit -m "feat(design): Challenge/Upgrade/Profile 인라인 색 캔디 팔레트 정리"
```

---

## Task 6: 전체 회귀 점검

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 빌드 + 린트**

Run: `cd frontend && npm run build && npm run lint`
Expected: 빌드 성공, 린트 경고 20개 이하.

- [ ] **Step 2: 남은 구 팔레트 잔재 스캔**

Run: `cd frontend && git grep -nE "#7c5cfc|#9b7ffe|#44ff99|#ff4466|#ffd700" src/`
Expected: hit이 있어도 의도적으로 남긴 것(예: Google/Discord 브랜드색 `#5865F2`는 대상 아님)인지 확인. 누락된 구 팔레트가 보이면 해당 파일을 Task 5 방식으로 정리.

- [ ] **Step 3: 핵심 화면 순회 시각 확인**

`npm run dev`로 `/`, `/class`, `/story-select`, `/game`, `/challenge`, `/upgrade`, `/profile`, `/leaderboard`, `/settings` 순회.
체크: 다크 무대 유지 / 버튼·패널 둥근 글로시 / 캔디 액센트가 과하지 않고 퍼플 메인 통일 / 텍스트 대비 양호.

- [ ] **Step 4: 최종 커밋 (필요 시)**

회귀에서 추가 수정이 있었다면:

```bash
git add -A
git commit -m "fix(design): 캔디 리디자인 회귀 점검 잔여 정리"
```

---

## Self-Review 노트 (작성자 확인 완료)

- **Spec 커버리지:** 토큰(Task 1) · 컴포넌트 레이어(Task 2) · Landing 폴리시(Task 3) · 카드 화면(Task 4) · 인라인 정리(Task 5) · 회귀(Task 6) — spec의 4개 설계 섹션 + 적용 순서 모두 매핑됨.
- **범위 밖 준수:** Phaser `game/`·`BattleScene.js`는 어느 태스크에서도 건드리지 않음.
- **타입/이름 일관성:** 신규 토큰 `candy.*`, 유틸 `.candy-block` / `.text-candy-rainbow`, 뱃지 변형 `.badge-{pink,blue,green,yellow}` — Task 2에서 정의 후 Task 3~5에서 동일 이름 사용.
- **검증 일관성:** 테스트 프레임워크 부재 → 전 태스크 `npm run build` + `npm run lint` + dev 시각 확인으로 통일.
