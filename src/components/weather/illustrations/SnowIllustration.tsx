import type { SVGProps } from 'react'

export function SnowIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="snow-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EDF3FA" />
          <stop offset="100%" stopColor="#CBD9EA" />
        </linearGradient>
      </defs>
      <path
        d="M32 74c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20C33.3 23 43.3 15 55 15c13 0 23.8 9.8 25.4 22.4C90.1 39.1 97.5 47.5 97.5 57.7c0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#snow-cloud)"
      />
      <g fill="#8FB6E8">
        <circle cx="40" cy="94" r="4.5" />
        <circle cx="60" cy="102" r="4.5" />
        <circle cx="80" cy="94" r="4.5" />
        <circle cx="50" cy="110" r="3.5" />
        <circle cx="70" cy="110" r="3.5" />
      </g>
    </svg>
  )
}
