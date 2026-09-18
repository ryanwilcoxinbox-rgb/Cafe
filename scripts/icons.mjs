// Renders the PWA icons from public/favicon.svg. Run with `npm run icons`.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile('public/favicon.svg')
const square = svg.toString().replace('rx="112"', 'rx="0"')

await sharp(svg).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/pwa-512.png')
// Maskable + Apple icons: full-bleed background, the OS applies its own mask.
const padded = square.replace('<path d="M256', '<g transform="translate(51 51) scale(0.8)"><path d="M256').replace('</g>\n</svg>', '</g></g>\n</svg>')
await sharp(Buffer.from(padded)).resize(512, 512).png().toFile('public/maskable-512.png')
await sharp(Buffer.from(square)).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('icons written')
