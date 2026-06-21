from abc import ABC, abstractmethod


class PaymentProvider(ABC):

    @abstractmethod
    async def create_checkout(self, user_id: str, plan_id: str) -> str:
        """결제 체크아웃 URL 반환"""

    @abstractmethod
    async def verify_webhook(self, payload: dict) -> dict:
        """웹훅 검증 후 구독 정보 반환"""

    @abstractmethod
    async def get_subscription_status(self, user_id: str) -> dict:
        """현재 구독 상태 반환"""
