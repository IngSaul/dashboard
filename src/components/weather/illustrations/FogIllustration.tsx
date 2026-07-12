import type { SVGProps } from 'react'

export function FogIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="fog-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4E9EF" />
          <stop offset="100%" stopColor="#C6CFDA" />
        </linearGradient>
      </defs>
      <path
        d="M34 58c-10 0-18-8-18-18 0-9.4 7.2-17.2 16.4-18C33.3 12.6 42.4 5 53 5c11.7 0 21.4 8.8 22.8 20.1C84.5 26.6 91 34.1 91 43.2c0 10.1-8.3 18.4-18.5 18.4H34z"
        fill="url(#fog-cloud)"
        opacity="0.9"
      />
      <g stroke="#9FB0C4" strokeWidth="6" strokeLinecap="round" opacity="0.8">
        <line x1="18" y1="80" x2="102" y2="80" />
        <line x1="28" y1="94" x2="92" y2="94" />
        <line x1="14" y1="108" x2="106" y2="108" />
      </g>
    </svg>
  )
}
