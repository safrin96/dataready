import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { useEffect, useMemo, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(Boolean(mq.matches));
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

export function ShaderBackground() {
  const reducedMotion = useReducedMotion();

  const settings = useMemo(() => {
    // Tuned to match the DataReady cyan/teal/green palette without overpowering UI legibility.
    return {
      color1: "#0b1020",
      color2: "#0e2a36",
      color3: "#25D0C9",
      uAmplitude: 0.85,
      uDensity: 1.4,
      uFrequency: 1.15,
      uSpeed: reducedMotion ? 0 : 0.25,
      uStrength: 1.5,
      uShadow: 0.55,
      // Keep text readable by pushing lightness down.
      uBrightness: 0.72,
      uContrast: 1.05,
      uSaturation: 1.2,
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden="true" className="shader-bg">
      <ShaderGradientCanvas
        // Keep this behind everything and prevent pointer capture.
        style={{ pointerEvents: "none" }}
      >
        <ShaderGradient {...settings} />
      </ShaderGradientCanvas>
      <div className="shader-bg-vignette" />
    </div>
  );
}

