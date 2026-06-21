"""
AI 제공자 — 2026 무료 한도 기준
우선순위: Groq 8B (하루 14,400) → Groq 70B (중요 장면) → Gemini 2.5 Flash-Lite (폴백)
"""
import json
import logging
import time
import httpx
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ProviderStats:
    """요청 통계 — 한도 초과 감지용"""
    requests_today: int = 0
    requests_this_minute: int = 0
    minute_start: float = field(default_factory=time.monotonic)
    day_start: float = field(default_factory=time.time)

    def record(self) -> None:
        now = time.monotonic()
        today = time.time()

        # 분 리셋
        if now - self.minute_start > 60:
            self.requests_this_minute = 0
            self.minute_start = now

        # 일 리셋 (UTC 자정 근사)
        if today - self.day_start > 86400:
            self.requests_today = 0
            self.day_start = today

        self.requests_this_minute += 1
        self.requests_today += 1

class AIProvider(ABC):
    name: str
    rpm: int = 10
    rpd: int = 500

    def __init__(self):
        self._stats = ProviderStats()

    @abstractmethod
    async def _do_request(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
        temperature: float,
        max_tokens: int,
    ) -> str: ...

    async def chat_complete(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
        temperature: float = 0.82,
        max_tokens: int = 1100,
    ) -> str:
        self._stats.record()
        return await self._do_request(system_prompt, history, user_message, temperature, max_tokens)

    def within_limits(self) -> bool:
        stats = self._stats
        now   = time.monotonic()
        today = time.time()

        # 윈도우 경과 시 카운터는 0으로 간주 (record에서 리셋되기 전이라도)
        minute_count = 0 if (now - stats.minute_start >= 60) else stats.requests_this_minute
        day_count    = 0 if (today - stats.day_start >= 86400) else stats.requests_today

        if minute_count >= self.rpm - 2:
            return False
        if day_count >= self.rpd - 10:
            return False
        return True


# ── Groq 8B — 메인 (하루 14,400회) ──────────────────────
class GroqFastProvider(AIProvider):
    name = "groq-8b"
    rpm  = 28   # 30에서 여유분
    rpd  = 14000

    BASE   = "https://api.groq.com/openai/v1"
    MODEL  = "llama-3.1-8b-instant"

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key

    async def _do_request(self, system_prompt, history, user_message, temperature, max_tokens) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        messages += history[-14:]   # 최근 14턴
        messages.append({"role": "user", "content": user_message})

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{self.BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model":           self.MODEL,
                    "messages":        messages,
                    "temperature":     temperature,
                    "max_tokens":      max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]


# ── Groq 70B — 보스/엔딩 등 중요 장면 전용 (하루 1,000회) ─
class GroqSmartProvider(AIProvider):
    name = "groq-70b"
    rpm  = 28
    rpd  = 900   # 1000에서 여유분

    BASE  = "https://api.groq.com/openai/v1"
    MODEL = "llama-3.3-70b-versatile"

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key

    async def _do_request(self, system_prompt, history, user_message, temperature, max_tokens) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        messages += history[-10:]   # 70B는 히스토리 줄임
        messages.append({"role": "user", "content": user_message})

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model":           self.MODEL,
                    "messages":        messages,
                    "temperature":     temperature,
                    "max_tokens":      max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]


# ── Gemini 2.5 Flash-Lite — 폴백 (하루 1,000회, 분당 15회) ─
class GeminiFlashLiteProvider(AIProvider):
    name = "gemini-flash-lite"
    rpm  = 13   # 15에서 여유분
    rpd  = 950

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self._model  = None

    def _get_model(self, system_prompt: str):
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        return genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.82,
                max_output_tokens=1100,
                response_mime_type="application/json",
            ),
        )

    async def _do_request(self, system_prompt, history, user_message, temperature, max_tokens) -> str:
        import asyncio
        model = self._get_model(system_prompt)

        # Gemini history 형식 변환
        gemini_history = []
        for h in history[-12:]:
            role = "user" if h["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [h["content"]]})

        def _sync():
            chat = model.start_chat(history=gemini_history)
            return chat.send_message(user_message).text

        # 25초 타임아웃 (executor hang 방지)
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _sync),
            timeout=25.0,
        )


# ── Gemini 2.5 Flash — 최종 폴백 (하루 250회) ────────────
class GeminiFlashProvider(AIProvider):
    name = "gemini-flash"
    rpm  = 9
    rpd  = 230

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key

    async def _do_request(self, system_prompt, history, user_message, temperature, max_tokens) -> str:
        import asyncio
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                response_mime_type="application/json",
            ),
        )
        gemini_history = []
        for h in history[-10:]:
            role = "user" if h["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [h["content"]]})

        def _sync():
            chat = model.start_chat(history=gemini_history)
            return chat.send_message(user_message).text

        # 25초 타임아웃 (executor hang 방지)
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _sync),
            timeout=25.0,
        )


# ── 팩토리 ────────────────────────────────────────────────
def create_provider_chain(settings) -> list[AIProvider]:
    """
    우선순위 제공자 체인 생성
    Groq 8B → Groq 70B → Gemini Flash-Lite → Gemini Flash
    (중요 장면에서는 별도 로직으로 70B 선택 가능)
    """
    chain: list[AIProvider] = []
    groq_key = getattr(settings, "groq_api_key", "")
    gem_key  = getattr(settings, "gemini_api_key", "")

    if groq_key:
        chain.append(GroqFastProvider(groq_key))    # 8B 메인
        chain.append(GroqSmartProvider(groq_key))   # 70B 중요 장면용도 폴백으로 포함

    if gem_key:
        chain.append(GeminiFlashLiteProvider(gem_key))
        chain.append(GeminiFlashProvider(gem_key))

    if not chain:
        logger.error("No AI providers configured!")
    else:
        logger.info(f"AI providers: {[p.name for p in chain]}")

    return chain
