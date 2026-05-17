import { lazy } from "react";

export const LazyShaderBackground = lazy(() =>
  import("./ShaderBackground").then((mod) => ({ default: mod.ShaderBackground })),
);

export const LazyLiquidLogo = lazy(() => import("./LiquidLogo").then((mod) => ({ default: mod.LiquidLogo })));

export const LazyScoreOrb = lazy(() => import("./ScoreOrb").then((mod) => ({ default: mod.ScoreOrb })));

