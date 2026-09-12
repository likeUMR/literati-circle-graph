import { Billboard, Text } from '@react-three/drei';
import { useMemo } from 'react';
import { AdditiveBlending, Color } from 'three';
import type { PositionedPoet } from './layouts/force';
import { colorForPoet } from '../utils/colorHash';
import { star, color as colorToken } from '../styles/tokens';
import { getStarCoreTexture, getStarGlowTexture } from './textures/starGlow';

interface Props {
  poet: PositionedPoet;
  isFocus?: boolean;
  hasFocus?: boolean;        // 场景中是否存在焦点 → 给非焦点节点轻度压暗
}

export function StarNode({ poet, isFocus = false, hasFocus = false }: Props) {
  const coreTex = getStarCoreTexture();
  const glowTex = getStarGlowTexture();

  const baseColor = useMemo(() => {
    const palette: Record<string, string> = {
      Season: '#E8C16C', Club: '#69A7FF', Player: '#FF6B7A', Hero: '#52D6C5', Match: '#A78BFA',
    };
    return palette[poet.type ?? ''] ?? colorForPoet(poet.id);
  }, [poet.id, poet.type]);

  // 选中态：焦点节点更亮、非焦点节点轻度压暗（突出焦点）
  const isDim = hasFocus && !isFocus;
  const coreBoost = isFocus
    ? star.coreBoost * star.focusCoreBoostMul
    : isDim
      ? star.dimCoreBoost
      : star.coreBoost;
  const currentGlowOpacity = isFocus
    ? star.focusGlowOpacity
    : isDim
      ? star.dimGlowOpacity
      : star.glowOpacity;

  // 核：始终偏白（焦点 = 朱白，普通 = 暖白），不再使用诗人色 —— 所有节点的中心都是白点
  const coreColor = useMemo(() => {
    const white = isFocus ? colorToken.focusGlow : '#FFFFFF';
    return new Color(white).multiplyScalar(coreBoost);
  }, [isFocus, coreBoost]);

  // 光晕：始终用诗人自身颜色（焦点态靠尺寸 + opacity 突出，不再换成朱红）
  const glowColor = useMemo(() => new Color(baseColor), [baseColor]);

  // 节点尺寸由 weight 驱动：连接越多越大（sqrt 让差异不至于失衡）
  // 焦点态在自身基础尺寸上 × focusSizeMul 等比放大，避免高 weight 节点焦点反而变小
  const w = Math.sqrt(poet.weight);
  const baseCore = star.coreBase + w * star.coreWeightScale;
  const baseGlow = star.glowBase + w * star.glowWeightScale;
  const coreSize = isFocus ? baseCore * star.focusSizeMul : baseCore;
  const glowSize = isFocus ? baseGlow * star.focusGlowSizeMul : baseGlow;

  // 名字显示策略：焦点恒显，普通态按 weight 阈值过滤；阈值之上的"重要诗人"字号更大
  const isProminent = poet.weight >= star.prominentWeightThreshold;
  const showLabel = isFocus || poet.weight >= star.labelWeightThreshold;
  const labelSize = isFocus ? 4.4 : isProminent ? 3.2 : 2.0;
  const labelColor = isFocus
    ? colorToken.textPrimary
    : isProminent
      ? colorToken.textSecondary
      : colorToken.textMuted;
  const labelOpacity = 1.0;

  return (
    <group position={[poet.x, poet.y, poet.z]}>
      <sprite scale={[glowSize, glowSize, 1]}>
        <spriteMaterial
          map={glowTex}
          color={glowColor}
          transparent
          opacity={currentGlowOpacity}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <sprite scale={[coreSize, coreSize, 1]}>
        <spriteMaterial
          map={coreTex}
          color={coreColor}
          transparent
          opacity={1}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {showLabel && (
        <Billboard position={[0, coreSize * 0.6 + 1.4, 0]}>
          <Text
            fontSize={labelSize}
            color={labelColor}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.06}
            outlineColor="#000000"
            fillOpacity={labelOpacity}
          >
            {poet.name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
