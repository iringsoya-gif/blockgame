from app.game.story_schema import BossConfig
from app.game.skill_registry import get_enemy_skills


class BossState:
    def __init__(self, config: BossConfig):
        self.config = config
        self.current_hp = config.hp
        self.max_hp = config.hp
        self.current_phase = 1
        self.hp_per_phase = config.hp // config.phase_count

    def take_damage(self, amount: int = 1) -> dict:
        """라인 클리어 시 보스 데미지. 페이즈 전환 여부 반환."""
        self.current_hp = max(0, self.current_hp - amount)
        phase_changed = False

        # 페이즈 전환 체크
        threshold = self.max_hp - (self.hp_per_phase * self.current_phase)
        if self.current_hp <= threshold and self.current_phase < self.config.phase_count:
            self.current_phase += 1
            phase_changed = True

        return {
            "hp": self.current_hp,
            "max_hp": self.max_hp,
            "phase": self.current_phase,
            "phase_count": self.config.phase_count,
            "phase_changed": phase_changed,
            "defeated": self.current_hp <= 0,
        }

    def get_phase_config(self) -> dict:
        """현재 페이즈에 따른 AI 파라미터 반환"""
        phase = self.current_phase
        base_diff = self.config.difficulty
        return {
            "difficulty": min(5, base_diff + phase - 1),
            "drop_speed_multiplier": 1.0 + (phase - 1) * 0.35,
            "skill_interval_multiplier": max(0.4, 1.0 - (phase - 1) * 0.25),
            # 페이즈가 높을수록 더 많은 스킬 해금
            "active_skills": self.config.skills[: min(len(self.config.skills), phase + 1)],
        }

    @property
    def is_defeated(self) -> bool:
        return self.current_hp <= 0
