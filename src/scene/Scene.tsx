import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useMemo, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { DynastyDataset } from '../data/types';
import { layoutForce } from './layouts/force';
import { StarNode } from './StarNode';
import { Edges } from './Edges';
import { CameraRig } from './CameraRig';
import { BackgroundStars } from './BackgroundStars';
import { bloom, color, camera as cameraToken } from '../styles/tokens';
import { useAppStore } from '../state/store';

interface Props {
  data: DynastyDataset;
}

export function Scene({ data }: Props) {
  const controls = useRef<OrbitControlsImpl | null>(null);

  const focusId = useAppStore((s) => s.selectedPoetId);
  const dynasty = useAppStore((s) => s.dynasty);
  const openPanel = useAppStore((s) => s.openPanel);
  const openEdgePanel = useAppStore((s) => s.openEdgePanel);
  const lineStyle = useAppStore((s) => s.lineStyle);
  const visibleNodeTypes = useAppStore((s) => s.visibleNodeTypes);
  const visibleEdgeTypes = useAppStore((s) => s.visibleEdgeTypes);

  const treeAxis = useAppStore((s) => s.treeAxis);
  const yFlipped = useAppStore((s) => s.yFlipped);

  const filtered = useMemo(() => {
    const poets = data.poets.filter((p) => visibleNodeTypes[p.type ?? 'Player']);
    const ids = new Set(poets.map((p) => p.id));
    const edges = data.edges.filter((e) => ids.has(e.source) && ids.has(e.target) && visibleEdgeTypes[e.relation] !== false);
    return { poets, edges };
  }, [data, visibleNodeTypes, visibleEdgeTypes]);
  const positioned = useMemo(
    () => layoutForce(filtered.poets, filtered.edges, { axis: treeAxis, yFlip: yFlipped }),
    [filtered, treeAxis, yFlipped],
  );
  const layoutKey = `${dynasty}-${treeAxis}-${yFlipped ? 'y' : 'n'}`;

  return (
    <Canvas
      camera={{ position: [0, 0, cameraToken.defaultDistance], fov: 55, near: 0.1, far: 4000 }}
      style={{ position: 'fixed', inset: 0, background: color.bgDeep }}
      gl={{ antialias: true, alpha: false }}
      onCreated={() => {
        // Three.js 已初始化、第一帧已渲染 → 淡出 boot loader
        const el = document.getElementById('boot-loader');
        if (!el) return;
        // 等下一帧确保画面真已上屏，避免黑屏夹层
        requestAnimationFrame(() => {
          el.classList.add('hidden');
          setTimeout(() => el.remove(), 800);
        });
      }}
    >
      <color attach="background" args={[color.bgDeep]} />
      <fog attach="fog" args={[color.bgFog, 320, 1200]} />
      <ambientLight intensity={0.4} />
      <BackgroundStars />
      <group key={layoutKey}>
        <Edges poets={positioned} edges={filtered.edges} focusId={focusId} lineStyle={lineStyle} onSelectEdge={(edge) => openEdgePanel(`${edge.source}|${edge.target}|${edge.relation}`)} />
        {positioned.map((p) => (
          <group
            key={p.id}
            onClick={(e) => {
              e.stopPropagation();
              openPanel(p.id);
            }}
          >
            <StarNode poet={p} isFocus={focusId === p.id} hasFocus={focusId !== null} />
          </group>
        ))}
      </group>
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.6}
        minDistance={20}
        maxDistance={1200}
      />
      <CameraRig poets={positioned} controls={controls} />
      <EffectComposer>
        <Bloom
          intensity={bloom.intensity}
          luminanceThreshold={bloom.luminanceThreshold}
          luminanceSmoothing={bloom.luminanceSmoothing}
          radius={bloom.radius}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
