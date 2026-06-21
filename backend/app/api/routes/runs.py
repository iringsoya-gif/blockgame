from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.supabase import supabase
from app.api.deps import get_current_user, get_user_plan
from app.game.subscription import Plan, can_access_class

router = APIRouter(prefix="/runs", tags=["runs"])


class RunEndRequest(BaseModel):
    player_class:      str            = Field(..., max_length=30)
    ending_id:         str | None     = Field(default=None, max_length=50)
    guide_id:          str            = Field(default="default", max_length=30)
    survived_battles:  int            = Field(default=0, ge=0, le=999)
    total_lines:       int            = Field(default=0, ge=0, le=999999)
    final_level:       int            = Field(default=1, ge=1, le=999)
    final_gold:        int            = Field(default=0, ge=0, le=9999999)
    unlocked_skills:   list[str]      = Field(default_factory=list, max_length=50)
    cleared:           bool           = False


@router.post("/start")
async def start_run(player_class: str, user=Depends(get_current_user),
                    plan: Plan = Depends(get_user_plan)):
    """새 런 시작 — 기존 active 런을 먼저 종료"""
    # 클래스 접근 권한 검증 (프리미엄 클래스를 무료 유저가 우회 못 하도록)
    if not can_access_class(plan, player_class):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"'{player_class}' 클래스는 프리미엄 플랜에서 이용 가능합니다.",
        )
    # 해금 검증 (기본 클래스 외에는 스토리 클리어로 해금되어야 함)
    FREE_CLASSES = {"warrior", "mage", "rogue"}
    if player_class not in FREE_CLASSES:
        unlock_id = f"class_{player_class}"
        try:
            unlocked = (supabase.table("unlocks")
                        .select("unlock_id")
                        .eq("user_id", user.id)
                        .eq("unlock_id", unlock_id)
                        .limit(1).execute())
            if not unlocked.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"'{player_class}' 클래스는 아직 해금되지 않았습니다.",
                )
        except HTTPException:
            raise
        except Exception:
            pass  # unlocks 조회 실패 시 차단하지 않음 (가용성 우선)
    # 중복 active 런 방지
    existing = (
        supabase.table("runs")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .execute()
    )
    if existing.data:
        # 기존 active 런 자동 종료
        supabase.table("runs").update({"status": "abandoned"}).eq(
            "user_id", user.id
        ).eq("status", "active").execute()

    res = supabase.table("runs").insert({
        "user_id":      user.id,
        "player_class": player_class,
        "status":       "active",
    }).execute()

    return {"run_id": res.data[0]["id"] if res.data else None}


@router.post("/end")
async def end_run(body: RunEndRequest, user=Depends(get_current_user)):
    """런 종료 기록"""
    supabase.table("runs").update({
        "status":           "finished",
        "ending_id":        body.ending_id,
        "survived_battles": body.survived_battles,
        "total_lines":      body.total_lines,
        "final_level":      body.final_level,
        "final_gold":       body.final_gold,
        "cleared":          body.cleared,
    }).eq("user_id", user.id).eq("status", "active").execute()

    # 클리어 보상 해금
    if body.ending_id and body.cleared:
        _unlock_ending_rewards(user.id, body.ending_id, body.guide_id)

    return {"status": "recorded"}


@router.get("/history")
async def get_history(user=Depends(get_current_user), limit: int = 20):
    limit = min(limit, 50)
    res = (
        supabase.table("runs")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "active")          # 진행 중 런 제외
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"runs": res.data}


@router.get("/best")
async def get_best(user=Depends(get_current_user)):
    res = (
        supabase.table("runs")
        .select("*")
        .eq("user_id", user.id)
        .eq("cleared", True)
        .order("total_lines", desc=True)
        .limit(1)
        .execute()
    )
    return {"best": res.data[0] if res.data else None}


@router.get("/active")
async def get_active_run(user=Depends(get_current_user)):
    """현재 진행 중인 런 조회"""
    res = (
        supabase.table("runs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return {"run": res.data[0] if res.data else None}


@router.get("/unlocks")
async def get_unlocks(user=Depends(get_current_user)):
    res = (
        supabase.table("unlocks")
        .select("unlock_id")
        .eq("user_id", user.id)
        .execute()
    )
    return {"unlocks": [r["unlock_id"] for r in (res.data or [])]}


@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    """유저 통계 요약"""
    all_runs = (
        supabase.table("runs")
        .select("cleared, total_lines, final_level, player_class")
        .eq("user_id", user.id)
        .neq("status", "active")
        .execute()
    ).data or []

    total       = len(all_runs)
    cleared     = sum(1 for r in all_runs if r.get("cleared"))
    total_lines = sum(r.get("total_lines", 0) for r in all_runs)
    max_level   = max((r.get("final_level", 1) for r in all_runs), default=1)
    fav_class   = max(
        set(r.get("player_class","") for r in all_runs),
        key=lambda c: sum(1 for r in all_runs if r.get("player_class") == c),
        default=None,
    )

    # 챌린지 참여 횟수
    challenge_count = 0
    try:
        ch = (supabase.table("challenge_entries")
              .select("id", count="exact")
              .eq("user_id", user.id)
              .eq("completed", True)
              .execute())
        challenge_count = ch.count or 0
    except Exception:
        pass

    return {
        "total_runs":      total,
        "cleared":         cleared,
        "clear_rate":      round(cleared / total * 100, 1) if total else 0,
        "total_lines":     total_lines,
        "max_level":       max_level,
        "fav_class":       fav_class,
        "challenge_count": challenge_count,
    }


def _unlock_ending_rewards(user_id: str, ending_id: str, guide_id: str = "default"):
    # 스토리별 해금 (엔딩 ID가 스토리 간 겹치므로 guide_id로 구분)
    by_story = {
        "default": {
            "true_ending":   ["story_chapter_2", "class_paladin"],
            "secret_ending": ["class_summoner", "story_void"],
            "bad_ending":    ["skill_dark_clear"],
        },
        "citadel": {
            "redemption_ending": ["class_guardian"],
            "escape_ending":     ["class_guardian"],
        },
        "vessel": {
            "free_ending":    ["class_technician"],
            "machine_ending": ["class_technician"],
        },
        "wuxia": {
            "true_ending":       ["class_swordmaster"],
            "redemption_ending": ["class_swordmaster"],
        },
        "void": {
            "true_ending":   ["badge_void_closer"],
            "return_ending": ["badge_void_survivor"],
        },
    }
    rewards = by_story.get(guide_id, {}).get(ending_id, [])
    for reward in rewards:
        supabase.table("unlocks").upsert({
            "user_id":   user_id,
            "unlock_id": reward,
        }).execute()


@router.get("/leaderboard/lines")
async def leaderboard_by_lines(limit: int = 20):
    """총 라인 수 글로벌 랭킹 (비로그인 접근 가능)"""
    try:
        res = (
            supabase.table("user_stats")
            .select("id, username, total_lines, cleared_runs, max_level")
            .order("total_lines", desc=True)
            .limit(min(limit, 50))
            .execute()
        )
        return {
            "leaderboard": [
                {**r, "rank": i + 1}
                for i, r in enumerate(res.data or [])
            ]
        }
    except Exception:
        return {"leaderboard": []}


@router.get("/leaderboard/runs")
async def leaderboard_by_runs(limit: int = 20):
    """총 런 수 글로벌 랭킹"""
    try:
        res = (
            supabase.table("user_stats")
            .select("id, username, total_runs, cleared_runs")
            .order("total_runs", desc=True)
            .limit(min(limit, 50))
            .execute()
        )
        return {
            "leaderboard": [
                {**r, "rank": i + 1}
                for i, r in enumerate(res.data or [])
            ]
        }
    except Exception:
        return {"leaderboard": []}


class EndlessScoreRequest(BaseModel):
    score: int = Field(default=0, ge=0, le=99999999)
    lines: int = Field(default=0, ge=0, le=999999)


@router.post("/endless")
async def submit_endless(body: EndlessScoreRequest, user=Depends(get_current_user)):
    """엔드리스 점수 제출 — 최고점만 갱신 (upsert)"""
    try:
        # 기존 최고점 조회
        existing = (supabase.table("endless_scores")
                    .select("best_score")
                    .eq("user_id", user.id)
                    .execute())
        prev = existing.data[0]["best_score"] if existing.data else 0
        if body.score > prev:
            supabase.table("endless_scores").upsert({
                "user_id":    user.id,
                "best_score": body.score,
                "best_lines": body.lines,
                "updated_at": "now()",
            }, on_conflict="user_id").execute()
            return {"updated": True, "best_score": body.score}
        return {"updated": False, "best_score": prev}
    except Exception:
        return {"updated": False, "best_score": 0}


@router.get("/endless/leaderboard")
async def endless_leaderboard(limit: int = 20):
    """엔드리스 글로벌 랭킹"""
    try:
        res = (supabase.table("endless_leaderboard")
               .select("user_id, username, best_score, best_lines")
               .limit(min(limit, 100)).execute())
        return {
            "leaderboard": [
                {"rank": i + 1, "username": r.get("username") or "익명",
                 "score": r["best_score"], "lines": r["best_lines"]}
                for i, r in enumerate(res.data or [])
            ]
        }
    except Exception:
        return {"leaderboard": []}
