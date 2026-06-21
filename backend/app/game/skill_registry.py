from dataclasses import dataclass


@dataclass
class Skill:
    id: str
    name: str
    description: str
    cost: int        # 게이지 소모
    cooldown: float  # 초
    target: str      # "self" | "enemy"
    effect_type: str # 프론트엔드가 처리할 효과 키


SKILL_REGISTRY: dict[str, Skill] = {
    # ── 플레이어 전용 ──────────────────────────────────────
    "clear_line": Skill(
        id="clear_line", name="라인 소거",
        description="내 보드 맨 아래 줄 제거",
        cost=30, cooldown=0,
        target="self", effect_type="clear_bottom_line",
    ),
    "swap_block": Skill(
        id="swap_block", name="블록 교체",
        description="현재 블록을 다음 블록과 교체",
        cost=20, cooldown=5,
        target="self", effect_type="swap_current_piece",
    ),
    "preview_extend": Skill(
        id="preview_extend", name="예지",
        description="다음 블록 미리보기 +2칸 (10초)",
        cost=25, cooldown=15,
        target="self", effect_type="extend_preview",
    ),
    "time_slow": Skill(
        id="time_slow", name="시간 늦추기",
        description="내 낙하 속도 50% 감소 (8초)",
        cost=40, cooldown=20,
        target="self", effect_type="slow_self_drop",
    ),
    "shield": Skill(
        id="shield", name="보호막",
        description="다음 가비지 1회 무효화",
        cost=35, cooldown=15,
        target="self", effect_type="activate_shield",
    ),
    # ── 무협 전용 (검객) ───────────────────────────────────
    "sword_dance": Skill(
        id="sword_dance", name="검기난무(劍氣亂舞)",
        description="검기를 흩뿌려 적에게 가비지 3줄 + 게이지 일부 회복",
        cost=45, cooldown=12,
        target="enemy", effect_type="sword_dance",
    ),
    "mind_blade": Skill(
        id="mind_blade", name="심검(心劍)",
        description="마음의 검으로 내 보드 맨 아래 2줄을 베어낸다",
        cost=50, cooldown=10,
        target="self", effect_type="clear_two_lines",
    ),
    # ── 클래스 고유 ────────────────────────────────────────
    "arcane_blast": Skill(
        id="arcane_blast", name="비전 폭발",
        description="마력을 터뜨려 적에게 가비지 2줄 + 내 보드 맨 아래 1줄 정리",
        cost=48, cooldown=11,
        target="enemy", effect_type="arcane_blast",
    ),
    "summon_aid": Skill(
        id="summon_aid", name="소환수 지원",
        description="소환수가 다음 3개 블록을 직선(I) 블록으로 바꿔준다",
        cost=42, cooldown=14,
        target="self", effect_type="summon_aid",
    ),

    # ── 적 AI 전용 ─────────────────────────────────────────
    "add_garbage": Skill(
        id="add_garbage", name="방해 블록",
        description="상대 보드 하단에 가비지 줄 2개 추가",
        cost=30, cooldown=8,
        target="enemy", effect_type="add_garbage_lines",
    ),
    "slow_player": Skill(
        id="slow_player", name="중력 강화",
        description="상대 낙하 속도 2배 (6초)",
        cost=40, cooldown=15,
        target="enemy", effect_type="speed_up_enemy_drop",
    ),
    "scramble_board": Skill(
        id="scramble_board", name="혼돈",
        description="상대 보드 블록 색상 무작위 변경 (시각 방해)",
        cost=50, cooldown=25,
        target="enemy", effect_type="scramble_colors",
    ),
    "block_skills": Skill(
        id="block_skills", name="봉인",
        description="상대 스킬 사용 불가 (5초)",
        cost=60, cooldown=30,
        target="enemy", effect_type="block_skill_use",
    ),
    "mirror_board": Skill(
        id="mirror_board", name="반전",
        description="상대 보드 좌우 반전",
        cost=45, cooldown=20,
        target="enemy", effect_type="mirror_board",
    ),
}


def get_player_skills(difficulty: int) -> list[str]:
    """난이도별 플레이어 스킬 구성"""
    base = ["clear_line", "swap_block"]
    if difficulty >= 3:
        base.append("shield")
    if difficulty >= 4:
        base.append("time_slow")
    return base


# 플레이어가 사용 가능한 스킬 (프론트 SKILL_META와 일치해야 함)
# self 타깃 전부 + 공격용(add_garbage, sword_dance, arcane_blast)
PLAYER_USABLE_SKILLS = {
    sid for sid, sk in SKILL_REGISTRY.items() if sk.target == "self"
} | {"add_garbage", "sword_dance", "arcane_blast"}


def get_enemy_skills(difficulty: int) -> list[str]:
    """난이도별 적 스킬 구성"""
    if difficulty <= 1:
        return ["add_garbage"]
    elif difficulty <= 2:
        return ["add_garbage", "slow_player"]
    elif difficulty <= 3:
        return ["add_garbage", "slow_player", "scramble_board"]
    elif difficulty <= 4:
        return ["add_garbage", "slow_player", "scramble_board", "mirror_board"]
    else:
        return ["add_garbage", "slow_player", "scramble_board", "block_skills", "mirror_board"]
