# BlockQuest 테트리스 기술 보강 (testris 이식) — 설계

**날짜:** 2026-06-22
**범위:** BlockQuest 프론트엔드 테트리스 로직(`frontend/src/game/tetris/Board.js`, `AI.js`, `frontend/src/game/scenes/BattleScene.js`). testris 프로젝트(`Downloads/testris_extract`)의 검증된 테트리스 기법을 BlockQuest의 기존 JS+Phaser 구조에 적응 이식.

## 목표

testris(현대 가이드라인 수준 TS 엔진)의 4가지 기술을 BlockQuest 테트리스에 보강한다:
1. SRS 회전/월킥 정확도 (+180° 킥)
2. T-spin mini/full 구분 + All-Spin
3. B2B 체인 카운트 + Surge
4. El-Tetris(Dellacherie) 봇 AI + 2-ply lookahead

검증을 위해 vitest를 최소 도입한다.

## 핵심 제약

- **알고리즘 이식 (파일 복사 아님).** BlockQuest=JS+Phaser, testris=TS+React. 기법만 가져와 BlockQuest 기존 파일에 적응.
- **좌표계 차이 (최대 리스크).** BlockQuest 보드: `grid[y][x]`, **row 0 = 최상단**, 라인클리어는 `unshift`. testris 엔진: **row 0 = 바닥**(softDrop이 row 감소), 24행(20 visible + 4 버퍼). 수직 방향이 반대 → 월킥 dy 부호와 코너 좌표를 BlockQuest 규약으로 변환해야 함. **테스트로 정확도 증명.**
- BlockQuest는 셀에 색상값(0x...)을 저장(0=빈칸). testris는 PieceType|null. 변환 시 "채워짐 = truthy" 규약 유지.

## 현재 BlockQuest 구현 요약 (이미 보유)

- `BattleScene.js`: 7-bag(`PieceBag`), 락딜레이(`LOCK_DELAY=500`), 홀드(C키), 가비지 큐+지연(`_garbageQueue`, `GARBAGE_DELAY=1500`), `_b2bStreak`, 소프트/하드드롭, `TetrisAI` 적.
- `Board.js`: 커스텀 SRS 월킥(normal+I, 검증 없음), `_checkTSpin`(3코너 불리언), `clearLines`(콤보/B2B 불리언/점수), `addGarbage`, `getStats`(AI용 휴리스틱), `isPerfectClear`.
- `AI.js`: `PieceBag`(7-bag), `TetrisAI`(`_evaluate` 휴리스틱, `findBest` 1-ply, `step` 점진 실행, `shouldUseSkill`).

## 설계

### 모듈 1 — SRS 회전/월킥 정확도

**파일:** `Board.js`

- 현재 `WALL_KICKS`(인덱스 기반 `normal`/`I` + CCW 부호반전 로직)를 **from→to 전이 테이블**로 재작성. testris `rotation.ts`의 `KICKS_JLSTZ`/`KICKS_I` 구조 채택하되, BlockQuest top=0 좌표에 맞춰 dy 부호 변환(현재 코드의 `ny = oy - dy` 관례 유지/정리).
- **180° 킥 추가**: `tryRotate(piece, ox, oy, rotDir)`에서 `rotDir === 2` 지원, testris의 180° 킥 테이블(`0→2`,`1→3`,`2→0`,`3→1`) 이식.
- `O` 피스는 `[[0,0]]`만.
- 반환 형태(`{ piece, x, y, isTSpin }`)는 호출부 호환 위해 유지. (T-spin 판정은 모듈 2에서 고도화하되 이 모듈에선 기존 인터페이스 보존.)

### 모듈 2 — T-spin 심화 + All-Spin

**파일:** `Board.js` (+ `BattleScene.js` 락 처리 연동)

- `lastRotation` 상태 추가: 마지막 동작이 회전이면 true, 이동/낙하면 false. 락 시점에 이 플래그로 스핀 인정.
- `_checkTSpin` → `detectSpin(piece, ox, oy)` 로 확장, 반환 `'none' | 'mini' | 'full'`:
  - T 피스: 4코너 중 ≥3 막힘 → 스핀. **front-corner(피스가 향한 두 코너)** 2개 다 막히면 `full`, 아니면 `mini`. testris `tFrontCorners`를 BlockQuest 회전 인덱스/좌표로 매핑.
  - 비-T 피스: **immobile 체크**(좌/우/아래 이동 모두 불가) → `full`(All-Spin), 아니면 `none`.
- `clearLines`가 `spin: 'none'|'mini'|'full'`을 받도록 변경, 점수표 분기:
  - T-spin full: `[0,800,1200,1600]`, T-spin mini: `[0,200,400]`, 일반: `[0,100,300,500,800]`. (mini 값은 가이드라인 기준 기본값 — 구현 플랜에서 고정.)
- `BattleScene` 락 경로에서 `lastRotation` 갱신(이동/회전/낙하 시) 및 `detectSpin` 결과를 `clearLines`로 전달.

### 모듈 3 — B2B 체인 + Surge

**파일:** `Board.js`, `BattleScene.js`

- `Board.b2b`를 불리언 → **정수 체인 카운트**로 변경. difficult clear(테트리스 or 스핀+클리어) 연속 시 +1, 일반 클리어로 끊기면 0, 퍼펙트클리어는 +2(testris 규약).
- **B2B Surge**: 체인이 ≥4인 상태에서 일반 클리어로 끊길 때 surge 발동 → 추가 가비지/점수. testris `engine.ts`의 `surge = b2bBroken && prevB2b >= 4 ? prevB2b : 0` 공식 이식.
- `clearLines` 반환에 `b2b`(정수), `surge` 추가. `BattleScene`의 `_b2bStreak`/`max_b2b_streak` 통계와 연동하고, surge>0이면 `enemy_garbage`로 추가 공격 또는 점수 보너스.

### 모듈 4 — El-Tetris(Dellacherie) 봇 AI

**파일:** `AI.js`

- `TetrisAI._evaluate`를 **Dellacherie 6-피처**로 교체: landingHeight, erodedPieces(=clearedLines × 해당 피스의 지워진 셀), rowTransitions, columnTransitions, buriedHoles, wellSums. 공개 가중치(testris `elTetris()`):
  `-4.5001588×LH +3.4181268×EP -3.2178883×RT -9.3486953×CT -7.8992654×H -3.3855972×W`
  + center-bias(`-3.5 × |col-center|` 정규화)로 벽 배치 억제.
  좌표계: BlockQuest top=0 → testris bottom=0 공식 적용 시 row 반전 변환.
- `findBest`를 **2-ply lookahead**로 확장: `scene.enemyBag.peek(1)`로 다음 피스를 알 때 `eval(after_cur) + bestScore(after_next)` 최대화. peek 불가 시 1-ply 폴백.
- landingRow/erasedCells를 placement 시 계산(현재 findBest는 미산출 → y=착지행, 지워진 행 중 피스가 걸친 셀 수 카운트 추가).
- `step()` 실행부(rotate/move/drop 점진 처리)와 난이도(`WEIGHTS`/`INTERVALS`/`setDifficulty`/`escalate`), `shouldUseSkill`은 **유지**.

### 테스팅 (vitest 최소 도입)

- `frontend`에 vitest + 설정 추가(`package.json` scripts `test`, `vitest.config.js`). 기존 vite와 호환.
- 순수 로직 테스트(좌표 변환 버그를 여기서 포획):
  - 회전/월킥: 각 피스 0↔1↔2↔3 + 180°, 대표 킥 케이스(벽/바닥 근처). testris `wallkick.diag.test.ts` 적응.
  - T-spin: TST/STSD 류 셋업에서 full/mini, S/Z All-Spin immobile 케이스.
  - B2B: 테트리스 연속 체인 증가, 끊김 시 surge 발동(체인≥4), 퍼펙트클리어 +2.
  - El-Tetris 평가: 알려진 보드에서 holes/wells/transitions 카운트 정확성, bestMove가 명백한 라인클리어를 선택.
- 목표: 핵심 순수함수 테스트 통과(개수는 구현 시 확정). `npm run build`도 계속 그린.

## 분해 / 순서 (각 단위 독립 검증)

1. **vitest 하니스** + **모듈 1(회전/월킥)** + 회전 테스트
2. **모듈 2(T-spin/All-Spin)** + 테스트
3. **모듈 3(B2B 체인/Surge)** + 테스트
4. **모듈 4(El-Tetris 봇)** + 평가 테스트

각 단계: 구현 → vitest 통과 → `npm run build` 그린 → 커밋.

## 범위 밖 (Non-goals)

- 실제 ColdClear WASM(`/wasm/cold-clear.js`) 통합 — El-Tetris 폴백만 이식.
- testris의 스킬/클래스/게이지 시스템 이식 — BlockQuest는 자체 스킬(`SkillManager`, `skillTree.js`, 백엔드 `skill_registry`) 보유.
- React/TS 채택, Phaser 렌더링 구조 변경.
- 멀티플레이/소켓(testris backend) 관련 일체.
- BlockQuest 기존 락딜레이/홀드/가비지 큐/7-bag 재작성(이미 보유, 유지).

## 결정 사항

- vitest 도입 승인됨(정확도 검증용).
- 봇은 El-Tetris 폴백 이식(실 ColdClear WASM 제외).
- 4개 모듈 전부 진행, 위 순서로 점진 적용.
