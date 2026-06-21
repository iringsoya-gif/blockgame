import httpx
from app.payment.base import PaymentProvider
from app.core.config import settings
from app.core.supabase import supabase


class PolarProvider(PaymentProvider):
    BASE_URL = "https://api.polar.sh"

    def __init__(self):
        self.api_key = settings.polar_api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def create_checkout(self, user_id: str, plan_id: str) -> str:
        if not self.api_key:
            raise ValueError("Polar API 키가 설정되지 않았습니다.")

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.BASE_URL}/v1/checkouts/custom/",
                headers=self.headers,
                json={
                    "product_price_id": plan_id,
                    "allow_discount_codes": True,
                    "metadata": {"user_id": str(user_id)},
                    "success_url": f"{settings.frontend_url}/profile?payment=success",
                },
            )
            if res.status_code == 404:
                raise ValueError(f"상품 ID '{plan_id}'를 찾을 수 없습니다. Polar 대시보드에서 확인하세요.")
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
