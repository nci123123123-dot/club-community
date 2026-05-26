"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getRepository } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LotteryModalProps {
  onClose: () => void;
  studentId: string;
}

// 4 alternating sectors: WIN(0-90), LOSE(90-180), WIN(180-270), LOSE(270-360)
const WIN_FILL = "#f59e0b";  // amber-500
const LOSE_FILL = "#64748b"; // slate-500

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function WheelSVG() {
  const cx = 100;
  const cy = 100;
  const outerR = 96;
  const innerR = 16;

  const sectors = [
    { start: 0, end: 90, fill: WIN_FILL, emoji: "🎉" },
    { start: 90, end: 180, fill: LOSE_FILL, emoji: "☕" },
    { start: 180, end: 270, fill: WIN_FILL, emoji: "🎉" },
    { start: 270, end: 360, fill: LOSE_FILL, emoji: "☕" },
  ];

  return (
    <svg viewBox="0 0 200 200" className="size-full">
      {sectors.map((s) => {
        const p1 = polarToXY(cx, cy, outerR, s.start);
        const p2 = polarToXY(cx, cy, outerR, s.end);
        const large = s.end - s.start > 180 ? 1 : 0;
        const mid = polarToXY(cx, cy, 62, (s.start + s.end) / 2);

        return (
          <g key={s.start}>
            <path
              d={`M ${cx},${cy} L ${p1.x},${p1.y} A ${outerR},${outerR} 0 ${large},1 ${p2.x},${p2.y} Z`}
              fill={s.fill}
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="26"
              style={{ userSelect: "none" }}
            >
              {s.emoji}
            </text>
          </g>
        );
      })}
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="white" strokeWidth="3" />
      {/* Center cap */}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      <circle cx={cx} cy={cy} r={innerR - 3} fill="#f1f5f9" />
    </svg>
  );
}

export function LotteryModal({ onClose, studentId }: LotteryModalProps) {
  const { t } = useT();
  const [phase, setPhase] = useState<"spinning" | "result">("spinning");
  const [won, setWon] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "result" && won) {
      void getRepository().addLotteryWin(studentId).catch(() => undefined);
    }
  }, [phase, won, studentId]);

  useEffect(() => {
    const isWin = Math.random() < 0.5;
    setWon(isWin);

    // CSS rotate(Xdeg) clockwise → the part originally at (360 - X % 360) is under the top pointer.
    // WIN sectors: 0-90, 180-270 → need (360 - offset) in those ranges
    // → offset in [270-360] hits sector 0-90, offset in [90-180] hits sector 180-270
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    let landOffset: number;
    if (isWin) {
      landOffset =
        Math.random() < 0.5
          ? 285 + Math.random() * 60 // pointer lands in WIN sector 0-90
          : 105 + Math.random() * 60; // pointer lands in WIN sector 180-270
    } else {
      landOffset =
        Math.random() < 0.5
          ? 195 + Math.random() * 60 // pointer lands in LOSE sector 90-180
          : 15 + Math.random() * 60; // pointer lands in LOSE sector 270-360
    }

    const totalDeg = fullSpins * 360 + landOffset;

    if (wheelRef.current) {
      const el = wheelRef.current;
      // Reset to a known starting state with no transition
      el.style.transition = "none";
      el.style.transform = "rotate(0deg)";
      // Force a style recalculation so the browser commits the "from" state
      // before the animated transition is applied. Without this flush, the
      // browser batches both changes into one style update and skips animation.
      void el.offsetWidth;
      el.style.transition = `transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)`;
      el.style.transform = `rotate(${totalDeg}deg)`;
    }

    const timer = setTimeout(() => setPhase("result"), 3800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex w-80 flex-col items-center gap-5 rounded-2xl bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("common.close")}
        >
          <X className="size-4" />
        </button>

        <h2 className="text-lg font-bold">{t("lottery.title")}</h2>

        {/* Wheel + fixed pointer */}
        <div className="relative size-56">
          {/* Downward-pointing triangle fixed at top center */}
          <div
            className="absolute left-1/2 z-10 -translate-x-1/2"
            style={{
              top: 2,
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "18px solid #ef4444",
            }}
          />
          {/* Spinning wheel */}
          <div
            ref={wheelRef}
            className="size-full overflow-hidden rounded-full shadow-lg ring-4 ring-white/20"
          >
            <WheelSVG />
          </div>
        </div>

        {/* Status text */}
        {phase === "spinning" ? (
          <p className="animate-pulse text-sm text-muted-foreground">
            {t("lottery.spinning")}
          </p>
        ) : (
          <p
            className={cn(
              "text-center text-xl font-bold",
              won ? "text-amber-500" : "text-slate-500"
            )}
          >
            {won ? t("lottery.win") : t("lottery.lose")}
          </p>
        )}

        {phase === "result" && (
          <Button className="w-full" onClick={onClose}>
            {t("common.close")}
          </Button>
        )}
      </div>
    </div>
  );
}
