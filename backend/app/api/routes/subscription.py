from fastapi import APIRouter, Depends
from app.core.supabase import supabase
from app.api.deps import get_current_user
from app.game.subscription import Plan, PLAN_FEATURES, get_plan, PREMIUM_PRICE_KRW
from app.payment.polar import PolarProvider

router = APIRouter(prefix="/subscription", tags=["subscription"])
provider = PolarProvider()
POLAR_PRODUCT_ID = "blockquest-premium-lifetime"  # 실제 ID로 교체

@router.get("/me")
async def get_my_subscription(user=Depends(get_current_user)):
    res = (supabase.table("subscriptions").select("status")
           .eq("user_id", user.id).order("created_at", desc=True).limit(1).execute())
    status = res.data[0]["status"] if res.data else None
    plan   = get_plan(status)
    return {
        "plan":       plan.value,
        "status":     status,
        "features":   PLAN_FEATURES[plan],
        "is_premium": plan == Plan.PREMIUM,
    }

@router.post("/checkout")
async def create_checkout(user=Depends(get_current_user)):
    url = await provider.create_checkout(user.id, POLAR_PRODUCT_ID)
    return {"checkout_url": url, "price_krw": PREMIUM_PRICE_KRW}

@router.get("/plans")
async def get_plans():
    return {
        "plans": [
            { "id": "free",    "name": "무료",    "price": 0,                   "features": PLAN_FEATURES[Plan.FREE],    "highlight": False },
            { "id": "premium", "name": "프리미엄", "price": PREMIUM_PRICE_KRW,  "features": PLAN_FEATURES[Plan.PREMIUM], "highlight": True,  "badge": "✦ 베스트" },
        ]
    }
