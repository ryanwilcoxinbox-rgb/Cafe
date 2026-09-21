import { useId, type ReactNode } from 'react'
import type { BrewerType } from '../data/types'

const EDGE = { stroke: 'var(--glass-edge)', strokeWidth: 1.4, strokeLinejoin: 'round' as const }
const STEEL = { fill: 'var(--steel)', stroke: 'var(--steel-dark)', strokeWidth: 1.2, strokeLinejoin: 'round' as const }
const PLASTIC = '#45403c'

function useClip() {
  return 'c' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

function Svg({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label={label}>
      {children}
    </svg>
  )
}

/** Falling drips, used while brewing. */
function Drips({ x, from, to }: { x: number; from: number; to: number }) {
  return (
    <g fill="var(--coffee)">
      {[0, 0.6, 1.2].map((delay) => (
        <circle key={delay} cx={x} r="1.6" cy={from} opacity="0">
          <animate attributeName="cy" from={from} to={to} dur="1.8s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function Stream({ x, from, to }: { x: number; from: number; to: number }) {
  return (
    <line x1={x} x2={x} y1={from} y2={to} stroke="var(--steel)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 4">
      <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.6s" repeatCount="indefinite" />
    </line>
  )
}

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
      {[-10, 0, 10].map((dx, i) => (
        <path key={dx} d={`M${x + dx} ${y} c-5 -7 5 -11 0 -18 c-4 -6 3 -9 1 -14`}>
          <animate attributeName="opacity" values="0;0.9;0" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" from="0 4" to="0 -6" dur="3s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
        </path>
      ))}
    </g>
  )
}

export function V60Art({ className, brewing }: ArtProps) {
  const clip = useClip()
  const server = 'M46 70 L74 70 L74 78 C92 84 97 100 93 114 C90 124 81 129 60 129 C39 129 30 124 27 114 C23 100 28 84 46 78 Z'
  return (
    <Svg className={className} label="V60 pour-over">
      <defs>
        <clipPath id={clip}>
          <path d={server} />
        </clipPath>
      </defs>
      <path d={server} fill="var(--glass)" {...EDGE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={brewing ? 108 : 102} width="120" height="40" fill="var(--coffee)">
          {brewing && <animate attributeName="y" from="124" to="104" dur="40s" fill="freeze" />}
        </rect>
      </g>
      <path d="M89 86 C104 88 104 110 91 114" fill="none" stroke="var(--wood)" strokeWidth="5" strokeLinecap="round" />
      <rect x="43" y="70" width="34" height="7" rx="2" fill="var(--wood)" />
      <rect x="38" y="62" width="44" height="6" rx="2" fill="var(--paper)" {...EDGE} />
      <path d="M98 28 C113 30 111 47 93 47" fill="none" stroke="var(--glass-edge)" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 22 L100 22 L74 62 L46 62 Z" fill="var(--paper)" {...EDGE} />
      <g stroke="var(--glass-edge)" strokeWidth="1" opacity="0.8">
        <path d="M33 27 L50 58" />
        <path d="M46 27 L55 58" />
        <path d="M74 27 L65 58" />
        <path d="M87 27 L70 58" />
      </g>
      <ellipse cx="60" cy="22" rx="40" ry="5" fill="var(--paper)" {...EDGE} />
      <ellipse cx="60" cy="22.5" rx="33" ry="3.3" fill="var(--coffee)" opacity="0.9" />
      {brewing && (
        <>
          <Stream x={60} from={-2} to={21} />
          <Drips x={60} from={69} to={104} />
        </>
      )}
    </Svg>
  )
}

export function ChemexArt({ className, brewing }: ArtProps) {
  const clip = useClip()
  const bulb = 'M52 70 C40 82 22 98 22 114 C22 128 36 134 60 134 C84 134 98 128 98 114 C98 98 80 82 68 70 Z'
  return (
    <Svg className={className} label="Chemex">
      <defs>
        <clipPath id={clip}>
          <path d={bulb} />
        </clipPath>
      </defs>
      <path d={bulb} fill="var(--glass)" {...EDGE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="110" width="120" height="30" fill="var(--coffee)">
          {brewing && <animate attributeName="y" from="132" to="108" dur="60s" fill="freeze" />}
        </rect>
      </g>
      <path d="M28 14 L92 14 L68 70 L52 70 Z" fill="var(--glass)" {...EDGE} />
      <path d="M33 10 L87 10 L66 54 L54 54 Z" fill="var(--paper)" {...EDGE} />
      <path d="M44 28 L76 28 L65 52 L55 52 Z" fill="var(--coffee)" opacity="0.9" />
      <path d="M42 56 L78 56 L69 70 L80 85 L40 85 L51 70 Z" fill="var(--wood)" />
      <path d="M46 62 L74 62 M46 79 L74 79" stroke="var(--coffee)" strokeWidth="0.8" opacity="0.35" />
      <path d="M60 70 Q54 78 52 92" fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.7" />
      <circle cx="52" cy="94" r="3" fill="var(--wood)" stroke="var(--coffee)" strokeWidth="0.6" />
      {brewing && (
        <>
          <Stream x={60} from={-4} to={28} />
          <Drips x={60} from={72} to={108} />
        </>
      )}
    </Svg>
  )
}

export function AeroPressArt({ className, brewing }: ArtProps) {
  return (
    <Svg className={className} label="AeroPress">
      <path d="M29 108 L91 108 L88 133 Q87.5 137 83 137 L37 137 Q32.5 137 32 133 Z" fill="var(--sunk)" {...EDGE} />
      <path d="M90 114 C103 114 103 131 88 131" fill="none" stroke="var(--glass-edge)" strokeWidth="4" strokeLinecap="round" />
      <rect x="46" y={brewing ? 18 : 12} width="28" height="32" rx="2" fill="var(--glass-edge)" opacity="0.75">
        {brewing && <animate attributeName="y" values="18;18;34" keyTimes="0;0.8;1" dur="150s" fill="freeze" />}
      </rect>
      <rect x="40" y={brewing ? 13 : 7} width="40" height="7" rx="3.5" fill={PLASTIC}>
        {brewing && <animate attributeName="y" values="13;13;29" keyTimes="0;0.8;1" dur="150s" fill="freeze" />}
      </rect>
      <rect x="42" y="40" width="36" height="62" rx="2" fill="var(--glass)" {...EDGE} />
      <rect x="43" y="64" width="34" height="37" fill="var(--coffee)" opacity="0.92" />
      <rect x="43" y="64" width="34" height="3" fill="var(--crema)" opacity="0.7" />
      <g stroke="var(--glass-edge)" strokeWidth="1.2">
        {[52, 62, 72, 82].map((y) => (
          <path key={y} d={`M46 ${y} h6`} />
        ))}
      </g>
      <rect x="34" y="37" width="52" height="5" rx="2.5" fill={PLASTIC} />
      <rect x="39" y="100" width="42" height="8" rx="2" fill={PLASTIC} />
      {brewing && <Drips x={60} from={109} to={120} />}
    </Svg>
  )
}

export function MokaArt({ className, brewing }: ArtProps) {
  return (
    <Svg className={className} label="Moka pot">
      <path d="M86 44 L104 46 Q108 47 107 52 L100 80 Q99 83 95 82 L80 78" fill="var(--ink)" />
      <path d="M42 88 L78 88 L90 132 L30 132 Z" {...STEEL} />
      <g stroke="var(--steel-dark)" strokeWidth="0.9" opacity="0.55">
        <path d="M51 88 L46 132" />
        <path d="M60 88 L60 132" />
        <path d="M69 88 L74 132" />
      </g>
      <path d="M44 90 L36 130" stroke="#fff" strokeWidth="2" opacity="0.35" />
      <circle cx="73" cy="108" r="3" fill="var(--steel-dark)" />
      <rect x="40" y="82" width="40" height="7" rx="1" fill="var(--steel-dark)" />
      <path d="M34 40 L86 40 L78 82 L42 82 Z" {...STEEL} />
      <g stroke="var(--steel-dark)" strokeWidth="0.9" opacity="0.55">
        <path d="M47 40 L50 82" />
        <path d="M60 40 L60 82" />
        <path d="M73 40 L70 82" />
      </g>
      <path d="M38 43 L44 79" stroke="#fff" strokeWidth="2" opacity="0.35" />
      <path d="M34 40 L21 32 L27 45 L37 52 Z" {...STEEL} />
      <path d="M33 40 Q60 22 87 40 Z" {...STEEL} />
      <rect x="55" y="23" width="10" height="7" rx="2.5" fill="var(--ink)" />
      {brewing && <Steam x={60} y={20} />}
    </Svg>
  )
}

export function FrenchPressArt({ className, brewing }: ArtProps) {
  return (
    <Svg className={className} label="French press">
      <path d="M82 44 H95 Q104 44 104 53 V101 Q104 111 95 111 H82" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinejoin="round" />
      <rect x="34" y="36" width="48" height="90" rx="3" fill="var(--glass)" {...EDGE} />
      <rect x="35" y="60" width="46" height="65" fill="var(--coffee)" opacity="0.94" />
      <rect x="35" y="60" width="46" height="5" fill="var(--crema)" opacity={brewing ? 0.9 : 0.55} />
      <rect x="57" y="4" width="2.6" height={brewing ? 46 : 48} fill="var(--steel-dark)" />
      <rect x="36" y={brewing ? 48 : 50} width="44" height="3" rx="1.5" fill="var(--steel-dark)" />
      <rect x="31" y="32" width="54" height="7" rx="2" {...STEEL} />
      <rect x="30" y="24" width="56" height="10" rx="4" fill="var(--ink)" />
      <circle cx="58.3" cy="6" r="6" fill="var(--ink)" />
      <rect x="30" y="123" width="56" height="9" rx="2.5" {...STEEL} />
      <path d="M37 40 V120" stroke="#fff" strokeWidth="2" opacity="0.4" />
      {brewing && <Steam x={58} y={20} />}
    </Svg>
  )
}

export function ColdBrewArt({ className, brewing }: ArtProps) {
  const clip = useClip()
  const jug = 'M32 36 Q32 26 42 26 L78 26 Q88 26 88 36 L88 124 Q88 134 78 134 L42 134 Q32 134 32 124 Z'
  return (
    <Svg className={className} label="Hario cold brew jug">
      <defs>
        <clipPath id={clip}>
          <path d={jug} />
        </clipPath>
      </defs>
      <path d={jug} fill="var(--glass)" {...EDGE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="56" width="120" height="90" fill="var(--coffee)" opacity="0.8">
          {brewing && <animate attributeName="opacity" from="0.25" to="0.8" dur="60s" fill="freeze" />}
        </rect>
      </g>
      <rect x="47" y="30" width="26" height="80" rx="11" fill="var(--steel)" stroke="var(--steel-dark)" strokeWidth="1" opacity="0.95" />
      <g stroke="var(--steel-dark)" strokeWidth="0.7" opacity="0.6">
        {[40, 48, 56, 64, 72, 80, 88, 96].map((y) => (
          <path key={y} d={`M49 ${y} h22`} />
        ))}
      </g>
      <rect x="50" y="58" width="20" height="49" rx="9" fill="var(--coffee)" />
      <path d="M36 40 V122" stroke="#fff" strokeWidth="2" opacity="0.4" />
      <rect x="29" y="16" width="62" height="14" rx="5" fill="var(--accent)" />
      <rect x="52" y="11" width="16" height="6" rx="2" fill="var(--accent)" />
      <g fill="var(--paper)" opacity="0.85">
        <rect x="38" y="70" width="7" height="7" rx="1.5" transform="rotate(12 41 73)" />
        <rect x="76" y="84" width="6" height="6" rx="1.5" transform="rotate(-18 79 87)" />
      </g>
    </Svg>
  )
}

export function DripArt({ className, brewing }: ArtProps) {
  const clip = useClip()
  const body = '#3a3431'
  const trim = '#4d4541'
  const carafe = 'M30 72 L64 72 L66 78 C73 84 75 97 73 110 C72 118 67 122 59 122 L35 122 C27 122 22 118 21 110 C19 97 21 84 28 78 Z'
  return (
    <Svg className={className} label="Filter coffee machine">
      <defs>
        <clipPath id={clip}>
          <path d={carafe} />
        </clipPath>
      </defs>
      {/* Tower with the water tank window */}
      <rect x="74" y="16" width="30" height="112" rx="5" fill={body} stroke="var(--glass-edge)" strokeWidth="0.8" />
      <rect x="81" y="30" width="16" height="54" rx="3" fill="var(--glass)" stroke="var(--glass-edge)" strokeWidth="0.8" />
      <rect x="82" y={brewing ? 58 : 44} width="14" height={brewing ? 25 : 39} rx="2" fill="#9fc3d6" opacity="0.55">
        {brewing && <animate attributeName="y" from="44" to="72" dur="60s" fill="freeze" />}
        {brewing && <animate attributeName="height" from="39" to="11" dur="60s" fill="freeze" />}
      </rect>
      <g stroke="var(--glass-edge)" strokeWidth="0.7" opacity="0.8">
        {[40, 50, 60, 70].map((y) => (
          <path key={y} d={`M83 ${y} h4`} />
        ))}
      </g>
      <circle cx="89" cy="108" r="3.2" fill={brewing ? 'var(--accent)' : trim} />
      {/* Head and filter basket */}
      <rect x="14" y="12" width="90" height="28" rx="7" fill={body} stroke="var(--glass-edge)" strokeWidth="0.8" />
      <path d="M24 40 L70 40 L63 58 L31 58 Z" fill={trim} stroke="var(--glass-edge)" strokeWidth="0.8" />
      <path d="M32 44 L62 44" stroke="var(--glass-edge)" strokeWidth="0.7" opacity="0.6" />
      {/* Hotplate and base */}
      <rect x="12" y="122" width="94" height="10" rx="3" fill={body} stroke="var(--glass-edge)" strokeWidth="0.8" />
      <rect x="22" y="120" width="50" height="3" rx="1.5" fill={trim} />
      {/* Carafe */}
      <path d={carafe} fill="var(--glass)" {...EDGE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={brewing ? 112 : 96} width="120" height="40" fill="var(--coffee)">
          {brewing && <animate attributeName="y" from="118" to="96" dur="60s" fill="freeze" />}
        </rect>
      </g>
      <rect x="27" y="66" width="40" height="8" rx="3" fill={body} />
      <path d="M68 82 C82 82 83 108 69 111" fill="none" stroke={body} strokeWidth="5" strokeLinecap="round" />
      <path d="M26 86 V114" stroke="#fff" strokeWidth="2" opacity="0.35" />
      {brewing && <Drips x={47} from={60} to={94} />}
    </Svg>
  )
}

export function CupArt({ className }: { className?: string }) {
  const clip = useClip()
  const body = 'M20 54 L100 54 L95 116 C94 127 86 133 76 133 L44 133 C34 133 26 127 25 116 Z'
  const speckles = [
    [34, 70], [52, 64], [78, 72], [44, 88], [68, 94], [86, 90], [36, 104], [58, 110], [80, 108], [48, 76], [62, 80], [90, 62],
  ]
  return (
    <Svg className={className} label="A cup of coffee">
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      <Steam x={60} y={42} />
      <path d="M97 66 C120 66 121 104 91 108" fill="none" stroke="var(--glass-edge)" strokeWidth="11" strokeLinecap="round" />
      <path d="M97 66 C120 66 121 104 91 108" fill="none" stroke="#eee4d6" strokeWidth="8" strokeLinecap="round" />
      <path d={body} fill="#eee4d6" {...EDGE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="120" width="120" height="20" fill="#cfae8c" />
        <path d="M0 120 q15 -3 30 0 t30 0 t30 0 t30 0" fill="#eee4d6" />
      </g>
      <g fill="#8b6a52" opacity="0.55">
        {speckles.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />
        ))}
      </g>
      <ellipse cx="60" cy="54" rx="40" ry="7.5" fill="#eee4d6" {...EDGE} />
      <ellipse cx="60" cy="55" rx="35" ry="5.5" fill="var(--coffee)" />
      <ellipse cx="52" cy="54" rx="10" ry="1.6" fill="var(--crema)" opacity="0.5" />
    </Svg>
  )
}

export function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M6 34 C12 26 20 18 34 6" />
      <path d="M34 6 C34 20 26 30 12 30 C12 18 20 10 34 6 Z" />
      <path d="M16 26 L24 22 M20 22 L27 16" opacity="0.7" />
    </svg>
  )
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 3 C16 3 6 14 6 20 A10 10 0 0 0 26 20 C26 14 16 3 16 3 Z" fill="var(--accent)" />
      <g fill="none" stroke="var(--accent-ink)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M11 21 A5 5 0 0 1 21 21" />
        <path d="M13.5 22 A2.5 2.5 0 0 1 18.5 22" />
        <path d="M9 18.5 C10.5 14 13 11 16 8.5" opacity="0.8" />
      </g>
    </svg>
  )
}

interface ArtProps {
  className?: string
  brewing?: boolean
}

const MAP: Record<BrewerType, (p: ArtProps) => ReactNode> = {
  v60: V60Art,
  chemex: ChemexArt,
  aeropress: AeroPressArt,
  moka: MokaArt,
  frenchpress: FrenchPressArt,
  coldbrew: ColdBrewArt,
  drip: DripArt,
}

export function BrewerArt({ type, ...props }: ArtProps & { type: BrewerType }) {
  const Art = MAP[type]
  return <Art {...props} />
}
