"use client";
import { useEffect, useState } from "react";

export default function LaunchScreen({
  ready,
  onDone,
}: {
  ready: boolean;
  onDone: () => void;
}) {
  const [elapsed, setElapsed] = useState(false),
    [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), 900);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready || !elapsed) return;
    setLeaving(true);
    const timer = setTimeout(onDone, 300);
    return () => clearTimeout(timer);
  }, [ready, elapsed, onDone]);
  return (
    <div
      className={"alm-launch " + (leaving ? "is-leaving" : "")}
      role="status"
      aria-label="星历正在展开"
    >
      <div className="alm-launch__inner">
        <div className="alm-launch__mark" aria-hidden="true">
          <svg viewBox="0 0 150 150">
            <g className="spin">
              <circle cx="75" cy="75" r="70" opacity=".45" />
              <circle cx="75" cy="75" r="70" strokeDasharray="1 8" />
            </g>
            <g className="spin-rev">
              <circle cx="75" cy="75" r="52" />
            </g>
            <circle cx="75" cy="75" r="7" fill="currentColor" stroke="none" />
            <ellipse
              cx="75"
              cy="75"
              rx="72"
              ry="26"
              transform="rotate(-22 75 75)"
              opacity=".45"
            />
            <circle cx="132" cy="40" r="3" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className="alm-kicker">ORBIT · ALMANAC</span>
        <h1>星历</h1>
        <p>把日常，写进同一片星空。</p>
        <div className="alm-launch__rule" />
        <small>{ready ? "星图已展开。" : "正在展开今日的星图…"}</small>
      </div>
    </div>
  );
}
