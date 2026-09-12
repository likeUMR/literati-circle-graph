import { Scene } from './scene/Scene';
import { Header } from './ui/Header';
import { Legend } from './ui/Legend';
import { ControlBar } from './ui/ControlBar';
import { PoetPanel } from './ui/PoetPanel';
import { PoemModal } from './ui/PoemModal';
import { getDataset } from './data';
import { useAppStore } from './state/store';

export default function App() {
  const dynasty = useAppStore((s) => s.dynasty);
  const data = getDataset(dynasty);

  return (
    <>
      <Scene key={dynasty} data={data} />
      <Header />
      <ControlBar />
      <Legend />
      <PoetPanel />
      <PoemModal />
    </>
  );
}
