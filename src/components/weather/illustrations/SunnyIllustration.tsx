import type { SVGProps } from 'react'

export function SunnyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <radialGradient id="sunny-core" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#FFE49A" />
          <stop offset="100%" stopColor="#FFB648" />
        </radialGradient>
      </defs>
      <g stroke="#FFB648" strokeWidth="5" strokeLinecap="round" opacity="0.85">
        <line x1="60" y1="10" x2="60" y2="24" />
        <line x1="60" y1="96" x2="60" y2="110" />
        <line x1="10" y1="60" x2="24" y2="60" />
        <line x1="96" y1="60" x2="110" y2="60" />
        <line x1="26" y1="26" x2="35" y2="35" />
        <line x1="85" y1="85" x2="94" y2="94" />
        <line x1="94" y1="26" x2="85" y2="35" />
        <line x1="35" y1="85" x2="26" y2="94" />
      </g>
      <circle cx="60" cy="60" r="30" fill="url(#sunny-core)" />
    </svg>
  )
}
