import json
from pathlib import Path
from app.game.story_schema import StoryGuide


def load_guide(guide_id: str) -> StoryGuide:
    path = Path(__file__).parent.parent / "data" / "stories" / f"{guide_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Story guide '{guide_id}' not found at {path}")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return StoryGuide(**data)


def list_guides() -> list[str]:
    path = Path(__file__).parent.parent / "data" / "stories"
    return [p.stem for p in path.glob("*.json")]
