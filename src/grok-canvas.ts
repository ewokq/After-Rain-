export type { CSSProperties, MouseEvent, PointerEvent } from "react";
export { useEffect, useRef, useState } from "react";

/**
 * Static dark theme. The game only reads the fields listed in NOTES.md.
 * Extra tokens stay filled in so the object still looks like a full dark theme.
 */
const darkTheme = {
  kind: "dark" as const,
  bg: {
    base: "#07090d",
    subtle: "#10141a",
    elevated: "#141820",
  },
  text: {
    primary: "#e8eef2",
    secondary: "rgba(232, 238, 242, 0.62)",
    tertiary: "rgba(232, 238, 242, 0.42)",
    onColor: "#06120f",
    onPrimary: "#06120f",
    accent: "#7ee8ff",
    success: "#7dffb3",
    warning: "#ffd27a",
    danger: "#ff8b8b",
    accentDeep: "#b7e8ff",
    successDeep: "#c6ffe0",
    warningDeep: "#ffe7b8",
    dangerDeep: "#ffc8c8",
  },
  fill: {
    primary: "#e8eef2",
    primaryHover: "#ffffff",
    secondary: "rgba(232, 238, 242, 0.14)",
    secondaryHover: "rgba(232, 238, 242, 0.24)",
    hover: "rgba(232, 238, 242, 0.08)",
    pressed: "rgba(232, 238, 242, 0.12)",
    accent: "#3df5d0",
    controlChecked: "#3df5d0",
    accentSubtle: "rgba(61, 245, 208, 0.17)",
    successSubtle: "rgba(125, 255, 179, 0.17)",
    warningSubtle: "rgba(255, 210, 122, 0.17)",
    dangerSubtle: "rgba(255, 139, 139, 0.17)",
  },
  border: {
    subtle: "rgba(232, 238, 242, 0.08)",
    weak: "rgba(232, 238, 242, 0.10)",
    default: "rgba(232, 238, 242, 0.16)",
    strong: "rgba(232, 238, 242, 0.30)",
    focus: "rgba(232, 238, 242, 0.40)",
  },
  font: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  weight: {
    regular: 400 as const,
    medium: 500 as const,
    semibold: 600 as const,
  },
  radius: {
    sm: 4 as const,
    md: 8 as const,
    lg: 12 as const,
    xl: 16 as const,
    full: 9999 as const,
  },
  motion: {
    hover: "120ms",
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
};

export function useGrokTheme(): typeof darkTheme {
  return darkTheme;
}
