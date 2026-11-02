/**
 * OWLY — OwlyMascot Component
 * Mascotte hibou pixel art flottante — OWLY maître de quête
 * DEBUG MODE ACTIVE
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  talking?: boolean;
  pose?: "idle" | "thinking" | "happy" | "curious";
  statusLabel?: string;
}

const POSE_EMOJI: Record<NonNullable<Props["pose"]>, string> = {
  idle: "🦉",
  thinking: "🤔",
  happy: "✨",
  curious: "👁️",
};

const POSE_GLOW: Record<NonNullable<Props["pose"]>, string> = {
  idle: "#a855f7",
  thinking: "#00f5ff",
  happy: "#ffd700",
  curious: "#ff006e",
};

export function OwlyMascot({ talking = false, pose = "idle", statusLabel }: Props) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [floatOffset, setFloatOffset] = useState(0);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const mascotRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const startTime = useRef(Date.now());

  // Float animation
  useEffect(() => {
    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setFloatOffset(Math.sin(elapsed * 1.5) * 5);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Drag handlers
  function onPointerDown(e: React.PointerEvent) {
    if (!mascotRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = mascotRef.current.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const x = e.clientX - dragOffset.current.dx;
    const y = e.clientY - dragOffset.current.dy;
    setPosition({ x: Math.max(0, x), y: Math.max(0, y) });
  }

  function onPointerUp() {
    setDragging(false);
  }

  const glowColor = POSE_GLOW[pose];
  const emoji = talking ? "💬" : POSE_EMOJI[pose];

  return (
    <div
      ref={mascotRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: position.x,
        bottom: position.y,
        zIndex: 1000,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        transform: `translateY(${floatOffset}px)`,
        transition: dragging ? "none" : "transform 0.1s linear",
      }}
      aria-label={statusLabel ?? "OWLY le hibou"}
      role="img"
    >
      {/* Mascot body */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: `rgba(10,10,26,0.9)`,
          border: `2px solid ${glowColor}`,
          boxShadow: `0 0 16px ${glowColor}66, 0 0 32px ${glowColor}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 30,
          position: "relative",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        {emoji}

        {/* Talking indicator */}
        {talking && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#a855f7",
              border: "2px solid #0a0a1a",
              animation: "owly-pulse 1s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Status label */}
      {statusLabel && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: 6,
            background: "rgba(10,10,26,0.95)",
            border: `1px solid ${glowColor}55`,
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 10,
            color: glowColor,
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            boxShadow: `0 0 8px ${glowColor}33`,
          }}
        >
          {statusLabel}
        </div>
      )}

      <style>{`
        @keyframes owly-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
