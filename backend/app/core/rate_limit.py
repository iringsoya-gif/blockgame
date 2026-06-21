"""
인메모리 레이트 리미터 (슬라이딩 윈도우)
오래된 항목 자동 정리 포함

[확장성 주의] 인메모리 방식이므로 단일 서버 인스턴스에서만 정확합니다.
여러 인스턴스로 수평 확장 시에는 Redis 기반 분산 리미터로 교체해야 합니다
(각 인스턴스가 별도 카운터를 가지면 실질 한도가 인스턴스 수만큼 늘어남).
현재 Railway 단일 인스턴스 배포 기준으로는 충분합니다.
"""
import time
import threading
from collections import defaultdict
from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, calls: int, period: float):
        self.calls   = calls
        self.period  = period
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock   = threading.Lock()
        self._last_cleanup = time.monotonic()
        self._cleanup_interval = 300  # 5분마다 정리

    def _cleanup(self, now: float) -> None:
        """오래된 항목 정리 — 메모리 누수 방지"""
        if now - self._last_cleanup < self._cleanup_interval:
            return
        cutoff = now - self.period
        keys_to_delete = []
        for key, times in self._store.items():
            fresh = [t for t in times if t > cutoff]
            if fresh:
                self._store[key] = fresh
            else:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._store[key]
        self._last_cleanup = now

    def check(self, key: str) -> None:
        now = time.monotonic()
        window_start = now - self.period

        with self._lock:
            self._cleanup(now)
            times = [t for t in self._store[key] if t > window_start]
            if len(times) >= self.calls:
                retry_after = int(times[0] + self.period - now) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"요청이 너무 많습니다. {retry_after}초 후 다시 시도해주세요.",
                    headers={"Retry-After": str(retry_after)},
                )
            times.append(now)
            self._store[key] = times

    def check_user(self, user_id: str) -> None:
        """유저 ID 기반 제한 (로그인 유저용)"""
        self.check(f"user:{user_id}")

    def __call__(self, request: Request) -> None:
        # 인증된 유저면 토큰 전체 해시 기반, 아니면 IP 기반
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            import hashlib
            # 토큰 전체를 해시해 유저 구분 정확도 확보 (앞부분만 쓰면 충돌)
            token_hash = hashlib.sha256(auth[7:].encode()).hexdigest()[:16]
            self.check(f"token:{token_hash}")
        else:
            ip = request.headers.get("X-Forwarded-For", "")
            ip = ip.split(",")[0].strip() if ip else (request.client.host if request.client else "unknown")
            self.check(f"ip:{ip}")


# 라우터별 리미터
gm_limiter      = RateLimiter(calls=25,  period=60)   # GM: 분당 25회
payment_limiter = RateLimiter(calls=5,   period=60)   # 결제: 분당 5회
general_limiter = RateLimiter(calls=120, period=60)   # 일반: 분당 120회
challenge_limiter = RateLimiter(calls=10, period=3600) # 챌린지: 시간당 10회
