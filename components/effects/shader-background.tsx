"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

type ShaderParams = {
  hue: number;
  speed: number;
  intensity: number;
  complexity: number;
};

function useThrottledCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) return;
      callbackRef.current(...args);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
      }, delay);
    },
    [delay],
  );
}

function useShaderAnimation(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  params: ShaderParams,
  interactive: boolean,
) {
  const { hue, speed, intensity, complexity } = params;
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  const throttledMouseMove = useThrottledCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePos.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }, 16);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_hue;
      uniform float u_speed;
      uniform float u_intensity;
      uniform float u_complexity;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
      }

      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 10; i++) {
          if (float(i) >= u_complexity) break;
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float t = u_time * u_speed * 0.1;
        float mouse_dist = distance(uv, u_mouse);
        float warp = smoothstep(0.5, 0.0, mouse_dist) * 0.5;
        vec2 p = uv * 2.0 + vec2(t, t * 0.5) + warp;
        float noise_pattern = fbm(p);
        float vignette = 1.0 - smoothstep(0.8, 1.5, length(uv));
        float saturation = 0.6 + noise_pattern * 0.4;
        float value = 0.2 + (noise_pattern * 0.8) * u_intensity * vignette;
        vec3 color = hsv2rgb(vec3(u_hue / 360.0, saturation, value));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const hueLocation = gl.getUniformLocation(program, "u_hue");
    const speedLocation = gl.getUniformLocation(program, "u_speed");
    const intensityLocation = gl.getUniformLocation(program, "u_intensity");
    const complexityLocation = gl.getUniformLocation(program, "u_complexity");

    let animationFrameId = 0;
    const startTime = performance.now();

    const render = () => {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(timeLocation, (performance.now() - startTime) * 0.001);
      gl.uniform2f(mouseLocation, mousePos.current.x, mousePos.current.y);
      gl.uniform1f(hueLocation, hue);
      gl.uniform1f(speedLocation, speed);
      gl.uniform1f(intensityLocation, intensity);
      gl.uniform1f(complexityLocation, complexity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    if (interactive) {
      window.addEventListener("mousemove", throttledMouseMove);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactive) {
        window.removeEventListener("mousemove", throttledMouseMove);
      }
      if (!gl.isContextLost()) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [hue, speed, intensity, complexity, canvasRef, throttledMouseMove, interactive]);
}

export type ShaderBackgroundProps = {
  hue?: number;
  speed?: number;
  intensity?: number;
  complexity?: number;
  interactive?: boolean;
  className?: string;
  overlayClassName?: string;
};

/** Full-bleed animated WebGL background. Falls back gracefully if WebGL unavailable. */
export function ShaderBackground({
  hue = 220,
  speed = 0.3,
  intensity = 0.9,
  complexity = 5,
  interactive = true,
  className,
  overlayClassName,
}: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useShaderAnimation(canvasRef, { hue, speed, intensity, complexity }, interactive);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden no-print",
        className,
      )}
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-background/55 via-background/70 to-background/85",
          overlayClassName,
        )}
      />
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
};

function ControlSlider({ label, value, onChange, min, max, step }: SliderProps) {
  return (
    <div className="flex flex-col text-white">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium select-none">{label}</label>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-sm select-none">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-cyan-400"
      />
    </div>
  );
}

/** Playground with sliders — use on a demo page only. */
export function InteractiveShaderDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hue, setHue] = useState(210);
  const [speed, setSpeed] = useState(0.4);
  const [intensity, setIntensity] = useState(1.2);
  const [complexity, setComplexity] = useState(5);

  useShaderAnimation(
    canvasRef,
    { hue, speed, intensity, complexity },
    true,
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h1 className="select-none text-5xl font-bold text-white mix-blend-overlay md:text-8xl">
          VonWillingh
        </h1>
      </div>
      <div className="absolute bottom-4 left-1/2 w-full max-w-lg -translate-x-1/2 p-4">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/50 p-6 shadow-lg backdrop-blur-md">
          <ControlSlider
            label="Hue"
            value={hue}
            onChange={(e) => setHue(parseFloat(e.target.value))}
            min={0}
            max={360}
            step={1}
          />
          <ControlSlider
            label="Speed"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            min={0}
            max={2}
            step={0.01}
          />
          <ControlSlider
            label="Intensity"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            min={0.1}
            max={3}
            step={0.01}
          />
          <ControlSlider
            label="Complexity"
            value={complexity}
            onChange={(e) => setComplexity(parseFloat(e.target.value))}
            min={1}
            max={10}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
}
