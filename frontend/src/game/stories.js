/**
 * 스토리 메타데이터 — 단일 진실 공급원(SSOT)
 * 새 스토리를 추가할 땐 이 파일과 백엔드 data/stories/{id}.json,
 * subscription.py의 PLAN_FEATURES만 갱신하면 됩니다.
 */

export const STORIES = {
  default: {
    id: 'default', title: '망각의 탑', subtitle: '봉인된 악을 막아라',
    icon: '🗼', difficulty: 3, premium: false,
    desc: '고대의 탑에 봉인된 악이 깨어나고 있다. 탑을 탐험하며 진실을 밝혀라.',
    theme: '#8b5cff', tags: ['다크 판타지', '탐험', '봉인'], estimatedTime: '60~90분', bossCount: 2,
  },
  ruins: {
    id: 'ruins', title: '폐허의 기억', subtitle: '잃어버린 동료를 찾아서',
    icon: '🏚', difficulty: 4, premium: true,
    desc: '전쟁으로 폐허가 된 도시에서 전설의 기억 결정을 찾아라.',
    theme: '#ff8800', tags: ['미스터리', '전쟁', '기억'], estimatedTime: '70~100분', bossCount: 2,
  },
  abyss: {
    id: 'abyss', title: '심연의 노래', subtitle: '태초의 음악을 찾아서',
    icon: '🎵', difficulty: 4, premium: true,
    desc: '지하 도시 에코. 태초의 음악이 봉인된 공명 결정을 둘러싼 갈등 속으로.',
    theme: '#ff44cc', tags: ['미스터리', '음악', '지하 도시'], estimatedTime: '80~110분', bossCount: 2,
  },
  citadel: {
    id: 'citadel', title: '별을 삼킨 성채', subtitle: '13명의 기사 망령',
    icon: '🏰', difficulty: 5, premium: true,
    desc: '검은 별이 박힌 옛 성채. 원탁의 기사 망령들을 넘어 떨어진 별의 핵에 도달하라.',
    theme: '#ffd23f', tags: ['기사도', '비극', '구원'], estimatedTime: '90~120분', bossCount: 2,
  },
  vessel: {
    id: 'vessel', title: '정지된 함선', subtitle: '잠식된 AI와의 대치',
    icon: '🛸', difficulty: 5, premium: true,
    desc: '200년간 표류한 식민선. 승무원을 흡수한 AI 미라로부터 살아남고 함선을 멈춰라.',
    theme: '#44aaff', tags: ['SF', '호러', '인공지능'], estimatedTime: '90~120분', bossCount: 2,
  },
  wuxia: {
    id: 'wuxia', title: '강호: 마교의 부활', subtitle: '백 년 봉인이 풀린다',
    icon: '⚔', difficulty: 5, premium: true,
    desc: '준동하는 마교를 막기 위해 혈마곡으로 향한다. 무공과 협의가 얽힌 강호에서 검 한 자루로 운명을 가른다.',
    theme: '#e63946', tags: ['무협', '강호', '비장'], estimatedTime: '90~120분', bossCount: 2,
  },
  void: {
    id: 'void', title: '공허의 부름', subtitle: '문 너머가 부른다',
    icon: '🌌', difficulty: 5, premium: true,
    desc: '금단의 의식으로 공허의 문을 연 소환술사. 이계의 존재와 계약할 것인가, 문을 닫고 돌아갈 것인가.',
    theme: '#7733cc', tags: ['코스믹 호러', '이계', '소환'], estimatedTime: '90~120분', bossCount: 2,
  },
}

// 스토리별 첫 오프닝 (게임 진입 시)
export const STORY_OPENINGS = {
  default: '낡은 탑의 입구에 섰습니다. 차가운 공기가 흐르고, 멀리서 정체불명의 소리가 들려옵니다.',
  ruins:   '무너진 건물들 사이에 섰습니다. 한때 번성했던 도시의 잔해가 사방에 흩어져 있습니다.',
  abyss:   '지하로 내려가는 계단 앞에 섰습니다. 아름다운 선율이 들려오지만 불길한 기운이 섞여 있습니다.',
  citadel: '무너진 성문 앞에 섭니다. 검은 별빛에 부식된 문장 너머로 녹슨 갑옷이 스스로 움직이는 소리가 들립니다.',
  vessel:  '에어록이 열립니다. 정전된 함선 내부에 비상등만 붉게 깜빡이고, 어딘가에서 기계음 섞인 발소리가 다가옵니다.',
  wuxia:   '혈마곡으로 향하는 산길 초입에 섭니다. 검은 안개에 휩싸인 협곡에서 희미한 검명(劍鳴)이 실려 오고, 낡은 객잔 앞의 노인이 술잔 너머로 당신을 바라봅니다.',
  void:    '의식의 원이 빛을 발하며 공허의 문이 열립니다. 발 밑의 땅이 사라지고, 사방이 별 없는 어둠으로 가득 찹니다. 수많은 목소리가 동시에 속삭입니다 — "드디어… 문을 연 자가… 왔다."',
}

// 헬퍼
export const getStoryLabel = (id) => STORIES[id]?.title ?? id
export const getStoryMeta  = (id) => STORIES[id] ?? null
export const getBossCount  = (id) => STORIES[id]?.bossCount ?? 2
export const STORY_LABELS  = Object.fromEntries(
  Object.values(STORIES).map(s => [s.id, s.title])
)
