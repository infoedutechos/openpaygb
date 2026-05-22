import {
  calculateEnergyLimit,
  calculatePointsPerClick,
  calculateProfitPerHour,
  useGameStore,
} from '@/utils/game-mechanics';

/** Apply server-authoritative upgrade payload — avoids double local deduction. */
export function applyUpgradeResponse(data: Record<string, unknown>) {
  const sync = useGameStore.getState();
  const pts = Number(data.newPoints);
  const bal = Number(data.newPointsBalance);
  if (Number.isFinite(pts)) sync.setPoints(Math.floor(pts));
  if (Number.isFinite(bal)) sync.setPointsBalance(Math.floor(bal));

  const multitapIdx = Number(data.newMultitapLevelIndex);
  if (Number.isFinite(multitapIdx)) {
    sync.setPointsPerClick(calculatePointsPerClick(multitapIdx));
    useGameStore.setState({ multitapLevelIndex: multitapIdx });
  } else if (Number.isFinite(Number(data.newPointsPerClick))) {
    sync.setPointsPerClick(Number(data.newPointsPerClick));
  }

  const mineIdx = Number(data.newMineLevelIndex);
  if (Number.isFinite(mineIdx)) {
    useGameStore.setState({
      mineLevelIndex: mineIdx,
      profitPerHour: calculateProfitPerHour(mineIdx),
    });
  } else if (Number.isFinite(Number(data.newProfitPerHour))) {
    useGameStore.setState({ profitPerHour: Number(data.newProfitPerHour) });
  }

  const energyLimitIdx = Number(data.newEnergyLimitLevelIndex);
  if (Number.isFinite(energyLimitIdx)) {
    useGameStore.setState({
      energyLimitLevelIndex: energyLimitIdx,
      maxEnergy: calculateEnergyLimit(energyLimitIdx),
    });
  } else if (Number.isFinite(Number(data.newEnergyLimit))) {
    useGameStore.setState({ maxEnergy: Number(data.newEnergyLimit) });
  }
}
