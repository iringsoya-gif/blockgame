import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import gm, payment, game, runs, challenge, subscription

logging.basicConfig(level=logging.INFO if settings.debug else logging.WARNING)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BlockQuest API starting up")
    yield
    logger.info("BlockQuest API shutting down")


app = FastAPI(
    title="BlockQuest API",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── 미들웨어 ────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)
# ── CORS origins: 프로덕션은 frontend_url만, 개발(DEBUG)에선 localhost 추가 ──
_origins = {settings.frontend_url}
if settings.debug:
    _origins |= {"http://localhost:5173", "http://localhost:3000"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def cache_middleware(request: Request, call_next):
    response = await call_next(request)
    # 정적 가이드 목록은 캐시 (5분)
    if request.url.path == "/api/gm/guides":
        response.headers["Cache-Control"] = "public, max-age=300"
    # 챌린지 랭킹은 1분 캐시
    elif request.url.path == "/api/challenge/leaderboard":
        response.headers["Cache-Control"] = "public, max-age=60"
    else:
        response.headers["Cache-Control"] = "no-store"
    return response

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = round((time.perf_counter() - start) * 1000)
    response.headers["X-Response-Time"] = f"{ms}ms"
    if settings.debug:
        logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    return response

# ── 에러 핸들러 ──────────────────────────────────────────────
@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "요청한 리소스를 찾을 수 없습니다."})

@app.exception_handler(500)
async def internal_error(request: Request, exc: Exception):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."},
    )

# ── 라우터 ──────────────────────────────────────────────────
app.include_router(gm.router,      prefix="/api")
app.include_router(payment.router, prefix="/api")
app.include_router(game.router,    prefix="/api")
app.include_router(runs.router,     prefix="/api")
app.include_router(challenge.router,     prefix="/api")
app.include_router(subscription.router, prefix="/api")

# ── 헬스 ────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    import time
    from app.core.supabase import supabase
    db_ok = False
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "version": settings.app_version,
        "db":      "connected" if db_ok else "error",
        "timestamp": int(time.time()),
    }

@app.get("/warmup", tags=["system"])
async def warmup():
    return {"warmed": True}
