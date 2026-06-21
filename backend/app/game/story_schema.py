from pydantic import BaseModel
from typing import Union


class EndingCondition(BaseModel):
    type: str
    value: Union[str, int]


class Ending(BaseModel):
    id: str
    title: str
    condition: EndingCondition
    closing_text: str


class BossConfig(BaseModel):
    id: str
    name: str
    trigger_condition: str
    difficulty: int
    initial_garbage: int
    hp: int
    phase_count: int
    skills: list[str]
    intro_text: str
    field_events: list[str] = []


class NPC(BaseModel):
    name: str
    role: str
    personality: str
    dialogue_hints: list[str] = []
    relation_impact: str = ""


class StoryGuide(BaseModel):
    title: str
    world_setting: str
    opening: str
    tone: str
    key_npcs: list[NPC]
    bosses: list[BossConfig]
    endings: list[Ending]
    forbidden_topics: list[str]
    mid_events: list[str] = []  # 중간 이벤트 시나리오 힌트 (GM 참고용, 선택)
