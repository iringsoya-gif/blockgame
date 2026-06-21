import json
import logging
from app.game.gm_agent import GMAgent
from app.game.story_guide_loader import load_guide
from app.core.supabase import supabase

logger = logging.getLogger(__name__)


class SessionManager:
    """유저별 GMAgent 세션 관리 — 인메모리 캐시 + DB 영속화"""

    MAX_SESSIONS = 200   # 동시 메모리 세션 상한

    def __init__(self):
        self._sessions: dict[str, GMAgent] = {}
        self._access: dict[str, float] = {}   # user_id → 마지막 접근 시각

    def _touch(self, user_id: str) -> None:
        import time
        self._access[user_id] = time.monotonic()

    def _evict_if_needed(self) -> None:
        """세션 수 초과 시 가장 오래된 것 제거 (LRU)"""
        if len(self._sessions) <= self.MAX_SESSIONS:
            return
        # 접근 시각 오름차순 정렬 → 가장 오래된 것부터 제거
        sorted_users = sorted(self._access.items(), key=lambda x: x[1])
        to_remove = len(self._sessions) - self.MAX_SESSIONS + 10  # 여유분
        for user_id, _ in sorted_users[:to_remove]:
            # 제거 전 DB 저장
            try:
                self.save_to_db(user_id)
            except Exception:
                pass
            self._sessions.pop(user_id, None)
            self._access.pop(user_id, None)
        logger.info(f"Evicted {to_remove} old sessions (LRU)")

    def get_or_create(self, user_id: str, guide_id: str = "default") -> GMAgent:
        # 캐시된 세션이 있어도 guide_id가 다르면(스토리 변경) 교체해야 함
        if user_id in self._sessions:
            cached = self._sessions[user_id]
            if getattr(cached, "_guide_id", "default") == guide_id:
                self._touch(user_id)
                return cached
            # 다른 스토리로 전환 — 기존 세션을 저장 후 새로 로드
            try:
                self.save_to_db(user_id)
            except Exception:
                pass
            del self._sessions[user_id]

        agent = self._load_from_db(user_id, guide_id)
        if not agent:
            guide = load_guide(guide_id)
            agent = GMAgent(guide)

        agent._guide_id = guide_id
        self._sessions[user_id] = agent
        self._touch(user_id)
        self._evict_if_needed()
        return agent

    def reset(self, user_id: str, guide_id: str = "default") -> None:
        # 해당 스토리 세션만 리셋 (다른 스토리 진행은 보존)
        cached = self._sessions.get(user_id)
        if cached and getattr(cached, "_guide_id", "default") == guide_id:
            self._sessions.pop(user_id, None)
            self._access.pop(user_id, None)
        self._delete_from_db(user_id, guide_id)

    def has_session(self, user_id: str) -> bool:
        if user_id in self._sessions:
            return True
        try:
            res = (supabase.table("game_saves")
                   .select("id")
                   .eq("user_id", user_id)
                   .limit(1).execute())
            return bool(res.data)
        except Exception:
            return False

    def save_to_db(self, user_id: str) -> None:
        agent = self._sessions.get(user_id)
        if not agent:
            return
        try:
            story_context = {
                "battle_count":  agent.battle_count,
                "chapter":       agent.chapter,
                "story_flags":   list(agent.story_flags),
                "npc_relations": agent.npc_relations,
                "chat_history":  self._serialize_history(agent),
            }
            supabase.table("game_saves").upsert({
                "user_id":       user_id,
                "guide_id":      getattr(agent, "_guide_id", "default"),
                "story_context": story_context,
                "player_stats":  {},  # 클라이언트 사이드 관리
                "updated_at":    "now()",
            }, on_conflict="user_id,guide_id").execute()
        except Exception as e:
            logger.warning(f"Session save failed for {user_id}: {e}")

    def _load_from_db(self, user_id: str, guide_id: str) -> GMAgent | None:
        try:
            res = (supabase.table("game_saves")
                   .select("*")
                   .eq("user_id", user_id)
                   .eq("guide_id", guide_id)
                   .limit(1).execute())
            if not res.data:
                return None

            ctx = res.data[0].get("story_context", {})
            if not ctx:
                return None

            guide = load_guide(guide_id)
            agent = GMAgent(guide)
            agent.battle_count  = int(ctx.get("battle_count", 0))
            agent.chapter       = int(ctx.get("chapter", 1))
            agent.story_flags   = set(ctx.get("story_flags", []))
            agent.npc_relations = ctx.get("npc_relations", {})

            # 채팅 히스토리 복원 ({role, content} 형식)
            history = ctx.get("chat_history", [])
            if history and isinstance(history, list):
                restored = []
                for h in history:
                    role = h.get("role")
                    content = h.get("content")
                    if role in ("user", "assistant") and content:
                        restored.append({"role": role, "content": content})
                agent._history = restored

            logger.info(f"Session restored for {user_id}: battle_count={agent.battle_count}")
            return agent

        except Exception as e:
            logger.warning(f"Session load failed for {user_id}: {e}")
            return None

    def _delete_from_db(self, user_id: str, guide_id: str | None = None) -> None:
        try:
            q = supabase.table("game_saves").delete().eq("user_id", user_id)
            if guide_id is not None:
                q = q.eq("guide_id", guide_id)  # 특정 스토리만 삭제
            q.execute()
        except Exception:
            pass

    @staticmethod
    def _serialize_history(agent: GMAgent) -> list:
        """최근 12턴 히스토리 직렬화 ({role, content} 형식)"""
        try:
            result = []
            for msg in agent._history[-24:]:  # 12턴 = user+assistant 24개
                role = msg.get("role")
                content = msg.get("content")
                if role in ("user", "assistant") and content:
                    result.append({"role": role, "content": str(content)[:800]})
            return result
        except Exception:
            return []


session_manager = SessionManager()
