from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.core.supabase import supabase
from app.api.deps import get_current_user, get_user_plan
from app.game.subscription import Plan

router = APIRouter(prefix="/game", tags=["game"])


class SaveRequest(BaseModel):
    guide_id:      str
    story_context: dict
    player_stats:  dict
    slot:          int = 1   # 세이브 슬롯 (무료=1, 프리미엄=1~5)


@router.post("/save")
async def save_game(
    body: SaveRequest,
    user=Depends(get_current_user),
    plan: Plan = Depends(get_user_plan),
):
    max_slots = 5 if plan == Plan.PREMIUM else 1
    slot = max(1, min(body.slot, max_slots))

    supabase.table("game_saves").upsert({
        "user_id":       user.id,
        "guide_id":      f"{body.guide_id}_slot{slot}",
        "story_context": body.story_context,
        "player_stats":  body.player_stats,
        "updated_at":    "now()",
    }).execute()
    return {"status": "saved", "slot": slot}


@router.get("/load")
async def load_game(
    guide_id: str = Query(default="default"),
    slot:     int = Query(default=1),
    user=Depends(get_current_user),
):
    res = (
        supabase.table("game_saves")
        .select("*")
        .eq("user_id", user.id)
        .eq("guide_id", f"{guide_id}_slot{slot}")
        .limit(1)
        .execute()
    )
    if res.data:
        return {"save": res.data[0]}
    return {"save": None}


@router.get("/saves")
async def list_saves(user=Depends(get_current_user)):
    """유저의 모든 세이브 슬롯 목록"""
    res = (
        supabase.table("game_saves")
        .select("guide_id, updated_at, player_stats")
        .eq("user_id", user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return {"saves": res.data or []}


@router.delete("/save")
async def delete_save(
    guide_id: str = Query(...),
    slot:     int = Query(default=1),
    user=Depends(get_current_user),
):
    supabase.table("game_saves").delete().eq(
        "user_id", user.id
    ).eq("guide_id", f"{guide_id}_slot{slot}").execute()
    return {"status": "deleted"}
