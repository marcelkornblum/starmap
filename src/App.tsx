import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import './App.css'

function SpinningStar() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x += delta * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[2, 0]} />
      <meshStandardMaterial color="#646cff" wireframe />
    </mesh>
  )
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', margin: 0, padding: 0 }}>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', zIndex: 10 }}>
        <h1 style={{ margin: 0 }}>Starmap</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Awaiting coordinates...</p>
      </div>
      
      <Canvas camera={{ position: [0, 0, 10] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <SpinningStar />
      </Canvas>
    </div>
  )
}

export default App
