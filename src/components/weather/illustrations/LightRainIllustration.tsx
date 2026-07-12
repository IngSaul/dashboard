import type { SVGProps } from 'react'

export function LightRainIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="light-rain-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DDE6F0" />
          <stop offset="100%" stopColor="#B9C7D9" />
        </linearGradient>
      </defs>
      <path
        d="M32 76c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20C33.3 25 43.3 17 55 17c13 0 23.8 9.8 25.4 22.4C90.1 41.1 97.5 49.5 97.5 59.7c0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#light-rain-cloud)"
      />
      <g stroke="#6FA3E0" strokeWidth="5" strokeLinecap="round">
        <line x1="42" y1="92" x2="37" y2="104" />
        <line x1="62" y1="92" x2="57" y2="104" />
        <line x1="82" y1="92" x2="77" y2="104" />
      </g>
    </svg>
  )
}
