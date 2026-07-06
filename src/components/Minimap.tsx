import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const MW = 200;
const MH = 140;

interface Props {
  excalidrawAPI: any;
}

function paint(
  canvas: HTMLCanvasElement | null,
  elements: any[],
  appState: any,
  infoRef: { current: { l: number; t: number; sc: number; ox: number; oy: number } | null }
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = MW * dpr;
  canvas.height = MH * dpr;
  ctx.scale(dpr, dpr);

  if (!elements.length) {
    infoRef.current = null;
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const x = el.x ?? 0, y = el.y ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + (el.width ?? 0));
    maxY = Math.max(maxY, y + (el.height ?? 0));
  }

  const pad = Math.max((maxX - minX) * 0.15, (maxY - minY) * 0.15, 80);
  const scL = minX - pad, scT = minY - pad;
  const scW = (maxX - minX) + pad * 2;
  const scH = (maxY - minY) + pad * 2;

  const sc = Math.min(MW / scW, MH / scH);
  const ox = (MW - scW * sc) / 2;
  const oy = (MH - scH * sc) / 2;

  infoRef.current = { l: scL, t: scT, sc, ox, oy };

  const toM = (sx: number, sy: number) => ({
    x: (sx - scL) * sc + ox,
    y: (sy - scT) * sc + oy,
  });

  const isDark = appState.theme === "dark";
  const fallback = isDark ? "#94A3B8" : "#475569";

  for (const el of elements) {
    const p = toM(el.x ?? 0, el.y ?? 0);
    const w = Math.max((el.width ?? 8) * sc, 1);
    const h = Math.max((el.height ?? 8) * sc, 1);

    const bg = el.backgroundColor;
    if (bg && bg !== "transparent" && bg !== "none") {
      ctx.fillStyle = bg.length === 7 ? bg + "55" : bg;
      ctx.fillRect(p.x, p.y, w, h);
    }
    const stroke = el.strokeColor;
    ctx.strokeStyle =
      stroke && stroke !== "transparent" && stroke !== "none"
        ? stroke + "BB"
        : fallback + "88";
    ctx.lineWidth = 0.75;
    ctx.strokeRect(p.x, p.y, w, h);
  }

  // Viewport rectangle
  const zoom = appState.zoom?.value ?? 1;
  const cW = appState.width ?? window.innerWidth;
  const cH = appState.height ?? window.innerHeight;
  const vp = toM(-appState.scrollX / zoom, -appState.scrollY / zoom);
  const vpW = (cW / zoom) * sc;
  const vpH = (cH / zoom) * sc;

  ctx.fillStyle = "rgba(8, 145, 178, 0.10)";
  ctx.fillRect(vp.x, vp.y, vpW, vpH);
  ctx.strokeStyle = "rgba(8, 145, 178, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vp.x, vp.y, vpW, vpH);
}

export default function Minimap({ excalidrawAPI }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const isDragging = useRef(false);
  const sceneInfo = useRef<{ l: number; t: number; sc: number; ox: number; oy: number } | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!excalidrawAPI || !isVisible) return;

    let lastKey = "";

    const tick = () => {
      const elements: any[] = excalidrawAPI.getSceneElements?.() ?? [];
      const appState: any = excalidrawAPI.getAppState?.() ?? {};
      const zoom = appState.zoom?.value ?? 1;
      const active = elements.filter((e: any) => !e.isDeleted);
      const key = `${Math.round(appState.scrollX ?? 0)},${Math.round(appState.scrollY ?? 0)},${zoom.toFixed(3)},${active.length}`;

      if (key !== lastKey) {
        lastKey = key;
        paint(canvasRef.current, active, appState, sceneInfo);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [excalidrawAPI, isVisible]);

  const jumpToMini = (miniX: number, miniY: number) => {
    const s = sceneInfo.current;
    if (!s || !excalidrawAPI) return;
    const scX = (miniX - s.ox) / s.sc + s.l;
    const scY = (miniY - s.oy) / s.sc + s.t;
    const appState = excalidrawAPI.getAppState?.() ?? {};
    const zoom = appState.zoom?.value ?? 1;
    const cW = appState.width ?? window.innerWidth;
    const cH = appState.height ?? window.innerHeight;
    excalidrawAPI.updateScene({
      appState: {
        scrollX: -scX * zoom + cW / 2,
        scrollY: -scY * zoom + cH / 2,
      },
    });
  };

  return (
    <div className={`minimap-container${isVisible ? "" : " minimap-collapsed"}`}>
      <div className="minimap-header">
        <button
          type="button"
          className="minimap-toggle"
          title={isVisible ? "Minimapı gizle" : "Minimapı göster"}
          onClick={() => setIsVisible((v) => !v)}
        >
          {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
      {isVisible && (
        <canvas
          ref={canvasRef}
          width={MW}
          height={MH}
          className="minimap-canvas"
          style={{ width: MW, height: MH }}
          onPointerDown={(e) => {
            isDragging.current = true;
            (e.target as Element).setPointerCapture(e.pointerId);
            const r = (e.target as Element).getBoundingClientRect();
            jumpToMini(e.clientX - r.left, e.clientY - r.top);
          }}
          onPointerMove={(e) => {
            if (!isDragging.current) return;
            const r = (e.target as Element).getBoundingClientRect();
            jumpToMini(e.clientX - r.left, e.clientY - r.top);
          }}
          onPointerUp={() => { isDragging.current = false; }}
          onPointerLeave={() => { isDragging.current = false; }}
        />
      )}
    </div>
  );
}
