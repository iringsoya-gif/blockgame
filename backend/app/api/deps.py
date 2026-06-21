from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase import supabase
from app.game.subscription import Plan, get_plan

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증이 만료되었습니다. 다시 로그인해주세요.",
            )
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보를 확인할 수 없습니다.",
        )


async def get_user_plan(user=Depends(get_current_user)) -> Plan:
    """유저의 구독 플랜 반환"""
    try:
        res = (supabase.table("subscriptions")
               .select("status")
               .eq("user_id", user.id)
               .order("created_at", desc=True)
               .limit(1)
               .execute())
        status = res.data[0]["status"] if res.data else None
        return get_plan(status)
    except Exception:
        return Plan.FREE


def require_premium(plan: Plan = Depends(get_user_plan)):
    """프리미엄 플랜 필수 의존성"""
    if plan != Plan.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="이 기능은 프리미엄 플랜에서 이용 가능합니다.",
        )
    return plan
