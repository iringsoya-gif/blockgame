"""
GM 에이전트 — 멀티 AI 제공자 지원
Groq (주) → OpenRouter → Gemini 순으로 폴백
"""
import asyncio
import json
import logging
import re
from app.core.config import settings
from app.game.story_schema import StoryGuide
from app.game.skill_registry import SKILL_REGISTRY, get_enemy_skills, PLAYER_USABLE_SKILLS
from app.game.class_persona import get_class_directive
from app.game.ai_provider import create_provider_chain

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 20
MAX_RETRIES       = 2


class GMAgent:
    def __init__(self, guide: StoryGuide):
        self.guide          = guide
        self.battle_count   = 0
        self.chapter        = 1
        self.story_flags: set[str]         = set()
        self.npc_relations: dict[str, int] = {}
        self._pending_battle = False

        # 대화 히스토리 (OpenAI 포맷으로 통일)
        self._history: list[dict] = []
        self._guide_id = "default"
        self._last_class = ""
        self._lock = asyncio.Lock()  # 동시 요청 직렬화 (히스토리 보호)
        self._system_prompt = self._build_system_prompt()

        # AI 제공자 체인
        self._providers = create_provider_chain(settings)
        if not self._providers:
            raise RuntimeError("AI API 키가 없습니다. .env 파일을 확인하세요.")

        active = [p.name for p in self._providers]
        logger.info(f"GM initialized with providers: {active}")

    # ── 시스템 프롬프트 ────────────────────────────────
    def _build_system_prompt(self) -> str:
        endings_desc = "\n".join(
            f"- [{e.id}] {e.title}: {e.closing_text}"
            for e in self.guide.endings
        )
        bosses_desc = "\n".join(
            f"- [{b.id}] {b.name}: {b.intro_text}"
            f" (\ub4f1\uc7a5\uc870\uac74={b.trigger_condition}, HP={b.hp}, \ud398\uc774\uc988={b.phase_count})"
            for b in self.guide.bosses
        )
        npcs_desc = "\n".join(
            f"- {n.name}: {n.role} | {n.personality} | \uad00\uacc4\ud6a8\uacfc={n.relation_impact}"
            for n in self.guide.key_npcs
        )
        forbidden = ", ".join(self.guide.forbidden_topics)
        valid_skills = list(SKILL_REGISTRY.keys())
        tone_guide = self._tone_guide(self.guide.tone)
        mid_events_section = ""
        if getattr(self.guide, "mid_events", None):
            _evs = "\n".join(f"- {ev}" for ev in self.guide.mid_events)
            mid_events_section = (
                "## 중간 이벤트 (참고 — 자연스럽게 활용)\n"
                + _evs
                + "\n- 위 이벤트를 순서대로 강요하지 말고, 흐름에 맞게 자연스럽게 녹여내라"
                + "\n- 각 이벤트의 field_events 권장을 참고하되, 반드시 따를 필요는 없다\n"
            )

        return f"""\ub2f9\uc2e0\uc740 \ud14d\uc2a4\ud2b8 TRPG\uc758 \uac8c\uc784 \ub9c8\uc2a4\ud130(GM)\uc785\ub2c8\ub2e4. \ud50c\ub808\uc774\uc5b4\ub97c \ubab0\uc785\uc2dc\ud0a4\ub294 \ud55c\uad6d\uc5b4 \uc11c\uc0ac\ub97c \ub9cc\ub4e4\ub418, \ud56d\uc0c1 \uc720\ud6a8\ud55c JSON \uac1d\uccb4\ub9cc \ucd9c\ub825\ud558\uc138\uc694. \ub9c8\ud06c\ub2e4\uc6b4, \ucf54\ub4dc\ube14\ub85d, \uc124\uba85 \ubb38\uad6c \uc808\ub300 \uae08\uc9c0.

## \uc138\uacc4\uad00
{self.guide.world_setting}

## \uc2dc\uc791 \uc0c1\ud669
{self.guide.opening}

## \ubd84\uc704\uae30\uc640 \ubb38\uccb4
{tone_guide}

## \ubb18\uc0ac \uc6d0\uce59 (\uc911\uc694)
- \uc2dc\uac01\u00b7\uccad\uac01\u00b7\ucd09\uac01 \uc911 \ucd5c\uc18c \ud558\ub098\uc758 \uac10\uac01 \ub514\ud14c\uc77c\uc744 \ub9e4 \uc7a5\uba74\uc5d0 \ub123\uc5b4 \uc0dd\uc0dd\ud558\uac8c
- "\ub2f9\uc2e0\uc740 ~\ud55c\ub2e4"\ubcf4\ub2e4 \uc7a5\uba74\uc744 \ubcf4\uc5ec\uc8fc\ub294 \ubb18\uc0ac \uc6b0\uc120 (telling\ubcf4\ub2e4 showing)
- \uac19\uc740 \ud45c\ud604\u00b7\ubb38\uc7a5 \uad6c\uc870 \ubc18\ubcf5 \uae08\uc9c0. \ub9e4 \ud134 \uc0c8\ub85c\uc6b4 \uc5b4\ud718\uc640 \ub9ac\ub4ec
- story\ub294 2~4\ubb38\uc7a5. \ub108\ubb34 \uae38\uac8c \ub298\uc5b4\ub193\uc9c0 \ub9d0\uace0 \uc555\ucd95\uc801\uc73c\ub85c
- \ud50c\ub808\uc774\uc5b4\uc758 \uc9c1\uc804 \ud589\ub3d9\uc744 \ubc18\ub4dc\uc2dc \ubc18\uc601\ud574 \uc778\uacfc\uac00 \ub290\uaef4\uc9c0\uac8c
- \ud074\ub9ac\uc168("\uc6b4\uba85\uc774 \ub2f9\uc2e0\uc744 \uae30\ub2e4\ub9b0\ub2e4" \ub958) \ud53c\ud558\uace0 \uad6c\uccb4\uc801 \uc0c1\ud669 \uc81c\uc2dc

## \ud398\uc774\uc2f1
- \uc804\ud22c\ub294 3~4\ud134\uc5d0 1\ubc88 \uaf34. \ub9e4 \ud134 \uc804\ud22c \uae08\uc9c0. \ud0d0\uc0c9\u00b7\ub300\ud654\u00b7\ubc1c\uacac\u00b7\uc120\ud0dd\uc774 \uc8fc\uac00 \ub418\ub3c4\ub85d
- \uae34\uc7a5\uacfc \uc774\uc644\uc744 \ubc88\uac08\uc544: \uc704\ud5d8\ud55c \uc7a5\uba74 \ub4a4\uc5d4 \ud55c\uc228 \ub3cc\ub9b4 \uc5ec\uc9c0\ub97c, \ud3c9\uc628 \ub4a4\uc5e3 \ubcf5\uc120\uc744
- \uc804\ud22c \uc9c1\uc804\uc5d4 \ubc18\ub4dc\uc2dc \uae34\uc7a5\uc744 \uace0\uc870\uc2dc\ud0a4\ub294 story\ub85c \ube4c\ub4dc\uc5c5

## \uc120\ud0dd\uc9c0 \uc124\uacc4
- 2~3\uac1c, \uc11c\ub85c \uba85\ud655\ud788 \ub2e4\ub978 \ubc29\ud5a5(\uacf5\uaca9\uc801/\uc2e0\uc911\ud55c/\ud0d0\uc0c9\uc801 \ub4f1)
- \uac01 \uc120\ud0dd\uc774 \ub2e4\ub978 \uacb0\uacfc\ub85c \uc774\uc5b4\uc9c8 \uac83 \uac19\uc740 \uae30\ub300\uac10\uc744 \uc8fc\ub3c4\ub85d
- "\uacc4\uc18d\ud55c\ub2e4" \uac19\uc740 \ubb34\uc758\ubbf8\ud55c \uc120\ud0dd\uc9c0 \uae08\uc9c0

## NPC \ud65c\uc6a9
{npcs_desc}
- NPC\ub294 \uace0\uc720\ud55c \ub9d0\ud22c\uc640 \uc131\uaca9\uc744 \uc77c\uad00\ub418\uac8c \uc720\uc9c0
- \ud50c\ub808\uc774\uc5b4\uc640\uc758 \uad00\uacc4(relation)\uc5d0 \ub530\ub77c \ud0dc\ub3c4\uac00 \ubcc0\ud558\ub3c4\ub85d
- relation_changes\ub85c \ud638\uac10/\uc801\ub300\ub97c \uc790\uc5f0\uc2a4\ub7fd\uac8c \ubc18\uc601

## \ud074\ub798\uc2a4 \ubc18\uc601
- \ucef4\ud14d\uc2a4\ud2b8\uc758 [\ud074\ub798\uc2a4\uc9c0\uce68]\uc774 \uc788\uc73c\uba74, \ud50c\ub808\uc774\uc5b4 \ud074\ub798\uc2a4\uc758 \uc815\uccb4\uc131\uc744 story\uc640 NPC \ubc18\uc751\uc5d0 \ub179\uc5ec\ub0b4\ub77c
- \uac19\uc740 \uc0c1\ud669\uc774\ub77c\ub3c4 \ud074\ub798\uc2a4\uc5d0 \ub530\ub77c \ubb18\uc0ac\uc640 \uc120\ud0dd\uc9c0\uc758 \uacb0\uc774 \ub2ec\ub77c\uc838\uc57c \ud55c\ub2e4 (\uc608: \uae30\uc0ac\ub294 \uba85\uc608\ub97c, \ub3c4\uc801\uc740 \uc774\ub4dd\uc744)
- \ub2e8, \ud074\ub798\uc2a4 \uc124\uc815\uc744 \uc5b5\uc9c0\ub85c \ub04c\uc5b4\ub0b4\uc9c0 \ub9d0\uace0 \uc790\uc5f0\uc2a4\ub7fd\uac8c

## \ubcf4\uc2a4 (\uc870\uac74 \ucda9\uc871 \uc2dc \ub4f1\uc7a5)
{bosses_desc}
- \ubcf4\uc2a4 \ub4f1\uc7a5\uc740 \uc11c\uc0ac\uc801 \ud074\ub77c\uc774\ub9e5\uc2a4. \ucda9\ubd84\ud55c \ube4c\ub4dc\uc5c5 \ud6c4 \ub4f1\uc7a5\uc2dc\ud0ac \uac83
- \ubcf4\uc2a4\uc758 intro_text \ubd84\uc704\uae30\ub97c \uc0b4\ub824 \uc704\uc555\uac10 \uc788\uac8c \ubb18\uc0ac

## \uc5d4\ub529
{endings_desc}
- \uc5d4\ub529\uc740 \ud50c\ub808\uc774\uc5b4\uc758 \uc120\ud0dd\uacfc \ub204\uc801\ub41c flag/relation\uc758 \uacb0\uacfc\ub85c \ub3c4\ub2ec
- \uac11\uc791\uc2a4\ub7fd\uc9c0 \uc54a\uac8c, \uadf8\ub3d9\uc548\uc758 \uc5ec\uc815\uc744 \ub9c8\ubb34\ub9ac\ud558\ub294 \ubb34\uac8c\uac10 \uc788\uac8c

## \ub09c\uc774\ub3c4 \uace1\uc120
- \ucd08\ubc18 \uc804\ud22c difficulty 2~3, \ud6c4\ubc18\u00b7\ubcf4\uc2a4 4~5\ub85c \uc0c1\uc2b9
- initial_garbage\ub294 0~2 \uc704\uc8fc, \ubcf4\uc2a4\uc5d0\uc11c\ub9cc 2~3

## \uae08\uc9c0 \uc8fc\uc81c: {forbidden}

## \uc0ac\uc6a9 \uac00\ub2a5\ud55c \uc2a4\ud0ac ID (battle\uc5d0\ub9cc \uc0ac\uc6a9)
{valid_skills}

## \ud544\ub4dc \uc774\ubca4\ud2b8 ID (battle.field_events\uc5d0\ub9cc \uc0ac\uc6a9, \ucd5c\ub300 2\uac1c)
bonus_block, gauge_burst, slow_gravity, darkness, heavy_gravity, earthquake, random_rotation, double_score, narrow_board

## \uc751\ub2f5 JSON (\ubc18\ub4dc\uc2dc \uc774 \ud615\uc2dd\ub9cc)

\uc804\ud22c \uc5c6\uc74c:
{{"story":"\ubb18\uc0ac","choices":["\uc120\ud0dd1","\uc120\ud0dd2"],"battle":null,"flags":[],"relation_changes":{{}},"ending":null}}

\uc77c\ubc18 \uc804\ud22c:
{{"story":"\ub3c4\uc785","choices":[],"battle":{{"type":"normal","goal":"versus","enemy_name":"\uc801 \uc774\ub984","difficulty":2,"initial_garbage":0,"field_events":[],"enemy_skills":["add_garbage"],"player_skills":["clear_line","swap_block"],"win_story":"\uc2b9\ub9ac","lose_story":"\ud328\ubc30"}},"flags":[],"relation_changes":{{}},"ending":null}}

\ubcf4\uc2a4 \uc804\ud22c:
{{"story":"\ub4f1\uc7a5","choices":[],"battle":{{"type":"boss","goal":"versus","boss_id":"boss_id","enemy_name":"\ubcf4\uc2a4\uba85","difficulty":4,"initial_garbage":2,"boss_hp":6,"phase_count":2,"field_events":["earthquake"],"enemy_skills":["add_garbage","slow_player"],"player_skills":["clear_line","swap_block","shield"],"win_story":"\uc2b9\ub9ac","lose_story":"\ud328\ubc30"}},"flags":[],"relation_changes":{{}},"ending":null}}

\uc5d4\ub529:
{{"story":"\ub9c8\uc9c0\ub9c9","choices":[],"battle":null,"flags":[],"relation_changes":{{}},"ending":"\uc5d4\ub529ID"}}

\uaddc\uce59:
- choices: \uc804\ud22c/\uc5d4\ub529 \uc5c6\uc744 \ub54c\ub9cc 2~3\uac1c, \ub098\uba38\uc9c0 []
- relation_changes: {{"NPC\uc774\ub984": \uc815\uc218}} \ud615\uc2dd\ub9cc (-3~3)
- goal: versus / survival / line_race / score \uc911 \ud558\ub098
- difficulty: 1~5 \uc815\uc218
- win_story/lose_story: 전투 결과를 서사로 이어줄 1~2문장

## 좋은 응답 예시 (이 수준의 묘사와 형식을 따르세요)

탐색 장면 예시:
{{"story":"부서진 석상들 사이로 차가운 바람이 스며든다. 바닥에 떨어진 낙엽이 희미하게 빛나며, 그 끝에 반짝이는 금속 문이 보인다. 문 너머에서 미약한 신음이 새어나온다.","choices":["금속 문을 연다","낙엽을 주워 조사한다","신음의 정체를 살핀다"],"battle":null,"flags":["발견_금속문"],"relation_changes":{{}},"ending":null}}

전투 전환 예시:
{{"story":"문을 여는 순간, 그림자 속에서 붉은 눈이 번뜩인다. 녹슨 갑옷을 걸친 수호자가 부러진 검을 천천히 들어올린다.","choices":[],"battle":{{"type":"normal","goal":"versus","enemy_name":"녹슨 수호자","difficulty":2,"initial_garbage":0,"field_events":[],"enemy_skills":["add_garbage"],"player_skills":["clear_line","swap_block"],"win_story":"수호자가 먼지로 부서진다. 길이 열렸다.","lose_story":"수호자의 검이 당신을 밀쳐낸다."}},"flags":[],"relation_changes":{{}},"ending":null}}"""

    @staticmethod
    def _tone_guide(tone: str) -> str:
        """\uc2a4\ud1a0\ub9ac tone\uc5d0 \ub9de\ub294 \uad6c\uccb4\uc801 \ubb38\uccb4 \uc9c0\uce68"""
        guides = {
            "dark": (
                "\uc5b4\ub461\uace0 \ubd88\uae38\ud55c \ub2e4\ud06c \ud310\ud0c0\uc9c0. \uadf8\ub9bc\uc790, \uce68\ubb35, \ubd80\ud328\uc758 \uc774\ubbf8\uc9c0\ub97c \ud65c\uc6a9\ud558\uc138\uc694. "
                "\ud76c\ub9dd\uc740 \ud76c\ubbf8\ud558\uac8c\ub9cc \ube44\ucd94\uace0, \uacf5\ud3ec\uc640 \uae34\uc7a5\uc774 \uae54\ub9b0 \ubb34\uac70\uc6b4 \ubb38\uc7a5\uc744 \uc4f0\uc138\uc694. "
                "\uc794\ud639\ud568\uc740 \uc554\uc2dc\ud558\ub418 \uc9c1\uc811 \ubb18\uc0ac\ub294 \uc808\uc81c\ud569\ub2c8\ub2e4."
            ),
            "mystery": (
                "수수께끼와 \uae34\uc7a5\uc758 \ubbf8\uc2a4\ud130\ub9ac. \uc815\ubcf4\ub97c \uc870\uae08\uc529\ub9cc \ud758\ub9ac\uace0 \uc758\ubb38\uc744 \ub0a8\uae30\uc138\uc694. "
                "\ub2e8\uc11c\uc640 \ubcf5\uc120\uc744 \uacf3\uacf3\uc5d0 \uc2ec\ub418 \uc989\uc2dc \ub2f5\uc744 \uc8fc\uc9c0 \ub9c8\uc138\uc694. "
                "\ub3c5\uc790\uac00 '\uc65c?'\ub97c \uacc4\uc18d \ubb3b\uac8c \ub9cc\ub4dc\ub294 \uc11c\uc2a4\ud39c\uc2a4\ub97c \uc720\uc9c0\ud558\uc138\uc694."
            ),
            "epic": (
                "\uc7a5\uc5c4\ud558\uace0 \ube44\uc7a5\ud55c \uc601\uc6c5 \uc11c\uc0ac. \uae30\uc0ac\ub3c4, \uba85\uc608, \ud76c\uc0dd\uc758 \ubb34\uac8c\ub97c \ub2f4\uc73c\uc138\uc694. "
                "\uace0\ud48d\uc2a4\ub7fd\uace0 \uaca9\uc870 \uc788\ub294 \uc5b4\ud718, \uc6b4\uc728\uac10 \uc788\ub294 \ubb38\uc7a5\uc744 \uc4f0\uc138\uc694. "
                "\ube44\uadf9\uacfc \uc601\uad11\uc774 \uad50\ucc28\ud558\ub294 \uc7a5\ub300\ud55c \ubd84\uc704\uae30\ub97c \uc5f0\ucd9c\ud558\uc138\uc694."
            ),
            "sci-fi-horror": (
                "\ucc28\uac11\uace0 \ud3d0\uc1c4\uc801\uc778 SF \ud638\ub7ec. \uae30\uacc4\uc74c, \uc815\uc801, \uc778\uacf5\uc870\uba85\uc758 \uc774\ubbf8\uc9c0\ub97c \ud65c\uc6a9\ud558\uc138\uc694. "
                "\uc778\uac04\uc131\uacfc \uae30\uc220\uc758 \uacbd\uacc4\uc5d0\uc11c \uc624\ub294 \ubd88\uc548\uc744 \uc790\uadf9\ud558\uc138\uc694. "
                "\uac74\uc870\ud558\uace0 \uc784\uc0c1\uc801\uc778 \ubb38\uc7a5 \uc0ac\uc774\ub85c \uc11c\uc11c\ud788 \uacf5\ud3ec\uac00 \uc2a4\uba70\ub4e4\uac8c \ud558\uc138\uc694."
            ),
        }
        return guides.get(tone, f"{tone} \ubd84\uc704\uae30\uc5d0 \ub9de\ub294 \uc77c\uad00\ub41c \ubb38\uccb4\ub97c \uc720\uc9c0\ud558\uc138\uc694.")

    # ── AI 호출 (폴백 포함) ────────────────────────────
    async def _call_ai(self, user_message: str, prefer_smart: bool = False) -> str:
        last_error = None
        # 중요 장면에서는 70B를 먼저 시도
        providers = self._providers
        if prefer_smart:
            smart = [p for p in providers if '70b' in p.name.lower()]
            others = [p for p in providers if '70b' not in p.name.lower()]
            providers = smart + others
        for provider in providers:
            if not provider.within_limits():
                logger.info(f"Provider {provider.name} near limit, trying next")
                continue
            try:
                result = await provider.chat_complete(
                    system_prompt=self._system_prompt,
                    history=self._history[-MAX_HISTORY_TURNS * 2:],
                    user_message=user_message,
                )
                # 히스토리 업데이트
                self._history.append({"role": "user",      "content": user_message})
                self._history.append({"role": "assistant", "content": result})
                if len(self._history) > MAX_HISTORY_TURNS * 2:
                    self._history = self._history[-(MAX_HISTORY_TURNS * 2):]
                logger.debug(f"AI response via {provider.name}: {len(result)} chars")
                return result
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}")
                last_error = e

        raise RuntimeError(f"All AI providers failed: {last_error}")

    # ── JSON 파싱 ─────────────────────────────────────
    @staticmethod
    def _extract_json(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text  = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        start = text.find("{")
        end   = text.rfind("}") + 1
        if 0 <= start < end:
            return text[start:end]
        return text

    @classmethod
    def _safe_parse(cls, text: str) -> dict | None:
        src0 = cls._extract_json(text)

        def py_to_json(s: str) -> str:
            # 파이썬 dict 스타일 → JSON (작은따옴표 키·값 모두, 불린/None)
            s = re.sub(r"'([^']*)'", r'"\1"', s)
            return s.replace("True", "true").replace("False", "false").replace("None", "null")

        attempts = [
            src0,
            # 작은따옴표 키 → 큰따옴표, 파이썬 불린
            re.sub(r"'([^']*)':", r'"\1":', src0).replace("True", "true").replace("False", "false").replace("None", "null"),
            # 후행 쉼표 제거 (}, ] 앞)
            re.sub(r",\s*([}\]])", r"\1", src0),
            # 문자열 안 실제 줄바꿈 → 공백 (이스케이프 안 된 개행)
            re.sub(r'(?<!\\)\n', ' ', src0),
            # 파이썬 스타일 전체 변환 + 줄바꿈 보정 + 후행쉼표 제거 (복합 오류)
            re.sub(r",\s*([}\]])", r"\1", re.sub(r'(?<!\\)\n', ' ', py_to_json(src0))),
        ]
        for src in attempts:
            try:
                return json.loads(src)
            except Exception:
                continue
        return None

    # ── 데이터 검증 ───────────────────────────────────
    def _validate(self, data: dict) -> dict:
        valid_skill_ids = set(SKILL_REGISTRY.keys())
        result = {
            "story":            str(data.get("story", ""))[:1000],
            "choices":          list(data.get("choices", []))[:3],
            "battle":           None,
            "flags":            [str(f) for f in data.get("flags", [])][:5],
            "relation_changes": {},
            "ending":           None,
        }

        # relation_changes 정수 강제
        for k, v in (data.get("relation_changes") or {}).items():
            try:
                result["relation_changes"][str(k)] = max(-3, min(3, int(v)))
            except (ValueError, TypeError):
                pass

        # 엔딩 검증
        valid_endings = {e.id for e in self.guide.endings}
        end = data.get("ending")
        if end and str(end) in valid_endings:
            result["ending"] = str(end)

        # 전투 검증
        b = data.get("battle")
        if b and isinstance(b, dict):
            diff = max(1, min(5, int(b.get("difficulty", 2) or 2)))
            b["difficulty"]      = diff
            b["initial_garbage"] = max(0, min(4, int(b.get("initial_garbage", 0) or 0)))

            # 스킬 ID 검증 (플레이어 스킬은 사용 가능 목록으로 한정)
            enemy_raw  = b.get("enemy_skills") or get_enemy_skills(diff)
            player_raw = b.get("player_skills") or ["clear_line", "swap_block"]
            b["enemy_skills"]  = [s for s in enemy_raw  if s in valid_skill_ids][:4] or get_enemy_skills(diff)
            b["player_skills"] = [s for s in player_raw if s in PLAYER_USABLE_SKILLS][:5] or ["clear_line", "swap_block"]

            # 필드 이벤트 검증
            allowed_events = {
                "bonus_block","gauge_burst","slow_gravity","darkness",
                "heavy_gravity","earthquake","random_rotation","double_score","narrow_board",
                "mirror_board","garbage_rain","healing_zone",
            }
            b["field_events"] = [e for e in (b.get("field_events") or []) if e in allowed_events][:2]

            # goal 검증
            valid_goals = {"versus","survival","line_race","score"}
            b["goal"] = b.get("goal","versus") if b.get("goal") in valid_goals else "versus"

            # 기본값
            b.setdefault("enemy_name",  "적")
            b.setdefault("type",        "normal")
            b.setdefault("win_story",   "승리했습니다!")
            b.setdefault("lose_story",  "패배했습니다...")

            if b.get("type") == "boss":
                b.setdefault("boss_hp",     6)
                b.setdefault("phase_count", 2)
                # 범위 강제 (0으로 나누기/비정상 값 방지)
                b["boss_hp"]     = max(3, min(20, int(b.get("boss_hp", 6) or 6)))
                b["phase_count"] = max(1, min(4, int(b.get("phase_count", 2) or 2)))
                # boss_id 검증
                valid_boss_ids = {boss.id for boss in self.guide.bosses}
                if b.get("boss_id") not in valid_boss_ids:
                    b["boss_id"] = self.guide.bosses[0].id if self.guide.bosses else "boss"

            result["battle"] = b

        return result

    def _fallback(self, player_input: str) -> dict:
        # 톤에 맞는 fallback (AI 실패 시에도 분위기 유지)
        fallbacks = {
            "dark": "주변이 고요해진다. 어디선가 희미한 소리가 들려오고, 그림자가 천천히 움직인다.",
            "mystery": "공기 중에 알 수 없는 긴장이 감돈다. 무언가 놓친 단서가 있는 듯하다.",
            "epic": "바람이 멎고 정적이 흐른다. 운명의 갈림길이 눈앞에 펼쳐진다.",
            "sci-fi-horror": "조명이 깜빡인다. 멀리서 금속이 삐걱이는 소리가 메아리친다.",
        }
        story = fallbacks.get(self.guide.tone,
                              "잠시 정적이 흐른다. 주변을 다시 살펴본다.")
        return {
            "story":            story,
            "choices":          ["조심스럽게 전진한다", "주변을 자세히 살핀다", "잠시 상황을 파악한다"],
            "battle":           None,
            "flags":            [],
            "relation_changes": {},
            "ending":           None,
        }

    def _describe_relations(self) -> str:
        """NPC 관계를 자연어로 (8B가 이해하기 쉽게)"""
        if not self.npc_relations:
            return "아직 특별한 관계 없음"
        parts = []
        for npc, val in self.npc_relations.items():
            if val >= 2:    level = "매우 우호적"
            elif val == 1:  level = "우호적"
            elif val == 0:  level = "중립"
            elif val == -1: level = "경계"
            else:           level = "적대적"
            parts.append(f"{npc}={level}")
        return ", ".join(parts)

    def _describe_progress(self) -> str:
        """전투 횟수 기반 진행 단계를 자연어로"""
        bc = self.battle_count
        if bc == 0:
            return "이제 막 모험을 시작함 (도입부)"
        elif bc <= 2:
            return f"초반 진행 중 (전투 {bc}회 경험)"
        elif bc <= 4:
            return f"중반, 긴장이 고조되는 단계 (전투 {bc}회). 곧 보스를 만날 수 있음"
        else:
            return f"후반, 클라이맥스에 근접 (전투 {bc}회). 엔딩을 향해 수렴할 시점"

    def _check_boss_trigger(self) -> str | None:
        for boss in self.guide.bosses:
            if boss.id in self.story_flags:
                continue
            cond = boss.trigger_condition
            if cond.startswith("after_") and cond.endswith("_battles"):
                try:
                    n = int(cond.split("_")[1])
                    if self.battle_count >= n:
                        return boss.id
                except ValueError:
                    pass
            if cond == "chapter_final" and self.battle_count >= 4:
                return boss.id
        return None

    # ── 메인 처리 ─────────────────────────────────────
    async def process(self, player_input: str, game_state: dict) -> dict:
        # 동시 요청 직렬화 — 같은 세션의 히스토리 꼬임 방지
        async with self._lock:
            return await self._process_impl(player_input, game_state)

    async def _process_impl(self, player_input: str, game_state: dict) -> dict:
        triggered_boss_id = self._check_boss_trigger()

        # 서사 상태를 사람이 읽는 자연어로 구성 (8B 모델 이해도 향상)
        relation_desc = self._describe_relations()
        progress_desc = self._describe_progress()

        context = {
            "player_input":  player_input[:500],
            "진행상황":       progress_desc,
            "NPC관계":        relation_desc,
            "달성한_사건":    list(self.story_flags)[-8:],  # 최근 8개만
            "플레이어상태": {
                "체력":   min(100, max(0, int(game_state.get("hp", 100)))),
                "골드":   max(0, int(game_state.get("gold", 0))),
                "레벨":   max(1, int(game_state.get("level", 1))),
            },
        }

        # 클래스별 서사 반영 (같은 스토리도 클래스에 따라 다르게 전개)
        class_id = str(game_state.get("playerClass") or game_state.get("player_class") or "").strip()
        if class_id:
            self._last_class = class_id  # 전투결과 처리 등에서 재사용
        else:
            class_id = getattr(self, "_last_class", "")
        class_directive = get_class_directive(class_id)
        if class_directive:
            context["클래스지침"] = class_directive

        if triggered_boss_id:
            boss = next((b for b in self.guide.bosses if b.id == triggered_boss_id), None)
            if boss:
                class_hint = ""
                if class_id in ("guardian", "paladin"):
                    class_hint = " 플레이어가 기사 계열이므로, 보스와의 대치에 기사도/맹세의 긴장을 더하라."
                elif class_id == "technician":
                    class_hint = " 플레이어가 기술자이므로, 보스의 약점을 분석적으로 간파하는 여지를 남겨라."
                context["directive"] = (
                    f"[중요 GM지시] 지금 이 턴에 보스 '{boss.name}'를 등장시키세요. "
                    f"먼저 story로 긴장감 있게 등장을 묘사한 뒤 battle을 보스로 설정합니다. "
                    f"상황: {boss.intro_text}.{class_hint} "
                    f"반드시 boss_id='{boss.id}', type='boss', "
                    f"difficulty={boss.difficulty}, boss_hp={boss.hp}, "
                    f"phase_count={boss.phase_count}, field_events={boss.field_events}"
                )

        # 중요 장면(보스/엔딩)이면 70B 우선 시도
        is_important = bool(triggered_boss_id or context.get("directive"))

        # 재시도 루프
        for attempt in range(MAX_RETRIES + 1):
            try:
                msg = json.dumps(context, ensure_ascii=False)
                if attempt == 1:
                    msg += ("\n\n[시스템 경고: 직전 응답이 형식 오류였습니다. "
                            "반드시 { 로 시작해 } 로 끝나는 순수 JSON만 출력하세요. "
                            "story/choices/battle/flags/relation_changes/ending 키를 모두 포함하세요.]")
                elif attempt == 2:
                    msg += ("\n\n[시스템 최종 경고: 코드블록(```)이나 설명 없이 JSON 객체 하나만. "
                            "예: {\"story\":\"...\",\"choices\":[\"...\",\"...\"],\"battle\":null,"
                            "\"flags\":[],\"relation_changes\":{},\"ending\":null}]")
                raw    = await self._call_ai(msg, prefer_smart=is_important)
                parsed = self._safe_parse(raw)
                if parsed is None:
                    logger.warning(f"Parse failed attempt {attempt+1}: {raw[:200]}")
                    continue
                result = self._validate(parsed)
                break
            except Exception as e:
                logger.error(f"GM process error attempt {attempt+1}: {e}")
                if attempt == MAX_RETRIES:
                    return self._fallback(player_input)
        else:
            return self._fallback(player_input)

        # 상태 업데이트
        for flag in result.get("flags", []):
            self.story_flags.add(str(flag))
        for npc, delta in result.get("relation_changes", {}).items():
            cur = self.npc_relations.get(npc, 0)
            self.npc_relations[npc] = max(-3, min(3, cur + delta))
        if result.get("battle"):
            self._pending_battle = True

        return result

    async def process_battle_result(self, result: dict) -> dict:
        async with self._lock:
            if self._pending_battle:
                self.battle_count += 1
                self._pending_battle = False
            if result.get("boss_id") and result.get("win"):
                self.story_flags.add(result["boss_id"])

            parts = [f"[전투결과] {'승리' if result.get('win') else '패배'}"]
            if result.get("boss_id"):        parts.append(f"보스={result['boss_id']}")
            if result.get("lines_cleared"):  parts.append(f"라인={result['lines_cleared']}")
            if result.get("score"):          parts.append(f"점수={result['score']}")
            # 전투 후 서사가 자연스럽게 이어지도록 지시
            outcome = "승리한" if result.get("win") else "패배한"
            parts.append(f"[지시] 방금 전투에서 {outcome} 상황을 이어받아 그 여파를 묘사하고 다음 장면으로 전개하세요.")

            # lock 재진입 방지 위해 _process_impl 직접 호출
            return await self._process_impl(" | ".join(parts), result)

    def get_state(self) -> dict:
        return {
            "battle_count":  self.battle_count,
            "flags":         list(self.story_flags),
            "npc_relations": self.npc_relations,
        }

    @property
    def active_provider(self) -> str:
        return self._providers[0].name if self._providers else "none"
