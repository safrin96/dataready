import { useEffect, useMemo, useRef, useState } from "react";

import { liquidFragSource } from "./liquidFragSource";

const vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 vUv;
void main() {
  vUv = .5 * (a_position + 1.);
  gl_Position = vec4(a_position, 0.0, 1.0);
}` as const;

type LiquidLogoParams = {
  patternScale: number;
  refraction: number;
  edge: number;
  patternBlur: number;
  liquid: number;
  speed: number;
};

const defaultParams: LiquidLogoParams = {
  patternScale: 0.45,
  refraction: 0.85,
  edge: 0.6,
  patternBlur: 0.08,
  liquid: 0.9,
  speed: 1,
};

function createShader(gl: WebGL2RenderingContext, source: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function getUniforms(program: WebGLProgram, gl: WebGL2RenderingContext) {
  const out: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(program, i)?.name;
    if (!name) continue;
    const loc = gl.getUniformLocation(program, name);
    if (loc) out[name] = loc;
  }
  return out;
}

async function loadImageData(src: string, size = 256): Promise<ImageData> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load logo image."));
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2d context unavailable.");
  }
  const ratio = img.width / img.height;
  const w = ratio >= 1 ? size : Math.floor(size * ratio);
  const h = ratio >= 1 ? Math.floor(size / ratio) : size;
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
  return ctx.getImageData(0, 0, size, size);
}

export function LiquidLogo({
  alt = "DataReady",
  className,
  src = "/brand/dataready-logo.png",
  size = 44,
}: {
  alt?: string;
  className?: string;
  src?: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);
  const [gl, setGl] = useState<WebGL2RenderingContext | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation>>({});
  const totalAnimationTime = useRef(0);
  const lastRenderTime = useRef(0);

  const params = useMemo(() => defaultParams, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const imageData = await loadImageData(src, 256);
        if (!mounted) return;

        const canvasEl = canvasRef.current;
        const gl = canvasEl?.getContext("webgl2", { antialias: true, alpha: true });
        if (!canvasEl || !gl) {
          setSupported(false);
          return;
        }

        const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = createShader(gl, liquidFragSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        if (!program || !vertexShader || !fragmentShader) {
          setSupported(false);
          return;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          setSupported(false);
          return;
        }

        gl.useProgram(program);
        const uniforms = getUniforms(program, gl);
        uniformsRef.current = uniforms;

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          imageData.width,
          imageData.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          imageData.data,
        );

        uniforms.u_image_texture && gl.uniform1i(uniforms.u_image_texture, 0);
        uniforms.u_ratio && gl.uniform1f(uniforms.u_ratio, 1);
        uniforms.u_img_ratio && gl.uniform1f(uniforms.u_img_ratio, imageData.width / imageData.height);

        setGl(gl);
      } catch {
        setSupported(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [src]);

  useEffect(() => {
    if (!gl) return;
    const uniforms = uniformsRef.current;

    uniforms.u_edge && gl.uniform1f(uniforms.u_edge, params.edge);
    uniforms.u_patternBlur && gl.uniform1f(uniforms.u_patternBlur, params.patternBlur);
    uniforms.u_patternScale && gl.uniform1f(uniforms.u_patternScale, params.patternScale);
    uniforms.u_refraction && gl.uniform1f(uniforms.u_refraction, params.refraction);
    uniforms.u_liquid && gl.uniform1f(uniforms.u_liquid, params.liquid);
    uniforms.u_time && gl.uniform1f(uniforms.u_time, 0);

    const canvasEl = canvasRef.current;
    if (canvasEl) {
      const side = 256;
      canvasEl.width = side * devicePixelRatio;
      canvasEl.height = side * devicePixelRatio;
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    }
  }, [gl, params]);

  useEffect(() => {
    if (!gl) return;
    const glCtx = gl;
    const uniforms = uniformsRef.current;
    let raf = 0;

    function render(now: number) {
      const delta = now - lastRenderTime.current;
      lastRenderTime.current = now;
      totalAnimationTime.current += delta * params.speed;
      uniforms.u_time && glCtx.uniform1f(uniforms.u_time, totalAnimationTime.current);
      glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }

    lastRenderTime.current = performance.now();
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [gl, params.speed]);

  if (!supported) {
    return <img alt={alt} className={className} height={size} src={src} width={size} />;
  }

  return (
    <canvas
      aria-label={alt}
      className={className}
      height={size}
      ref={canvasRef}
      role="img"
      style={{ width: size, height: size }}
      width={size}
    />
  );
}
