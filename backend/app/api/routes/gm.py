from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Body
from pydantic import BaseModel, Field
from app.game.session_manager import session_manager
from app.game.story_guide_loader import list_guides
from app.api.deps import get_current_user, get_user_plan
from app.game.subscription import Plan, can_access_story
from app.core.rate_limit import gm_limiter

router = APIRouter(prefix="/gm", tags=["gm"])

MAX_INPUT_LEN = 500   # 플레이어 입력 최대 글자


class ActionRequest(BaseModel):
    player_input: str  = Field(..., max_length=MAX_INPUT_LEN)
    game_state:   dict = Field(default_factory=dict)
    guide_id:     str  = Field(default="default", max_length=30)


class BattleResultRequest(BaseModel):
    win:           bool
    time_taken:    int       = Field(default=0, ge=0, le=3600)
    boss_id:       str | None = Field(default=None, max_length=50)
    lines_cleared: int       = Field(default=0, ge=0, le=9999)
    score:         int       = Field(default=0, ge=0, le=99999999)
    goal:          str       = Field(default="versus", max_length=20)


@router.post("/action")
async def player_action(
    request: Request,
    body: ActionRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    plan: Plan = Depends(get_user_plan),
):
    gm_limiter(request)
    # guide_id 유효성 체크
    from app.game.story_guide_loader import list_guides
    available = list_guides()
    if body.guide_id not in available:
        body.guide_id = "default"  # 없으면 기본 스토리

    # 스토리 접근 권한 확인
    if not can_access_story(plan, body.guide_id):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"'{body.guide_id}' 스토리는 프리미엄 플랜에서 이용 가능합니다.",
        )
    agent = session_manager.get_or_create(user.id, body.guide_id)
    result = await agent.process(body.player_input.strip(), body.game_state)
    # 백그라운드에서 세션 저장
    background_tasks.add_task(session_manager.save_to_db, user.id)
    return result


@router.post("/battle-result")
async def battle_result(
    request: Request,
    body: BattleResultRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    gm_limiter(request)
    agent = session_manager.get_or_create(user.id)
    result = await agent.process_battle_result(body.model_dump())
    background_tasks.add_task(session_manager.save_to_db, user.id)
    return result


@router.post("/reset")
async def reset_session(body: dict = Body(default={}), user=Depends(get_current_user)):
    guide_id = str(body.get("guide_id", "default"))[:30]
    session_manager.reset(user.id, guide_id)
    return {"status": "reset", "guide_id": guide_id}


@router.get("/guides")
async def get_guides():
    return {"guides": list_guides()}


@router.get("/session")
async def get_session_info(user=Depends(get_current_user)):
    if not session_manager.has_session(user.id):
        return {"active": False}
    agent = session_manager.get_or_create(user.id)
    return {
        "active":        True,
        "battle_count":  agent.battle_count,
        "flags":         list(agent.story_flags),
        "npc_relations": agent.npc_relations,
    }


@router.get("/npc-relations")
async def get_npc_relations(user=Depends(get_current_user)):
    if not session_manager.has_session(user.id):
        return {"relations": {}}
    agent = session_manager.get_or_create(user.id)
    return {"relations": agent.npc_relations}


@router.get("/status")
async def gm_status(user=Depends(get_current_user)):
    """GM 세션 상태 + AI 제공자 정보"""
    agent = session_manager._sessions.get(user.id)
    providers = [p.name for p in (agent._providers if agent else [])]
    active    = agent.active_provider if agent else "none"
    return {
        "has_session":      agent is not None,
        "battle_count":     agent.battle_count if agent else 0,
        "active_provider":  active,
        "providers":        providers,
        "story_flags":      list(agent.story_flags) if agent else [],
    }
