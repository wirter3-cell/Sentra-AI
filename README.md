# Nurun: 3D company website

A scroll-driven, real-time 3D website for **Nurun** (a Desert Technologies company).
As the visitor scrolls, a drone-style camera flies across one continuous desert
site at golden hour:

| # | Section | Scene |
|---|---------|-------|
| 0 | Hero | Utility-scale solar field with single-axis trackers |
| 1 | Platform | Down an aisle between tracker rows, into the sun |
| 2 | Nurun Power | Battery energy storage yard, live energy flow lines |
| 3 | Nurun Mobility | Solar carport with EV chargers and charging cars |
| 4 | Nurun Engineering | Survey grid + a tracker row that assembles on scroll |
| 5 | Contact | Wide aerial of the whole site |

## Stack
Next.js 15 (static export) · React Three Fiber · drei · postprocessing (AO, bloom, ACES) · Lenis smooth scroll.

## Run
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static site in ./out (host on any static host / CDN)
```
Append `?still` to the URL to disable camera smoothing (useful for screenshots).

## Where things live
- `lib/content.ts`: all copy and links
- `lib/layout.ts`: station positions, camera shots, sun direction
- `components/scene/*`: 3D scene (procedural models, sky, lighting, effects)
- `components/ui/*`: HTML overlay (nav, sections, loader)
- `scripts/prepare-car.mjs`: strips third-party logos from the car model (`npm run assets:car`)

Performance: devices with small or touch screens, or 4 or fewer CPU cores, get a lighter tier
(fewer rows, smaller shadow maps, no AO, lower DPR).

## Third-party assets
- **Car**: "Car Concept" by Eric Chadwick, © Darmstadt Graphics Group GmbH, from the Khronos glTF Sample Assets,
  licensed **CC BY 4.0**. Modified: Khronos/3D Commerce logos removed, recoloured, compressed. Attribution is shown in the site footer and must stay.
- **HDRI**: `venice_sunset_1k.hdr` from Poly Haven (CC0).
- **PV module texture** (`public/textures/pv-module.jpg`): supplied by Nurun (edited reference), baked glare removed.
- Everything else (trackers, battery containers, transformer/PCS, inverter skid, chargers, carport, sand, sky) is built in code;
  surface details (doors, signage, fan grilles, screens) are drawn in `lib/equipment.ts`, matched to Nurun's reference sheet.

Model studio: `/studio?m=<model>&v=<view>` renders a single model (`pv-module`, `solar-tracker`, `battery-container`,
`pcs-transformer`, `ev-charger`, `solar-carport`, `inverter-skid`; views `threequarter`, `front`, `side`, `rear`, `top`).

## To do before launch
- Replace the placeholder wordmark (`components/ui/Wordmark.tsx`) with the official Nurun logo SVG.
- Brand font: the current site uses Sequel Sans (commercial). This build uses Inter Tight as a free stand-in; swap it if you hold a web licence.
- Add real project references and figures (none were invented here).
