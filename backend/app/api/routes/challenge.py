"""
일일 챌린지 시스템
- 매일 UTC 00:00에 새 챌린지 생성
- 시드 기반 → 같은 날 모든 유저가 동일한 조건
- 랭킹 집계
"""
import hashlib
import json
import random
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.supabase import supabase
from app.api.deps import get_current_user
from app.core.rate_limit import challenge_limiter

router = APIRouter(prefix="/challenge", tags=["challenge"])


# ── 챌린지 생성 로직 ──────────────────────────────────────
def _date_seed(d: date | None = None) -> int:
    """날짜 → 재현 가능한 시드"""
    target = d or datetime.now(timezone.utc).date()
    return int(hashlib.md5(str(target).encode()).hexdigest(), 16) % (2**32)


def _generate_challenge(seed: int) -> dict:
    rng = random.Random(seed)

    ENEMIES  = ['슬라임 군단', '마법 인형', '그림자 전사', '강철 골렘', '불꽃 악마', '심연의 파수꾼', '얼음 여왕']
    CLASSES  = ['warrior', 'mage', 'rogue']  # 무료 클래스만 (공정성)
    ALL_SKILLS = ['clear_line', 'swap_block', 'shield', 'time_slow', 'preview_extend']

    MODIFIERS = [
        {'label': '역중력',   'desc': '낙하 속도가 빨라집니다',          'field_events': ['heavy_gravity']},
        {'label': '좁은 필드', 'desc': '보드 양 끝이 막혀 있습니다',      'field_events': ['narrow_board']},
        {'label': '암흑 모드', 'desc': '보드 하단이 보이지 않습니다',     'field_events': ['darkness']},
        {'label': '혼돈',     'desc': '블록이 랜덤 회전합니다',          'field_events': ['random_rotation']},
        {'label': '2배 점수', 'desc': '모든 점수가 2배입니다',          'field_events': ['double_score']},
        {'label': '평온',     'desc': '특수 효과 없는 정공법',          'field_events': []},
    ]

    # 특별 룰 — 요일/시드 기반으로 변형 챌린지 (다양성 핵심)
    SPECIAL_RULES = [
        {
            'id': 'standard', 'label': '일일 대전', 'weight': 3,
            'desc': '오늘의 적을 쓰러뜨려라',
        },
        {
            'id': 'boss_rush', 'label': '보스 러시', 'weight': 1,
            'desc': '강력한 보스와 정면 승부',
        },
        {
            'id': 'limited_skill', 'label': '제한전', 'weight': 1,
            'desc': '스킬 없이 순수 실력으로',
        },
        {
            'id': 'speedrun', 'label': '스피드런', 'weight': 1,
            'desc': '제한 시간 내 라인 클리어',
        },
        {
            'id': 'handicap', 'label': '핸디캡', 'weight': 1,
            'desc': '불리한 상태로 시작',
        },
    ]

    # 가중치 기반 특별 룰 선택
    pool = [r for r in SPECIAL_RULES for _ in range(r['weight'])]
    rule = rng.choice(pool)

    enemy      = rng.choice(ENEMIES)
    modifier   = rng.choice(MODIFIERS)
    difficulty = rng.randint(2, 4)
    forced_cls = rng.choice(CLASSES) if rng.random() < 0.4 else None

    base = {
        'type':            'normal',
        'goal':            'versus',
        'enemy_name':      enemy,
        'difficulty':      difficulty,
        'initial_garbage': rng.randint(0, 2),
        'field_events':    modifier['field_events'],
        'enemy_skills':    rng.sample(['add_garbage', 'slow_player', 'scramble_board'], k=rng.randint(1, 2)),
        'player_skills':   ['clear_line', 'swap_block', 'shield'],
        'win_story':       '챌린지를 성공적으로 완료했습니다!',
        'lose_story':      '챌린지에 실패했습니다. 내일 다시 도전하세요.',
    }

    # 특별 룰별 컨텍스트 조정
    if rule['id'] == 'boss_rush':
        base['type']        = 'boss'
        base['boss_id']     = 'challenge_boss'
        base['enemy_name']  = f'{enemy} (보스)'
        base['difficulty']  = 5
        base['boss_hp']     = rng.randint(8, 12)
        base['phase_count'] = rng.randint(2, 3)
        base['enemy_skills'] = ['add_garbage', 'slow_player', 'scramble_board', 'mirror_board']
        base['player_skills'] = ['clear_line', 'swap_block', 'shield', 'time_slow']
    elif rule['id'] == 'limited_skill':
        base['player_skills'] = ['clear_line']  # 최소 스킬
        base['enemy_skills']  = ['add_garbage']
    elif rule['id'] == 'speedrun':
        base['goal']          = 'line_race'
        base['target_lines']  = rng.randint(15, 25)
        base['enemy_skills']  = []
    elif rule['id'] == 'handicap':
        base['initial_garbage'] = rng.randint(3, 5)  # 가비지 핸디캡
        base['player_skills']   = ['clear_line', 'swap_block']
    else:  # standard
        goal = rng.choice(['versus', 'line_race', 'score', 'survival'])
        base['goal'] = goal
        if goal == 'line_race':  base['target_lines']  = rng.randint(15, 25)
        if goal in ('survival', 'score'): base['duration_sec'] = rng.randint(45, 75)

    return {
        'seed':          seed,
        'date':          str(datetime.now(timezone.utc).date()),
        'rule':          {'id': rule['id'], 'label': rule['label'], 'desc': rule['desc']},
        'modifier':      modifier,
        'forced_class':  forced_cls,
        'battle_context': base,
    }


# ── 엔드포인트 ────────────────────────────────────────────
@router.get("/today")
async def get_today_challenge(user=Depends(get_current_user)):
    """오늘의 챌린지 조회"""
    seed      = _date_seed()
    challenge = _generate_challenge(seed)
    today_str = challenge['date']

    # 이미 참여했는지 확인
    res = (supabase.table("challenge_entries")
           .select("score, rank, completed")
           .eq("user_id", user.id)
           .eq("challenge_date", today_str)
           .limit(1).execute())

    entry = res.data[0] if res.data else None
    return {
        **challenge,
        'already_completed': entry is not None and entry.get('completed', False),
        'my_score':          entry['score'] if entry else None,
    }


class ChallengeResultRequest(BaseModel):
    score:         int
    lines_cleared: int
    time_taken:    int
    win:           bool
    goal:          str


@router.post("/submit")
async def submit_challenge(request: Request, body: ChallengeResultRequest, user=Depends(get_current_user)):
    challenge_limiter(request)
    """챌린지 결과 제출"""
    today_str = str(datetime.now(timezone.utc).date())

    # 중복 제출 방지
    existing = (supabase.table("challenge_entries")
                .select("id, score")
                .eq("user_id", user.id)
                .eq("challenge_date", today_str)
                .limit(1).execute())

    if existing.data and existing.data[0].get('completed'):
        raise HTTPException(status_code=400, detail="이미 오늘의 챌린지를 완료했습니다.")

    # 제출 (upsert)
    supabase.table("challenge_entries").upsert({
        "user_id":        user.id,
        "challenge_date": today_str,
        "score":          body.score,
        "lines_cleared":  body.lines_cleared,
        "time_taken":     body.time_taken,
        "win":            body.win,
        "completed":      True,
    }).execute()

    # 랭킹 계산 (내 점수보다 높은 사람 수 + 1)
    rank_res = (supabase.table("challenge_entries")
                .select("id", count="exact")
                .eq("challenge_date", today_str)
                .gt("score", body.score)
                .execute())
    rank = (rank_res.count or 0) + 1

    # 보상 계산 (XP + 골드)
    if rank == 1:
        xp_bonus, gold_bonus = 200, 100
    elif rank <= 3:
        xp_bonus, gold_bonus = 150, 70
    elif rank <= 10:
        xp_bonus, gold_bonus = 100, 50
    else:
        xp_bonus, gold_bonus = 50, 30

    # 승리 보너스
    if body.win:
        xp_bonus  += 30
        gold_bonus += 20

    # 연속 도전 스트릭 계산
    streak = _calc_streak(user.id, today_str)
    streak_bonus = min(streak * 10, 100)  # 일당 +10골드, 최대 100
    gold_bonus += streak_bonus

    return {
        "rank":         rank,
        "xp_bonus":     xp_bonus,
        "gold_bonus":   gold_bonus,
        "streak":       streak,
        "streak_bonus": streak_bonus,
        "message":      f"#{rank}위로 완료!" + (f" (연속 {streak}일!)" if streak > 1 else ""),
    }


def _calc_streak(user_id: str, today_str: str) -> int:
    """연속 챌린지 참여 일수 계산"""
    from datetime import timedelta
    try:
        res = (supabase.table("challenge_entries")
               .select("challenge_date")
               .eq("user_id", user_id)
               .eq("completed", True)
               .order("challenge_date", desc=True)
               .limit(60).execute())
        dates = {r["challenge_date"] for r in (res.data or [])}
        dates.add(today_str)  # 오늘 포함

        streak = 0
        cur = datetime.now(timezone.utc).date()
        while str(cur) in dates:
            streak += 1
            cur = cur - timedelta(days=1)
        return streak
    except Exception:
        return 1


@router.get("/leaderboard")
async def get_leaderboard(limit: int = 20):
    """오늘 챌린지 랭킹"""
    today_str = str(datetime.now(timezone.utc).date())
    res = (supabase.table("challenge_leaderboard_today")
           .select("*")
           .limit(min(limit, 50))
           .execute())
    return {"leaderboard": res.data or [], "date": today_str}


@router.get("/history")
async def get_my_challenge_history(user=Depends(get_current_user)):
    """내 챌린지 참여 기록"""
    res = (supabase.table("challenge_entries")
           .select("*")
           .eq("user_id", user.id)
           .order("challenge_date", desc=True)
           .limit(30)
           .execute())
    return {"history": res.data or []}
