import { Scene } from './scene/Scene';
import { Header } from './ui/Header';
import { Legend } from './ui/Legend';
import { ControlBar } from './ui/ControlBar';
import { PoetPanel } from './ui/PoetPanel';
import { EdgePanel } from './ui/EdgePanel';
import { FilterPanel } from './ui/FilterPanel';
import { LineStyleSwitcher } from './ui/LineStyleSwitcher';
import { PoemModal } from './ui/PoemModal';
import { getDataset, loadFullDataset } from './data';
import { useEffect } from 'react';
import { useAppStore } from './state/store';

export default function App() {
  const dynasty = useAppStore((s) => s.dynasty);
  const displayRatio = useAppStore((s) => s.displayRatio);
  const refreshData = useAppStore((s) => s.refreshData);
  useEffect(() => {
    if (displayRatio > 268 / 3399) loadFullDataset().then(refreshData);
  }, [displayRatio, refreshData]);
  const data = getDataset(dynasty, displayRatio);

  return (
    <>
      <Scene key={dynasty} data={data} />
      <Header />
      <FilterPanel />
      <LineStyleSwitcher />
      <ControlBar />
      <Legend />
      <PoetPanel />
      <EdgePanel />
      <PoemModal />
    </>
  );
}
