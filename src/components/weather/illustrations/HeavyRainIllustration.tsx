import type { SVGProps } from 'react'

export function HeavyRainIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="heavy-rain-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9B7C9" />
          <stop offset="100%" stopColor="#7C8CA0" />
        </linearGradient>
      </defs>
      <path
        d="M32 72c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20C33.3 21 43.3 13 55 13c13 0 23.8 9.8 25.4 22.4C90.1 37.1 97.5 45.5 97.5 55.7c0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#heavy-rain-cloud)"
      />
      <g stroke="#4A7FC4" strokeWidth="6" strokeLinecap="round">
        <line x1="36" y1="88" x2="30" y2="104" />
        <line x1="54" y1="88" x2="48" y2="104" />
        <line x1="72" y1="88" x2="66" y2="104" />
        <line x1="90" y1="88" x2="84" y2="104" />
      </g>
    </svg>
  )
}
