import sys
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Supabase
    supabase_url:         str
    supabase_service_key: str

    # AI 제공자 (하나 이상 필요)
    groq_api_key:         str = ""   # 주 제공자 — 무료 분당 30req
    openrouter_api_key:   str = ""   # 2차 폴백 — 무료 모델
    gemini_api_key:       str = ""   # 최종 폴백 — 분당 15req

    # 결제 (선택)
    polar_api_key:         str = ""
    polar_webhook_secret:  str = ""
    polar_premium_product_id: str = ""         # Polar 대시보드의 프리미엄 상품 Product ID (서버에서만 상품 결정)
    polar_server:          str = "production"  # "production" 또는 "sandbox" (테스트용)
    lemonsqueezy_api_key:  str = ""   # 대안 결제
    lemonsqueezy_webhook_secret: str = ""

    # App
    frontend_url:  str  = "http://localhost:5173"
    debug:         bool = False
    app_version:   str  = "0.3.0"

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("SUPABASE_URL must start with https://")
        return v

    @field_validator("groq_api_key")
    @classmethod
    def warn_if_no_ai(cls, v: str) -> str:
        return v  # 다른 키가 있을 수 있으므로 여기서 체크 안 함

    def has_any_ai(self) -> bool:
        return bool(self.groq_api_key or self.openrouter_api_key or self.gemini_api_key)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()

if not settings.has_any_ai():
    print("⚠️  AI API 키가 없습니다. GROQ_API_KEY 또는 GEMINI_API_KEY를 설정하세요.", file=sys.stderr)
