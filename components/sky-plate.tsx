"use client";
import { useRef, useState } from "react";

const NODES = [
  { id: "today", label: "今日", x: 150, y: 142 },
  { id: "habits", label: "习惯", x: 82, y: 96 },
  { id: "ledger", label: "收支", x: 204, y: 86 },
  { id: "journal", label: "随心记", x: 228, y: 176 },
  { id: "notes", label: "备忘", x: 112, y: 208 },
];

export default function SkyPlate({ onNav }: { onNav: (page: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const wrap = useRef<HTMLElement>(null);

  function move(event: React.PointerEvent) {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    setTilt({
      x: ((event.clientX - box.left) / box.width - 0.5) * 8,
      y: ((event.clientY - box.top) / box.height - 0.5) * 8,
    });
  }

  function activate(id: string) {
    if (id === "today") onNav("today");
    else onNav(id);
  }

  return (
    <figure
      className="alm-plate sky-plate"
      ref={wrap as any}
      onPointerMove={move}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <svg viewBox="0 0 280 280" aria-label="今日星图，可点击进入五个栏目">
        <g className="sky-plate__drift" style={{ transform: `translate(${tilt.x}px, ${tilt.y}px)` }}>
          <g className="sky-plate__rings">
            <circle cx="140" cy="140" r="132" className="alm-plate__dash" />
            <circle cx="140" cy="140" r="124" className="alm-plate__faint" />
            <line x1="140" y1="8" x2="140" y2="272" className="alm-plate__faint" />
            <line x1="8" y1="140" x2="272" y2="140" className="alm-plate__faint" />
            <circle cx="140" cy="140" r="104" className="alm-plate__faint" />
            <ellipse cx="140" cy="140" rx="118" ry="44" transform="rotate(-18 140 140)" className="alm-plate__faint" />
            <g className="alm-plate__tick">
              <line x1="140" y1="16" x2="140" y2="26" />
              <line x1="140" y1="254" x2="140" y2="264" />
              <line x1="16" y1="140" x2="26" y2="140" />
              <line x1="254" y1="140" x2="264" y2="140" />
              <line x1="66" y1="40" x2="73" y2="47" />
              <line x1="207" y1="233" x2="214" y2="240" />
              <line x1="214" y1="40" x2="207" y2="47" />
              <line x1="73" y1="233" x2="66" y2="240" />
            </g>
            <circle cx="205" cy="82" r="6" className="alm-plate__sun" />
            <path d="M 62 116 a 15 15 0 1 0 14 22 a 12 12 0 1 1 -14 -22" className="alm-plate__moon" />
          </g>

          <g className="sky-plate__lines">
            <polyline points="82,96 150,142 204,86" />
            <polyline points="82,96 112,208 150,142" />
            <polyline points="112,208 228,176 204,86" />
            <line x1="150" y1="142" x2="228" y2="176" />
          </g>

          <g className="sky-plate__deco">
            {[
              [47, 62, 1.2], [232, 48, 0.9], [244, 130, 1.1], [61, 166, 0.8],
              [192, 230, 1.2], [54, 246, 0.7], [252, 224, 0.8], [118, 54, 0.7],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} className="sky-plate__minor" />
            ))}
          </g>

          {NODES.map((node) => (
            <g
              key={node.id}
              className={"sky-node" + (hover === node.id ? " is-hover" : "")}
              role="button"
              tabIndex={0}
              aria-label={`进入${node.label}`}
              onPointerEnter={() => setHover(node.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(node.id)}
              onBlur={() => setHover(null)}
              onClick={() => activate(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate(node.id);
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r="11" className="sky-node__halo" />
              <circle cx={node.x} cy={node.y} r={node.id === "today" ? 3.2 : 2.4} className="sky-node__dot" />
              <circle cx={node.x} cy={node.y} r="17" className="sky-node__hit" />
              <text x={node.x + 10} y={node.y - 9} className="sky-node__label">
                {node.label}
              </text>
            </g>
          ))}
        </g>
        <text x="140" y="17" textAnchor="middle" className="alm-plate__label">N</text>
        <text x="140" y="268" textAnchor="middle" className="alm-plate__label">S</text>
        <text x="14" y="144" textAnchor="middle" className="alm-plate__label">W</text>
        <text x="266" y="144" textAnchor="middle" className="alm-plate__label">E</text>
      </svg>
      <figcaption>
        <span>轻触星点</span>
        <i />
        <span>进入今日栏目</span>
      </figcaption>
    </figure>
  );
}
