"""
구독 플랜 정의 및 접근 제어
Free / Premium 기능 분리
"""
from enum import Enum


class Plan(str, Enum):
    FREE    = "free"
    PREMIUM = "premium"


# ── 플랜별 기능 ────────────────────────────────────────────
PLAN_FEATURES = {
    Plan.FREE: {
        "stories":            ["default"],       # 망각의 탑만
        "classes":            ["warrior", "mage", "rogue"],
        "daily_challenge":    True,              # 챌린지는 무료
        "skill_tree_max_purchases": 3,           # 스킬 최대 3개
        "run_history_limit":  10,
        "save_slots":         1,
    },
    Plan.PREMIUM: {
        "stories":            ["default", "ruins", "abyss", "citadel", "vessel", "wuxia", "void"],  # 전체
        "classes":            ["warrior", "mage", "rogue", "paladin", "summoner", "guardian", "technician", "swordmaster"],
        "daily_challenge":    True,
        "skill_tree_max_purchases": 999,
        "run_history_limit":  100,
        "save_slots":         5,
        "badge":              "✦ PREMIUM",
    },
}

PREMIUM_PRICE_KRW = 9900   # 영구 구매 가격 (원)
PREMIUM_PRICE_USD = 7.99   # USD


def get_plan(subscription_status: str | None) -> Plan:
    if subscription_status == "active":
        return Plan.PREMIUM
    return Plan.FREE


def can_access_story(plan: Plan, story_id: str) -> bool:
    return story_id in PLAN_FEATURES[plan]["stories"]


def can_access_class(plan: Plan, class_id: str) -> bool:
    return class_id in PLAN_FEATURES[plan]["classes"]


def get_skill_purchase_limit(plan: Plan) -> int:
    return PLAN_FEATURES[plan]["skill_tree_max_purchases"]
