import type { Art, BollardArt, GlyphArt, PlateArt, PoleArt, RoadLineArt } from "@/lib/types";

/**
 * Draws a card's `art` description as SVG.
 *
 * These are deliberately schematic rather than photographic: the point is to
 * show the features the meta actually turns on (band positions, strip colours,
 * line colour and dash rhythm) with everything else stripped away. They also
 * mean the app works before any photo has been sourced.
 */
export function Schematic({ art, className }: { art: Art; className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center ${className ?? ""}`}>
      {render(art)}
    </div>
  );
}

/**
 * Every schematic is wrapped in this rather than sizing its own <svg>.
 *
 * The `width`/`height` attributes matter more than they look: an inline SVG
 * carrying only a viewBox has no intrinsic size, and `height: 100%` against a
 * parent sized by `min-height` resolves to `auto`. Chromium falls back to the
 * default replaced-element size and still paints something; WebKit collapses
 * the element to zero and the card renders blank. Giving the SVG real
 * intrinsic dimensions means the worst case is "drawn at its natural size"
 * instead of "invisible".
 */
function Frame({
  vw,
  vh,
  width,
  orientation,
  children,
}: {
  vw: number;
  vh: number;
  /** Intrinsic width in px; height follows from the viewBox ratio. */
  width: number;
  orientation: "tall" | "wide";
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={width}
      height={Math.round((width * vh) / vw)}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      className={
        orientation === "tall"
          ? "block h-full max-h-full w-auto max-w-full"
          : "block h-auto max-h-full w-full max-w-full"
      }
    >
      {children}
    </svg>
  );
}

function render(art: Art) {
  switch (art.kind) {
    case "bollard":
      return <Bollard art={art} />;
    case "plate":
      return <Plate art={art} />;
    case "roadline":
      return <RoadLine art={art} />;
    case "pole":
      return <Pole art={art} />;
    case "glyph":
      return <Glyph art={art} />;
  }
}

/* ---------------------------------------------------------------- bollard */

function Bollard({ art }: { art: BollardArt }) {
  const W = 120;
  const H = 260;
  const postW = art.shape === "square" ? 44 : 34;
  const x = (W - postW) / 2;
  const top = 14;
  const bottom = H - 26;
  const postH = bottom - top;

  const clipId = `bollard-clip-${hash(JSON.stringify(art))}`;

  return (
    <Frame vw={W} vh={H} width={148} orientation="tall">
      <defs>
        <clipPath id={clipId}>
          <BollardBody art={art} x={x} y={top} w={postW} h={postH} />
        </clipPath>
      </defs>

      {/* ground line */}
      <rect x={0} y={bottom} width={W} height={3} rx={1.5} className="fill-line" />

      <BollardBody art={art} x={x} y={top} w={postW} h={postH} stroke />

      <g clipPath={`url(#${clipId})`}>
        {(art.bands ?? []).map((band, i) => (
          <rect
            key={i}
            x={x - 4}
            y={top + (postH * band.top) / 100}
            width={postW + 8}
            height={(postH * band.height) / 100}
            fill={band.color}
          />
        ))}
      </g>

      {art.reflector ? <Reflector art={art} x={x} y={top} w={postW} h={postH} /> : null}
    </Frame>
  );
}

function BollardBody({
  art,
  x,
  y,
  w,
  h,
  stroke,
}: {
  art: BollardArt;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: boolean;
}) {
  const common = {
    fill: art.body,
    ...(stroke ? { stroke: "rgba(0, 0, 0, 0.28)", strokeWidth: 1 } : {}),
  };

  if (art.shape === "domed") {
    return <path d={`M ${x} ${y + w / 2} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 L ${x + w} ${y + h} L ${x} ${y + h} Z`} {...common} />;
  }
  if (art.shape === "slanted") {
    return <path d={`M ${x} ${y + 16} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`} {...common} />;
  }
  if (art.shape === "tapered") {
    const inset = w * 0.18;
    return <path d={`M ${x + inset} ${y} L ${x + w - inset} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`} {...common} />;
  }
  // flat and square
  return <rect x={x} y={y} width={w} height={h} rx={art.shape === "square" ? 1 : 3} {...common} />;
}

function Reflector({ art, x, y, w, h }: { art: BollardArt; x: number; y: number; w: number; h: number }) {
  const r = art.reflector;
  if (!r) return null;
  const cy = y + (h * r.top) / 100;
  if (r.shape === "circle") {
    return <circle cx={x + w / 2} cy={cy + 8} r={7} fill={r.color} stroke="rgba(0, 0, 0, 0.25)" strokeWidth={1} />;
  }
  if (r.shape === "strip") {
    return <rect x={x + 5} y={cy} width={w - 10} height={26} rx={2} fill={r.color} stroke="rgba(0, 0, 0, 0.25)" strokeWidth={1} />;
  }
  return <rect x={x + 7} y={cy} width={w - 14} height={15} rx={1.5} fill={r.color} stroke="rgba(0, 0, 0, 0.25)" strokeWidth={1} />;
}

/* ------------------------------------------------------------------ plate */

function Plate({ art }: { art: PlateArt }) {
  const ratio = art.ratio ?? "eu";
  const W = 360;
  const H = ratio === "us" ? 180 : ratio === "jp" ? 180 : 80;
  const stripW = 34;
  const bandH = art.topBand ? (ratio === "eu" ? 22 : 46) : 0;

  return (
    <Frame vw={W} vh={H} width={480} orientation="wide">
      <rect
        x={3}
        y={3}
        width={W - 6}
        height={H - 6}
        rx={8}
        fill={art.bg}
        stroke={art.border ?? "rgba(0, 0, 0, 0.25)"}
        strokeWidth={art.border ? 7 : 1.5}
      />

      {art.topBand ? (
        <>
          <rect x={5} y={5} width={W - 10} height={bandH} rx={5} fill={art.topBand.color} />
          <text
            x={W / 2}
            y={bandH / 2 + 8}
            textAnchor="middle"
            fill={art.topBand.textColor}
            fontSize={ratio === "eu" ? 15 : 22}
            fontWeight={700}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            letterSpacing={1.5}
          >
            {art.topBand.text}
          </text>
        </>
      ) : null}

      {art.leftStrip ? <Strip art={art.leftStrip} x={5} y={5 + bandH} w={stripW} h={H - 10 - bandH} /> : null}
      {art.rightStrip ? <Strip art={art.rightStrip} x={W - 5 - stripW} y={5 + bandH} w={stripW} h={H - 10 - bandH} /> : null}

      <text
        x={W / 2}
        y={bandH + (H - bandH) / 2 + (ratio === "eu" ? 12 : 18)}
        textAnchor="middle"
        fill={art.fg}
        fontSize={ratio === "eu" ? 36 : 54}
        fontWeight={700}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing={2}
      >
        {art.text}
      </text>
    </Frame>
  );
}

function Strip({
  art,
  x,
  y,
  w,
  h,
}: {
  art: NonNullable<PlateArt["leftStrip"]>;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={art.color} />
      {art.text ? (
        <text
          x={x + w / 2}
          y={y + h - 10}
          textAnchor="middle"
          fill={art.textColor ?? "#ffffff"}
          fontSize={15}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {art.text}
        </text>
      ) : null}
    </g>
  );
}

/* --------------------------------------------------------------- roadline */

function RoadLine({ art }: { art: RoadLineArt }) {
  const W = 360;
  const H = 220;

  return (
    <Frame vw={W} vh={H} width={480} orientation="wide">
      <rect x={0} y={0} width={W} height={H} rx={6} fill={art.surface} />
      <Line style={art.edge.style} color={art.edge.color} x={34} h={H} />
      <Line style={art.edge.style} color={art.edge.color} x={W - 34} h={H} />
      <Line style={art.center.style} color={art.center.color} x={W / 2} h={H} center />
    </Frame>
  );
}

function Line({
  style,
  color,
  x,
  h,
  center,
}: {
  style: RoadLineArt["edge"]["style"];
  color: string;
  x: number;
  h: number;
  center?: boolean;
}) {
  if (style === "none") return null;
  const w = center ? 6 : 5;
  const dash = style === "dashed" ? "26 20" : undefined;

  if (style === "double") {
    return (
      <g>
        <line x1={x - 6} y1={0} x2={x - 6} y2={h} stroke={color} strokeWidth={w} />
        <line x1={x + 6} y1={0} x2={x + 6} y2={h} stroke={color} strokeWidth={w} />
      </g>
    );
  }
  return <line x1={x} y1={0} x2={x} y2={h} stroke={color} strokeWidth={w} strokeDasharray={dash} />;
}

/* ------------------------------------------------------------------- pole */

function Pole({ art }: { art: PoleArt }) {
  const W = 200;
  const H = 260;
  const cx = W / 2;
  const top = 16;
  const bottom = H - 22;

  const arms = Array.from({ length: Math.max(art.crossarms, 0) }, (_, i) => top + 18 + i * 26);

  return (
    <Frame vw={W} vh={H} width={246} orientation="tall">
      <rect x={0} y={bottom} width={W} height={3} rx={1.5} className="fill-line" />

      {art.profile === "a-frame" ? (
        <g stroke={art.material} strokeWidth={9} strokeLinecap="round">
          <line x1={cx - 26} y1={bottom} x2={cx - 4} y2={top} />
          <line x1={cx + 26} y1={bottom} x2={cx + 4} y2={top} />
          <line x1={cx - 17} y1={bottom - 90} x2={cx + 17} y2={bottom - 90} strokeWidth={6} />
        </g>
      ) : art.profile === "tapered" ? (
        <path d={`M ${cx - 6} ${top} L ${cx + 6} ${top} L ${cx + 14} ${bottom} L ${cx - 14} ${bottom} Z`} fill={art.material} />
      ) : art.profile === "lattice" ? (
        <g stroke={art.material} strokeWidth={5}>
          <line x1={cx - 20} y1={bottom} x2={cx - 7} y2={top} />
          <line x1={cx + 20} y1={bottom} x2={cx + 7} y2={top} />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={cx - 18 + i * 2} y1={bottom - i * 46} x2={cx + 18 - i * 2} y2={bottom - (i + 0.6) * 46} strokeWidth={3} />
          ))}
        </g>
      ) : (
        <rect
          x={cx - (art.profile === "square" ? 12 : 9)}
          y={top}
          width={art.profile === "square" ? 24 : 18}
          height={bottom - top}
          rx={art.profile === "square" ? 1 : 9}
          fill={art.material}
        />
      )}

      {arms.map((y, i) => (
        <g key={i}>
          <rect x={cx - 52} y={y} width={104} height={6} rx={3} fill={art.arm} />
          <circle cx={cx - 44} cy={y - 5} r={4} fill={art.arm} />
          <circle cx={cx} cy={y - 5} r={4} fill={art.arm} />
          <circle cx={cx + 44} cy={y - 5} r={4} fill={art.arm} />
        </g>
      ))}

      {/* suggestion of wires running off-frame */}
      {arms.length > 0 && arms[0] !== undefined ? (
        <g stroke={art.arm} strokeWidth={1.5} opacity={0.6}>
          <path d={`M 0 ${arms[0] - 16} Q ${cx} ${arms[0] + 4} ${W} ${arms[0] - 16}`} fill="none" />
          <path d={`M 0 ${arms[0] - 8} Q ${cx} ${arms[0] + 12} ${W} ${arms[0] - 8}`} fill="none" />
        </g>
      ) : null}
    </Frame>
  );
}

/* ------------------------------------------------------------------ glyph */

function Glyph({ art }: { art: GlyphArt }) {
  const S = 220;
  const c = S / 2;
  const shape = art.shape ?? "square";

  const outline =
    shape === "circle" ? (
      <circle cx={c} cy={c} r={c - 10} fill={art.bg} stroke="rgba(0, 0, 0, 0.2)" strokeWidth={2} />
    ) : shape === "diamond" ? (
      <path d={`M ${c} 10 L ${S - 10} ${c} L ${c} ${S - 10} L 10 ${c} Z`} fill={art.bg} stroke="rgba(0, 0, 0, 0.2)" strokeWidth={2} />
    ) : shape === "triangle" ? (
      <path d={`M ${c} 18 L ${S - 14} ${S - 30} L 14 ${S - 30} Z`} fill={art.bg} stroke={art.fg} strokeWidth={14} strokeLinejoin="round" />
    ) : shape === "octagon" ? (
      <path d={octagon(c, c, c - 10)} fill={art.bg} stroke="rgba(0, 0, 0, 0.2)" strokeWidth={2} />
    ) : (
      <rect x={10} y={10} width={S - 20} height={S - 20} rx={16} fill={art.bg} stroke="rgba(0, 0, 0, 0.2)" strokeWidth={2} />
    );

  // A red ring on a white circle is the European speed-limit sign; draw the
  // ring rather than relying on a thick stroke so the number stays readable.
  const isRinged = shape === "circle" && art.bg.toLowerCase() === "#ffffff";

  const textFill = shape === "triangle" ? art.fg : art.fg;
  const dy = shape === "triangle" ? 34 : 0;
  const size = art.glyph.length > 5 ? 34 : art.glyph.length > 2 ? 46 : 68;

  return (
    <Frame vw={S} vh={S} width={280} orientation="tall">
      {outline}
      {isRinged ? <circle cx={c} cy={c} r={c - 20} fill="none" stroke={art.fg} strokeWidth={20} /> : null}
      <text
        x={c}
        y={c + dy}
        dominantBaseline="central"
        textAnchor="middle"
        fill={isRinged ? "#141414" : textFill}
        fontSize={size}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {art.glyph}
      </text>
    </Frame>
  );
}

function octagon(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  });
  return `M ${pts.join(" L ")} Z`;
}

/** Small stable hash so clipPath ids do not collide across cards on a page. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
