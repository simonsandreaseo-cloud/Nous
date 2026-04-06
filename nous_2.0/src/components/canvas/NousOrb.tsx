import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial } from "@react-three/drei";
import { Mesh, Group } from "three";
import { useAppStore } from "@/store/useAppStore";
import { useNodeStore } from "@/store/useNodeStore";
import { useSpring, animated, config } from "@react-spring/three";

// Custom Shader Material for the glowing 3D mass of light
const blobVertexShader = `
  uniform float uTime;
  varying vec3 vNormal;
  
  // Basic 3D Noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    
    // Create displacement based on 3D noise and time
    float noise = snoise(vec3(position * 3.5 + uTime * 0.8)); // Increased frequency for more detail
    
    vec3 newPosition = position + normal * noise * 0.18;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const blobFragmentShader = `
  varying vec3 vNormal;
  uniform vec3 uColor;
  
  void main() {
    // Pure emissive white blob with NO structural shadows
    // Using simple view direction fresnel to soften edges, preventing dark banding
    float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
    fresnel = clamp(fresnel, 0.0, 1.0);
    
    // Smoothstep for very soft edges
    float alpha = smoothstep(0.0, 1.0, fresnel);
    
    // Override entirely to pure white
    gl_FragColor = vec4(vec3(1.0), alpha);
  }
`;

const BG_COLOR = new THREE.Color("#ffffff");

function SurfaceWaves({ isCrawling }: { isCrawling: boolean }) {
    const groupRef = useRef<Group>(null!);
    const smoothedMouse = useRef(new THREE.Vector2());
    
    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        const { mouse } = state; // Normalized mouse coordinates (-1 to +1)

        // Frame-rate independent dampening of mouse movement
        const dampFactor = 1 - Math.exp(-10 * delta);
        smoothedMouse.current.lerp(mouse, dampFactor);

        if (groupRef.current) {
            // Mouse Influence: Tilt the whole light group slightly towards the cursor
            // Add smoothed mouse offset EXACTLY onto the continuous time-based rotation
            // This prevents the frame-rate dependent "lag/saltos" caused by lerping to a moving target
            const baseY = t * (isCrawling ? 1.5 : 0.8);
            const baseX = t * (isCrawling ? 0.8 : 0.3);

            groupRef.current.rotation.y = baseY + (smoothedMouse.current.x * 0.5);
            groupRef.current.rotation.x = baseX + (smoothedMouse.current.y * -0.5);
            groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.5;
            
            // Pulse intensities to create "waves" of light
            groupRef.current.children.forEach((child, i) => {
                const light = child as THREE.PointLight;
                // Sine wave pulse between 20 and 120 intensity
                const pulse = Math.sin(t * 2.5 + i * 2.1) * 0.5 + 0.5; 
                light.intensity = 20 + pulse * 100;
                
                // Slight orbit variation distance so it feels more organic
                const distOffset = Math.cos(t * 1.5 + i) * 0.2;
                const rad = 1.1 + distOffset;
                
                // Distribute 3 lights evenly in a circle on XY plane
                const angle = (i / 3) * Math.PI * 2;
                
                // Target position in orbit
                const tx = Math.cos(angle) * rad;
                const ty = Math.sin(angle) * rad;
                const tz = Math.sin(t + i) * 0.5;

                // Influence each light slightly towards the smoothed mouse world-space relative to the orb
                // We keep a small offset (+ 0.001) to avoid NaN/Parkinson issues at absolute center
                light.position.x = tx + (smoothedMouse.current.x * 0.2) + 0.001;
                light.position.y = ty + (smoothedMouse.current.y * 0.2) + 0.001;
                light.position.z = tz + 0.001;
            });
        }
    });

    return (
        <group ref={groupRef}>
            {/* Very strong localized lights near the inner surface parameter */}
            <pointLight distance={6} color="#ffffff" decay={1.5} />
            <pointLight distance={6} color="#ffffff" decay={1.5} />
            <pointLight distance={6} color="#ffffff" decay={1.5} />
        </group>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CoreLight({ emissive, isCrawling }: { emissive: any, isCrawling: boolean }) {
    const meshRef = useRef<Mesh>(null!);
    
    const materialRef = useRef<THREE.ShaderMaterial>(null!);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
    }), []);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = t * (isCrawling ? 1.5 : 0.8);
        }
        
        if (meshRef.current) {
            // Gentle continuous rotation
            meshRef.current.rotation.x += delta * 0.8;
            meshRef.current.rotation.y += delta * 0.5;
            meshRef.current.rotation.z += delta * 0.2;
        }
    });

    return (
        <group>
            {/* Central massive core light */}
            <animated.pointLight
                intensity={isCrawling ? 60 : 35}
                distance={15}
                color={emissive as unknown as string}
                decay={1.5}
                position={[0, 0, 0]}
            />
            {/* Powerful dynamic waves of light passing across the inside of the shell */}
            <SurfaceWaves isCrawling={isCrawling} />

            {/* The amorphous glowing 3D blob */}
            <mesh ref={meshRef}>
                {/* High segment count for smooth geometric distortion */}
                <sphereGeometry args={[0.25, 128, 128]} />
                <shaderMaterial 
                    ref={materialRef}
                    vertexShader={blobVertexShader}
                    fragmentShader={blobFragmentShader}
                    uniforms={uniforms}
                    transparent={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            

        </group>
    );
}

export function NousOrb() {
    const orbRef = useRef<Mesh>(null!);
    const hoveredItem = useAppStore((state) => state.hoveredItem);
    const trend = useAppStore((state) => state.neuralTrend);

    // Node State
    const nodeStatus = useNodeStore((state) => state.status);
    const isConnected = useNodeStore((state) => state.isConnected);

    const [isBursting, setIsBursting] = useState(false);

    const handleDoubleClick = () => {
        setIsBursting(true);
        if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate([100, 30, 100]);
        }
        setTimeout(() => setIsBursting(false), 2000);
    };

    const { springScale } = useSpring({
        springScale: isBursting ? 1.4 : hoveredItem ? 1.05 : 1,
        config: isBursting
            ? { mass: 1, tension: 500, friction: 10 }
            : { mass: 1, tension: 170, friction: 26 }
    });

    useEffect(() => {
        return () => { document.body.style.cursor = "auto"; };
    }, []);

    // --- State Mapping ---
    // 'IDLE' | 'CRAWLING' | 'PROCESSING' | 'ERROR'

    const visualState = useMemo(() => {
        if (!isConnected) return { color: "#ffffff", distort: 0.15, speed: 0.8, emissive: "#a0c0e0", opacity: 0.12, rim: "#60d0ff" };

        switch (nodeStatus) {
            case 'IDLE':
                return {
                    color: trend === 'down' ? "#ffffff" : "#ffffff",
                    emissive: trend === 'down' ? "#f43f5e" : "#38bdf8",
                    distort: 0.4,
                    speed: 2,
                    opacity: 0.18,
                    rim: trend === 'down' ? "#ff6080" : "#40ffb0",
                };
            case 'CRAWLING':
                return { color: "#ffffff", emissive: "#9333ea", distort: 0.8, speed: 8, opacity: 0.30, rim: "#c080ff" };
            case 'DOWNLOADING':
                return { color: "#ffffff", emissive: "#3b82f6", distort: 0.5, speed: 5, opacity: 0.22, rim: "#10b981" };
            case 'PROCESSING':
                return { color: "#ffffff", emissive: "#f97316", distort: 0.6, speed: 4, opacity: 0.25, rim: "#ff9040" };
            case 'ERROR':
                return { color: "#ffffff", emissive: "#ef4444", distort: 1.2, speed: 0.5, opacity: 0.40, rim: "#ff4040" };
            default:
                return { color: "#ffffff", emissive: "#38bdf8", distort: 0.4, speed: 2, opacity: 0.18, rim: "#40ffb0" };
        }
    }, [nodeStatus, isConnected, trend]);

    const springProps = useSpring({
        color: visualState.color,
        emissive: visualState.emissive,
        distort: visualState.distort,
        speed: visualState.speed,
        opacity: visualState.opacity ?? 0.12,
        config: config.molasses
    });

    return (
        <Float
            speed={nodeStatus === 'CRAWLING' ? 5 : 2}
            rotationIntensity={nodeStatus === 'CRAWLING' ? 1.5 : 0.2}
            floatIntensity={0.5}
            floatingRange={[-0.1, 0.1]}
        >
            <group position={[0, 1.2, 0]}>

                {/* Main Orb — Advanced MeshTransmissionMaterial for realistic frosted glass refractions */}
                <animated.mesh
                    ref={orbRef}
                    scale={springScale as unknown as number}
                    onDoubleClick={handleDoubleClick}
                    onPointerOver={() => (document.body.style.cursor = "pointer")}
                    onPointerOut={() => (document.body.style.cursor = "auto")}
                >
                    <sphereGeometry args={[1.5, 64, 64]} />
                    {/* RESTORING STABLE RENDER: We MUST explicitly define the background color in MeshTransmissionMaterial 
                        otherwise it falls back to black rendering (no scene background is detected in pure fiber setups).
                        We balance ior to 1.15 to keep reflections without harsh edges, and use resolution=512 for quality. */}
                    <MeshTransmissionMaterial
                        background={BG_COLOR}
                        color="#ffffff"
                        roughness={0.18}      // Smooth but slightly textured
                        transmission={1.0}    // Fully transmissive
                        thickness={2.0}       // Thick volume for internal bouncing
                        ior={1.15}            // Balanced IOR to prevent extreme edge curving (which causes black edges) but keep reflections
                        backside={true}       // Allows internal reflections
                        distortion={0.3}      
                        distortionScale={0.4} 
                        temporalDistortion={0.08} 
                        chromaticAberration={0.05} 
                        resolution={256}      // Performance optimization applied ONLY to resolution to prevent render stalling causing tics, the material stays visually "thick" and beautiful
                        anisotropy={0.1}
                    />
                </animated.mesh>

                {/* Dynamic technological internal light */}
                <CoreLight emissive={springProps.emissive} isCrawling={nodeStatus === 'CRAWLING'} />

            </group>
        </Float>
    );
}
