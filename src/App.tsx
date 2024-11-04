import { OrbitControls } from "@react-three/drei";
import "./App.css";
import { Brain } from "./Brain";
import { Canvas } from "@react-three/fiber";

function App() {
  return (
    <div className=" bg-red-500" style={{ height: "100vh" }}>
      <Canvas>
        <Brain />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
