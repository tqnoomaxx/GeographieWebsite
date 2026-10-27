import { useCallback, useEffect, useMemo } from 'react'
import { Color, DoubleSide, type MeshStandardMaterial } from 'three'
import { useDioramaMotion } from './DioramaMotion'

type WaterKind = 'ocean' | 'river' | 'lake' | 'fall'
type WaterShader = Parameters<MeshStandardMaterial['onBeforeCompile']>[0]

/** Native lit materials retain shadows; only a few broad water bands move in the shader. */
export function DioramaWater({ kind }: { kind: WaterKind }) {
  const clock = useDioramaMotion()
  const night = clock.night
  const uniforms = useMemo(
    () => ({
      uIslandTime: clock.time,
      uIslandOcean: { value: kind === 'ocean' ? 1 : 0 },
      uIslandFall: { value: kind === 'fall' ? 1 : 0 },
      uIslandDeep: { value: new Color('#167f98') },
    }),
    [clock, kind],
  )
  useEffect(() => {
    uniforms.uIslandDeep.value.set(night ? '#14364d' : '#318fa5')
  }, [night, uniforms])
  const compile = useCallback(
    (shader: WaterShader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader =
        `
      uniform float uIslandTime;
      uniform float uIslandOcean;
      varying vec3 vIslandPosition;
    ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
      #include <begin_vertex>
      transformed.z += uIslandOcean * sin(position.x * 0.6 + position.y * 0.4 + uIslandTime * 0.5) * 0.025;
      vIslandPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `,
        )
      shader.fragmentShader =
        `
      uniform float uIslandTime;
      uniform float uIslandOcean;
      uniform float uIslandFall;
      uniform vec3 uIslandDeep;
      varying vec3 vIslandPosition;
    ` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
      #include <color_fragment>
      vec2 p = vIslandPosition.xz;
      float tide = sin(p.x * 0.65 + p.y * 1.15 - uIslandTime * 0.65 + sin(p.x * 0.3 + uIslandTime * 0.2) * 0.8);
      float band = smoothstep(0.6, 0.98, tide) * 0.018;
      float deep = smoothstep(9.0, 32.0, length(p * vec2(0.8, 1.0)));
      diffuseColor.rgb = mix(diffuseColor.rgb, uIslandDeep, deep * uIslandOcean * 0.65);
      diffuseColor.rgb += band;
      if (uIslandFall > 0.5) {
        float streak = smoothstep(0.45, 0.95, sin(vIslandPosition.x * 34.0 + vIslandPosition.y * 0.5));
        float flow = smoothstep(0.1, 0.95, sin(vIslandPosition.y * 5.0 + uIslandTime * 5.0));
        diffuseColor.rgb += streak * 0.22 + flow * 0.09;
      }
    `,
        )
    },
    [uniforms],
  )
  return (
    <meshStandardMaterial
      color={night ? '#22516d' : kind === 'fall' ? '#8ddce0' : kind === 'ocean' ? '#209ec1' : '#2bafc2'}
      roughness={kind === 'fall' ? 0.25 : 0.35}
      metalness={0.12}
      transparent={kind === 'fall'}
      opacity={kind === 'fall' ? 0.94 : 1}
      emissive={kind === 'fall' ? '#2e96b8' : '#000000'}
      emissiveIntensity={0.15}
      side={kind === 'fall' ? DoubleSide : undefined}
      onBeforeCompile={compile}
      customProgramCacheKey={() => 'island-water-v1'}
    />
  )
}
