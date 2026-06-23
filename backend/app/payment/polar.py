import httpx
from app.payment.base import PaymentProvider
from app.core.config import settings
from app.core.supabase import supabase


class PolarProvider(PaymentProvider):
    PRODUCTION_URL = "https://api.polar.sh"
    SANDBOX_URL    = "https://sandbox-api.polar.sh"

    def __init__(self):
        self.api_key = settings.polar_api_key
        self.BASE_URL = (
            self.SANDBOX_URL if settings.polar_server.lower() == "sandbox"
            else self.PRODUCTION_URL
        )
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def create_checkout(self, user_id: str, product_id: str) -> str:
        if not self.api_key:
            raise ValueError("Polar API 키가 설정되지 않았습니다.")

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 최신 Polar API: POST /v1/checkouts/ + products 배열(상품 ID 기반)
            res = await client.post(
                f"{self.BASE_URL}/v1/checkouts/",
                headers=self.headers,
                json={
                    "products": [product_id],
                    "metadata": {"user_id": str(user_id)},
                    "success_url": f"{settings.frontend_url}/profile?payment=success",
                },
            )
            if res.status_code in (404, 422):
                raise ValueError(
                    f"상품 ID '{product_id}'를 찾을 수 없거나 형식이 올바르지 않습니다. "
                    f"Polar 대시보드에서 Product ID를 확인하세요. (status {res.status_code})"
                )
            if res.status_code == 401:
                raise ValueError("Polar API 키가 유효하지 않습니다.")
            res.raise_for_status()
            data = res.json()
            url = data.get("url") or data.get("checkout_url")
            if not url:
                raise ValueError("결제 URL을 가져오지 못했습니다.")
            return url

    async def verify_webhook(self, payload: dict) -> dict:
        event_type = payload.get("type", "")
        data       = payload.get("data", {})
        status     = "active"

        if "canceled" in event_type or "revoked" in event_type:
            status = "canceled"
        elif "created" in event_type or "active" in event_type:
            status = "active"

        return {
            "user_id":         data.get("metadata", {}).get("user_id"),
            "subscription_id": data.get("id"),
            "status":          status,
            "event_type":      event_type,
        }

    async def get_subscription_status(self, user_id: str) -> dict:
        res = (
            supabase.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return {"status": res.data[0]["status"], "data": res.data[0]}
        return {"status": "none", "data": None}
