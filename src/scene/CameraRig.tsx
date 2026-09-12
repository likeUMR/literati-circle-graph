import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppStore } from '../state/store';
import type { PositionedPoet } from './layouts/force';
import { camera as cameraToken, rotation } from '../styles/tokens';

interface Props {
  poets: PositionedPoet[];
  controls: React.RefObject<OrbitControlsImpl | null>;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraRig({ poets, controls }: Props) {
  const camera = useThree((s) => s.camera);
  const targetPos = useRef(new Vector3(0, 0, cameraToken.defaultDistance));
  const targetLook = useRef(new Vector3(0, 0, 0));
  // 起飞瞬间记录的"当前位置"——lerp 始终从这里出发，避免每帧 lerp 累积带来 dt 抖动
  const flyStartPos = useRef(new Vector3(0, 0, cameraToken.defaultDistance));
  const flyStartLook = useRef(new Vector3(0, 0, 0));
  // 起飞瞬间相机相对旧 target 的方向（归一化到 flyDistance）：
  // 飞行终点 = 新节点 + 这个 offset → 保持当前旋转角度，只换中心点
  const flyOffset = useRef(new Vector3(0, 0, cameraToken.flyDistance));
  const flyT = useRef(0);

  const flying = useRef(true);
  const prevSel = useRef<string | null>(null);

  const idIndex = useMemo(() => new Map(poets.map((p, i) => [p.id, i])), [poets]);
  const fittedDistance = useMemo(() => {
    const radii = poets
      .map((p) => Math.hypot(p.x, p.y))
      .sort((a, b) => a - b);
    const visibleRadius = radii[Math.floor(radii.length * 0.94)] ?? 0;
    return Math.max(cameraToken.defaultDistance, Math.min(2200, visibleRadius * 2.15));
  }, [poets]);

  useFrame((_, dt) => {
    const { selectedPoetId, autoRotate } = useAppStore.getState();
    const ctrl = controls.current;

    // 检测节点切换 → 起飞：保存当前位置 + 当前方向 offset，作为飞行起点和终点参照
    if (selectedPoetId !== prevSel.current) {
      flying.current = true;
      prevSel.current = selectedPoetId;
      flyStartPos.current.copy(camera.position);
      flyStartLook.current.copy(ctrl?.target ?? targetLook.current);
      flyT.current = 0;

      // 当前相机相对 target 的方向，归一化到 flyDistance → 飞行终点保持这个相对方向
      if (ctrl) {
        flyOffset.current.copy(camera.position).sub(ctrl.target);
      } else {
        flyOffset.current.copy(camera.position).sub(targetLook.current);
      }
      const len = flyOffset.current.length();
      if (len > 0.01) {
        flyOffset.current.multiplyScalar(cameraToken.flyDistance / len);
      } else {
        flyOffset.current.set(0, 0, cameraToken.flyDistance);
      }
    }

    // 计算最新飞行目标（节点位置可能因布局切换而变）
    if (selectedPoetId) {
      const idx = idIndex.get(selectedPoetId);
      if (idx !== undefined) {
        const p = poets[idx];
        targetLook.current.set(p.x, p.y, p.z);
        // 终点 = 新节点 + 起飞瞬间的方向 offset → 当前旋转角度被保留，只是中心换到新节点
        targetPos.current.set(
          p.x + flyOffset.current.x,
          p.y + flyOffset.current.y,
          p.z + flyOffset.current.z,
        );
      }
    } else {
      targetLook.current.set(0, 0, 0);
      targetPos.current.set(0, cameraToken.defaultLiftY, fittedDistance);
    }

    if (flying.current) {
      // 飞行期间暂停 OrbitControls：drei 的 useFrame 是 `if (ctrl.enabled) ctrl.update()`，
      // enabled=false → autoRotate / spherical 完全停手 → 落地角度 = 起飞角度
      if (ctrl) ctrl.enabled = false;

      // 固定时长推进，与 dt 抖动解耦
      flyT.current = Math.min(1, flyT.current + dt / cameraToken.flyDuration);
      const t = easeInOutCubic(flyT.current);

      camera.position.copy(flyStartPos.current).lerp(targetPos.current, t);
      if (ctrl) {
        ctrl.target.copy(flyStartLook.current).lerp(targetLook.current, t);
        camera.lookAt(ctrl.target);
      } else {
        camera.lookAt(targetLook.current);
      }

      if (flyT.current >= 1) {
        flying.current = false;
        // 落地：恢复 OrbitControls，autoRotate 从当前角度继续
        if (ctrl) ctrl.enabled = true;
      }
    } else if (ctrl) {
      if (!ctrl.enabled) ctrl.enabled = true;
      ctrl.autoRotate = autoRotate;
      ctrl.autoRotateSpeed = rotation.globalAuto;
    } else {
      camera.lookAt(targetLook.current);
    }
  });

  return null;
}
