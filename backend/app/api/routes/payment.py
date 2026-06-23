import base64
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


def verify_polar_signature(secret: str, body: bytes, headers) -> bool:
    """Polar(Standard Webhooks) 서명 검증.

    서명 대상 = "{webhook-id}.{webhook-timestamp}.{body}", HMAC-SHA256 → base64.
    헤더 webhook-signature 는 "v1,<base64> v1,<base64> ..." 형태(여러 개 가능).
    Polar secret 의 인코딩(raw vs base64)이 환경마다 달라 두 방식 모두 시도한다.
    """
    wh_id = headers.get("webhook-id", "")
    wh_ts = headers.get("webhook-timestamp", "")
    wh_sig = headers.get("webhook-signature", "")
    if not (wh_id and wh_ts and wh_sig):
        return False

    signed = f"{wh_id}.{wh_ts}.".encode() + body

    # 가능한 HMAC 키 후보: (1) raw secret 바이트, (2) base64 디코딩(whsec_ 접두 제거)
    keys = [secret.encode()]
    s = secret[len("whsec_"):] if secret.startswith("whsec_") else secret
    try:
        keys.append(base64.b64decode(s))
    except Exception:
        pass

    # 헤더에서 실제 서명 값만 추출 ("v1,<sig>" → "<sig>")
    provided = [p.split(",", 1)[1] if "," in p else p for p in wh_sig.split()]

    for key in keys:
        expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
        for sig in provided:
            if hmac.compare_digest(sig, expected):
                return True
    return False


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

    # 서명 검증 (Polar = Standard Webhooks 규격)
    if not verify_polar_signature(settings.polar_webhook_secret, body_bytes, request.headers):
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
