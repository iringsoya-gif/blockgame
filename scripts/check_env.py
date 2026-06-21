#!/usr/bin/env python3
"""
BlockQuest 환경변수 검증 도구
배포 전 .env 설정이 올바른지 점검합니다.

사용법:
    python scripts/check_env.py            # backend/.env 검증
    python scripts/check_env.py --frontend # frontend/.env 검증
"""
import os
import sys
import re
from pathlib import Path


GREEN = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"; RESET = "\033[0m"; BOLD = "\033[1m"


def load_env(path: Path) -> dict:
    """간단한 .env 파서 (python-dotenv 없이 동작)"""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def is_placeholder(val: str) -> bool:
    """예시값(placeholder)인지 판별"""
    if not val:
        return True
    markers = ["your-", "...", "your_", "eyJhbGci", "gsk_...", "sk-or-...",
               "AIza...", "polar_sk_live_...", "change-me", "example.com"]
    return any(m in val for m in markers)


# (변수명, 필수 여부, 검증 정규식 or None, 설명)
BACKEND_SPEC = [
    ("SUPABASE_URL",          True,  r"^https://.+\.supabase\.co/?$", "Supabase 프로젝트 URL"),
    ("SUPABASE_SERVICE_KEY",  True,  r"^eyJ.+",                       "Supabase service_role 키 (RLS 우회)"),
    ("GROQ_API_KEY",          False, r"^gsk_.+",                      "Groq API 키 (주 AI 제공자)"),
    ("GEMINI_API_KEY",        False, r"^AIza.+",                      "Gemini API 키 (폴백)"),
    ("OPENROUTER_API_KEY",    False, r"^sk-or-.+",                    "OpenRouter API 키 (폴백)"),
    ("POLAR_API_KEY",         False, None,                            "Polar 결제 키 (결제 사용 시)"),
    ("POLAR_WEBHOOK_SECRET",  False, None,                            "Polar 웹훅 시크릿 (결제 사용 시)"),
    ("FRONTEND_URL",          True,  r"^https?://.+",                 "프론트엔드 URL (CORS)"),
]

FRONTEND_SPEC = [
    ("VITE_SUPABASE_URL",      True, r"^https://.+\.supabase\.co/?$", "Supabase URL"),
    ("VITE_SUPABASE_ANON_KEY", True, r"^eyJ.+",                       "Supabase anon 키 (공개용)"),
    ("VITE_API_URL",           True, r"^https?://.+",                 "백엔드 API URL (예: https://api.example.com/api)"),
]


def check(spec, env, label):
    print(f"\n{BOLD}=== {label} 환경변수 검증 ==={RESET}")
    errors, warnings = 0, 0
    for name, required, pattern, desc in spec:
        val = env.get(name, "")
        if not val:
            if required:
                print(f"  {RED}✗ {name}{RESET} — 누락 (필수)  · {desc}")
                errors += 1
            else:
                print(f"  {YELLOW}○ {name}{RESET} — 미설정 (선택)  · {desc}")
            continue
        if is_placeholder(val):
            if required:
                print(f"  {RED}✗ {name}{RESET} — 예시값 그대로임  · {desc}")
                errors += 1
            else:
                print(f"  {YELLOW}○ {name}{RESET} — 예시값 (선택)  · {desc}")
                warnings += 1
            continue
        if pattern and not re.match(pattern, val):
            print(f"  {YELLOW}⚠ {name}{RESET} — 형식이 예상과 다름  · {desc}")
            warnings += 1
            continue
        print(f"  {GREEN}✓ {name}{RESET}  · {desc}")

    # AI 키 최소 1개 검증 (백엔드 전용)
    if label == "Backend":
        ai_keys = ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"]
        has_ai = any(env.get(k) and not is_placeholder(env.get(k, "")) for k in ai_keys)
        if not has_ai:
            print(f"  {RED}✗ AI 제공자{RESET} — Groq/Gemini/OpenRouter 중 최소 1개 필요!")
            errors += 1
        else:
            print(f"  {GREEN}✓ AI 제공자{RESET} — 최소 1개 설정됨")

        # 결제 짝 검증
        pk, ps = env.get("POLAR_API_KEY", ""), env.get("POLAR_WEBHOOK_SECRET", "")
        if bool(pk and not is_placeholder(pk)) != bool(ps and not is_placeholder(ps)):
            print(f"  {YELLOW}⚠ 결제{RESET} — POLAR_API_KEY와 POLAR_WEBHOOK_SECRET은 함께 설정해야 함")
            warnings += 1

    return errors, warnings


def main():
    is_frontend = "--frontend" in sys.argv
    root = Path(__file__).resolve().parent.parent
    if is_frontend:
        env_path = root / "frontend" / ".env"
        spec, label = FRONTEND_SPEC, "Frontend"
    else:
        env_path = root / "backend" / ".env"
        spec, label = BACKEND_SPEC, "Backend"

    print(f"{BOLD}BlockQuest 배포 전 환경변수 검증{RESET}")
    print(f"대상: {env_path}")

    if not env_path.exists():
        print(f"\n{RED}✗ {env_path} 파일이 없습니다.{RESET}")
        print(f"  {YELLOW}→ .env.example을 복사해서 .env를 만드세요:{RESET}")
        example = env_path.parent / ".env.example"
        print(f"     cp {example} {env_path}")
        sys.exit(1)

    env = load_env(env_path)
    errors, warnings = check(spec, env, label)

    print(f"\n{BOLD}=== 결과 ==={RESET}")
    if errors:
        print(f"{RED}✗ 오류 {errors}개 — 배포 전 반드시 수정하세요.{RESET}")
        if warnings:
            print(f"{YELLOW}⚠ 경고 {warnings}개{RESET}")
        sys.exit(1)
    elif warnings:
        print(f"{YELLOW}⚠ 경고 {warnings}개 — 확인 권장 (배포는 가능){RESET}")
        print(f"{GREEN}✓ 필수 항목은 모두 통과{RESET}")
    else:
        print(f"{GREEN}✓ 모든 검증 통과 — 배포 준비 완료!{RESET}")


if __name__ == "__main__":
    main()
