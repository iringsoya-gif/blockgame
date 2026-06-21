// BossScene은 BattleScene을 그대로 사용함
// 보스 전투는 BattleScene의 isBoss 플래그로 분기 처리되므로 별도 씬 불필요
// 이 파일은 향후 보스 전용 연출(배경 애니메이션 등) 확장을 위해 예약
export { BattleScene as BossScene } from './BattleScene'
