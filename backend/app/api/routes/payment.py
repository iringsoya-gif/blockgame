import hashlib
import hmac
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.payment.polar import PolarProvider
from app.core.supabase import supabase
from app.core.config import settings
from app.api.deps import get_current_user
from app.core.rate_limit import payment_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["payment"])
provider = PolarProvider()


class CheckoutRequest(BaseModel):
    plan_id: str


@router.post("/checkout")
async def create_checkout(
    request: Request,
    body: CheckoutRequest,
    user=Depends(get_current_user),
):
    payment_limiter(request)
    # 결제 미설정 시 503 (API 키 + 프리미엄 product ID 둘 다 필요)
    if not settings.polar_api_key or not settings.polar_premium_product_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="결제 시스템이 설정되지 않았습니다.")
    # 상품은 서버에서만 결정 — 클라이언트가 보낸 plan_id로 상품을 정하지 않는다(보안)
    try:
        url = await provider.create_checkout(user.id, settings.polar_premium_product_id)
        return {"checkout_url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="결제 세션 생성에 실패했습니다.")


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Polar 웹훅 — 서명 검증 후 구독 상태 업데이트"""
    # 결제 미설정 환경 보호: secret 없으면 웹훅 비활성
    if not settings.polar_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Payment webhook not configured")

    body_bytes = await request.body()

    # 서명 검증
    signature = request.headers.get("webhook-signature", "")
    secret    = settings.polar_webhook_secret.encode()
    expected  = hmac.new(secret, body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(f"sha256={expected}", signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    try:
        import json
        payload = json.loads(body_bytes)
        info    = await provider.verify_webhook(payload)
        if info.get("user_id"):
            # 구독 상태 갱신 (취소/만료 시 status=canceled로 프리미엄 회수)
            supabase.table("subscriptions").upsert({
                "user_id":               info["user_id"],
                "polar_subscription_id": info.get("subscription_id"),
                "status":                info.get("status", "active"),
                "updated_at":            "now()",
            }, on_conflict="user_id").execute()
            logger.info(f"Subscription updated: user={info['user_id']} status={info.get('status')} event={info.get('event_type')}")
    except Exception as e:
        logger.warning(f"Webhook processing error: {e}")
        # 웹훅은 항상 200 반환 (결제사 재시도 폭주 방지)

    return {"status": "ok"}


@router.get("/status")
async def get_status(user=Depends(get_current_user)):
    result = await provider.get_subscription_status(user.id)
    return result
