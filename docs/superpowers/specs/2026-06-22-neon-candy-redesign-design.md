# BlockQuest 리디자인: Neon Candy Hybrid

**날짜:** 2026-06-22
**범위:** React 프론트엔드 UI 전체 (`frontend/src`). Phaser 게임 캔버스(`game/`, `BattleScene.js`, 테트리스 블록 렌더링)는 이번 작업 제외.

## 목표

현재 어두운 판타지 TRPG 톤을 유지하면서 뿌요뿌요 테트리스의 글로시 캔디 감성을 입힌다. "어두운 무대 + 화사한 색 폭발" 하이브리드.

- 다크 무대(TRPG 무드) 보존
- 퍼플을 메인 액센트로 유지하되 핑크 쪽으로 살짝 화사하게
- 캔디 4색을 보조 액센트로 절제 사용 (통일감 우선)
- 딱딱한 네온 글로우 → 부드러운 글로시 광택 + 둥근 UI

## 핵심 인사이트

`frontend/src` 35개 파일에 `brand-*` Tailwind 토큰과 `.btn-primary` / `.panel` 등 컴포넌트 클래스가 약 560곳 사용됨. 따라서 **중앙 토큰(`tailwind.config.js`) + 컴포넌트 레이어(`index.css`)만 교체해도 앱 대부분이 자동으로 캔디 테마로 전환**된다. 페이지별 작업은 폴리시에 집중.

## 설계

### 1. 디자인 토큰 — `tailwind.config.js`

**유지 (다크 무대):**
- `brand.bg #07071a`, `brand.bgSecondary #0d0d26`, `brand.panel #0f0f2a`, `brand.panelLight #14143a`

**퍼플 메인 강화:**
- `brand.accent` `#7c5cfc` → 보라~핑크 축으로 약간 화사하게 (예: `#8b5cff`)
- `brand.accentHover #9b7ffe` 유지, `brand.accentDark #5a3de8` 유지

**캔디 액센트 팔레트 신규:**
```js
candy: {
  pink:   '#ff5d73',
  yellow: '#ffd23f',
  green:  '#4ade80',
  blue:   '#38bdf8',
  purple: '#a855f7',
}
```

**라운드 강화:**
- 버튼 `rounded-lg` → `rounded-xl`, 패널 `rounded-xl` → `rounded-2xl`, 칩/뱃지는 pill(`rounded-full`)

**글로시 그라데이션 토큰 (`backgroundImage`):**
- `candy-pop`: 핑크→퍼플 (`linear-gradient(90deg,#ff5d73,#a855f7)`)
- `candy-rainbow`: 4색 (`linear-gradient(90deg,#ff5d73,#ffd23f,#4ade80,#38bdf8)`)
- `candy-gloss`: 블록용 radial 하이라이트 (`radial-gradient(circle at 35% 28%, rgba(255,255,255,.6), transparent 65%)`)

**그림자 (`boxShadow`):** 네온 글로우를 톤다운한 부드러운 캔디 그림자 추가
- `candy`: `0 6px 18px rgba(168,85,247,.35)` 류의 컬러드 소프트 섀도

### 2. 컴포넌트 레이어 — `index.css`

| 클래스 | 변경 |
|---|---|
| `.btn-primary` | `bg-candy-pop` 글로시 그라데이션 + `rounded-full` + 부드러운 컬러 섀도 (딱딱한 네온 글로우는 톤다운) |
| `.btn-ghost` | radius ↑, 호버 시 캔디 핑크 보더 |
| `.panel` / `.panel-glow` | radius ↑(`2xl`), 상단 글로시 하이라이트 라인(`::before` 또는 그라데이션 보더), 보더 은은하게 |
| `.badge` | `rounded-full` pill + 캔디색 변형 클래스(`.badge-pink` `.badge-blue` `.badge-green` `.badge-yellow`) |
| `.candy-block` (신규) | 둥근 사각 + `candy-gloss` radial 하이라이트(뿌요 구슬 질감). 클래스/요소 강조용 |
| 글로우 텍스트 | 기존 `.text-glow-accent` 유지 + `.text-candy-rainbow`(레인보우 그라데이션 텍스트) 추가 |
| `.particle` | 캔디색으로 칠할 수 있도록 변형 허용 |

기존 컴포넌트 클래스 이름은 유지하여 35개 파일 수정 없이 전파되게 한다.

### 3. 페이지별 폴리시 (토큰 전파 후)

- **Landing** (`pages/Landing.jsx`, 56곳): 히어로 타이틀 `text-candy-rainbow`, 파티클 캔디색화, CTA pill화
- **ClassSelect / StorySelect**: 카드별 캔디색 액센트 — 멀티컬러는 **여기서만** 절제 사용 (카드 1개당 1색)
- **Challenge / Upgrade / Profile**: 인라인 그라데이션·하드코딩 색을 신규 토큰 기반으로 정리

### 4. 적용 순서

1. `tailwind.config.js` + `index.css` 토큰/컴포넌트 교체 → `npm run build`(또는 dev) 로 전체 톤 확인
2. Landing 히어로 집중 폴리시
3. 카드형 화면(ClassSelect / StorySelect) 캔디 액센트
4. 나머지 인라인 스타일(Challenge / Upgrade / Profile) 정리

## 결정 사항

- **컬러 운용:** 퍼플 메인 + 캔디 액센트 (멀티컬러 난무 방지, 통일감 우선)
- **광택:** 네온 글로우 톤다운 → 부드러운 글로시
- **컴포넌트 클래스 이름 보존:** 토큰 교체만으로 전파, 파일별 대량 수정 회피

## 범위 밖 (Non-goals)

- Phaser 게임 캔버스(테트리스 블록·배틀 씬) 색/스타일 변경
- 레이아웃·정보 구조 변경 (색·형태·질감만 리스타일)
- 새 기능 추가
