"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "orbit.theme.almanac";

function apply(theme: string) {
  const next = theme === "night" ? "night" : "day";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage may be unavailable */
  }
  (window as any).OrbitNative?.setAppearance?.(
    next === "day" ? "paper" : "night",
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("night");

  useEffect(() => {
    let saved = "night";
    try {
      saved = localStorage.getItem(KEY) === "day" ? "day" : "night";
    } catch {
      saved = "night";
    }
    setTheme(saved);
    apply(saved);
  }, []);

  function toggle() {
    const next = theme === "day" ? "night" : "day";
    setTheme(next);
    apply(next);
  }

  return (
    <button
      className="alm-icon theme-toggle"
      aria-label={theme === "day" ? "切换到夜观" : "切换到日光"}
      title={theme === "day" ? "夜观" : "日光"}
      onClick={toggle}
    >
      {theme === "day" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
