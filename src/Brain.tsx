import * as THREE from "three";
import { useRef, useEffect, useState } from "react";
import { useGLTF, MeshDistortMaterial, useCursor } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { useFrame, useThree } from "@react-three/fiber";

type GLTFResult = GLTF & {
  nodes: {
    Material2006: THREE.Mesh;
  };
};

export function Brain(props: JSX.IntrinsicElements["group"]) {
  const { nodes } = useGLTF("/brain.glb") as GLTFResult;
  const pointsRef = useRef<THREE.Points>(null);
  const brainRef = useRef<THREE.Mesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  console.log(nodes);
  // State for hover effect
  const [hovered, setHovered] = useState(false);

  // Shader material for points
  const shaderMaterial = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uMouse: { value: new THREE.Vector2(0.0, 0.0) },
        hoverEffectSize: { value: 0.3 },
        pointTexture: {
          value: new THREE.TextureLoader().load("/triangle.png"),
        },
      },
      vertexShader: `
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float hoverEffectSize;
  varying float vDist;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vec3 transformedPosition = position;
    vPosition = transformedPosition;

    // Convert uMouse to object space to match rotation
    vec4 mouseInObjectSpace = modelViewMatrix * vec4(uMouse, 0.0, 1.0);

    // Calculate distance to the mouse in object space
    vec2 pointPos = (modelViewMatrix * vec4(transformedPosition, 1.0)).xy;
    vDist = distance(pointPos, mouseInObjectSpace.xy);

    // Control gl_PointSize based on distance to mouse
    gl_PointSize = mix(10.0, 50.0, smoothstep(hoverEffectSize, 0.0, vDist));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformedPosition, 1.0);
    vUv = position.xy;
  }
`,

      fragmentShader: `
      varying float vDist;
      uniform float uTime;
      uniform float hoverEffectSize;
      uniform sampler2D pointTexture;
      varying vec3 vPosition;
      varying vec2 vUv;

      void main() {
        vec3 color;
        // Determine color based on position
        if (vPosition.y > 0.5) {
          color = vec3(0.26, 0.56, 0.79);
        } else if (vPosition.x > 0.5) {
          color = vec3(0.56, 0.82, 0.95);
        } else if (vPosition.z > 0.5) {
          color = vec3(0.08, 0.27, 0.52);
        } else if (vPosition.y < 0.5 && vPosition.x < 0.5 && vPosition.z < 0.5) {
          color = vec3(0.52, 0.77, 0.92);
        } else {
          color = vec3(10.0 / 255.0, 1.0 / 255.0, 240.0 / 255.0);
        }

        // Rotate texture based on time
        float angle = uTime;
        vec2 center = vec2(0.5, 0.5);
        vec2 rotatedCoord = gl_PointCoord - center;
        rotatedCoord = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rotatedCoord;
        rotatedCoord += center;

        // Calculate distortion factor based on distance
        float distortionFactor = smoothstep(0.0, hoverEffectSize, vDist);
        float finalDistortion = mix(0.4, 0.1, distortionFactor); // Closer to mouse => lower distortion speed
        vec3 hoverColor = vec3(1.0);
        color = mix(hoverColor, color, smoothstep(0.0, hoverEffectSize, vDist));

        vec4 textureColor = texture2D(pointTexture, rotatedCoord);
        if (textureColor.a < 0.1) discard;
        gl_FragColor = vec4(color, textureColor.a) * textureColor;
      }
    `,
      transparent: true,
    })
  ).current;

  useFrame(({ clock }) => {
    shaderMaterial.uniforms.uTime.value = clock.getElapsedTime();
  });

  const handleMouseMove = (event: MouseEvent) => {
    const { width, height } = size;
    shaderMaterial.uniforms.uMouse.value.set(
      (event.clientX / width) * 2 - 1,
      -(event.clientY / height) * 2 + 1
    );
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [size]);

  const blackMaterial = new THREE.MeshBasicMaterial({
    color: "white",
    opacity: 0.8,
  });

  // Hover events
  const handlePointerEnter = () => setHovered(true);
  const handlePointerLeave = () => setHovered(false);
  useCursor(hovered);

  return (
    <group {...props} dispose={null}>
      <points
        ref={pointsRef}
        geometry={nodes.Material2006.geometry}
        material={shaderMaterial}
      />
      <mesh
        ref={brainRef}
        geometry={nodes.Material2006.geometry}
        material={blackMaterial}
        scale={[0.9, 0.9, 0.9]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Hover effect using MeshDistortMaterial */}
      <mesh
        ref={hoverMeshRef}
        geometry={nodes.Material2006.geometry}
        scale={[1.05, 1.05, 1.05]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <MeshDistortMaterial
          color="white"
          distort={0.3} // Set this to the dynamic value based on mouse position
          speed={2.5} // Set this to a dynamic speed based on mouse position
          transparent={true}
          opacity={0.14}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload("/brain.glb");