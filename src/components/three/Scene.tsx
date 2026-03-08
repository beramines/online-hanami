import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import { Ground } from './Ground'
import { SakuraTree } from './SakuraTree'
import { SakuraPetals } from './SakuraPetals'
import { PlayerController } from './PlayerController'
import { OtherPlayers } from './OtherPlayers'
import { Lantern, Bench, StoneLantern, Pond, PicnicSet, Torii } from './Decorations'
import { Suspense } from 'react'

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 60 }}
      shadows
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.65} color="#fff5e6" />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.2}
          color="#ffe4b5"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <hemisphereLight args={['#ffd6e0', '#9ae6b4', 0.4]} />

        <Sky
          sunPosition={[100, 20, 100]}
          turbidity={0.1}
          rayleigh={0.5}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        <fog attach="fog" args={['#ffe8f0', 35, 80]} />

        <Ground />

        {/* Sakura trees - spaced out to avoid blocking players */}
        <SakuraTree position={[-6, 0, -6]} scale={1.4} />
        <SakuraTree position={[7, 0, -7]} scale={1.2} />
        <SakuraTree position={[-5, 0, 7]} scale={1.1} />
        <SakuraTree position={[9, 0, 4]} scale={1.3} />
        <SakuraTree position={[-10, 0, -12]} scale={1.5} />
        <SakuraTree position={[2, 0, -12]} scale={1.2} />
        <SakuraTree position={[14, 0, -4]} scale={1.0} />
        <SakuraTree position={[-13, 0, 3]} scale={1.3} />
        <SakuraTree position={[5, 0, 12]} scale={1.1} />
        <SakuraTree position={[-8, 0, 14]} scale={1.4} />

        {/* Torii gate at path entrance */}
        <Torii position={[0, 0, 12]} rotation={0} />

        {/* Picnic set in the center */}
        <PicnicSet position={[0, 0, 0]} />

        {/* Pond */}
        <Pond position={[12, 0, -10]} />

        {/* Benches */}
        <Bench position={[-3, 0, -3]} rotation={0.5} />
        <Bench position={[4, 0, -2]} rotation={-0.3} />
        <Bench position={[-2, 0, 4]} rotation={2.8} />

        {/* Lanterns along the path */}
        <Lantern position={[1.2, 0, 6]} />
        <Lantern position={[-1.2, 0, 9]} />
        <Lantern position={[1.2, 0, 15]} />

        {/* Stone lanterns */}
        <StoneLantern position={[-4, 0, -1]} />
        <StoneLantern position={[6, 0, 1]} />
        <StoneLantern position={[10, 0, -7]} />

        <SakuraPetals count={500} />

        <PlayerController />
        <OtherPlayers />
      </Suspense>
    </Canvas>
  )
}
