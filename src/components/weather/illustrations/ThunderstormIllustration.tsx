import type { SVGProps } from 'react'

export function ThunderstormIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="thunderstorm-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8996A8" />
          <stop offset="100%" stopColor="#5C6B7E" />
        </linearGradient>
      </defs>
      <path
        d="M32 68c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20C33.3 17 43.3 9 55 9c13 0 23.8 9.8 25.4 22.4C90.1 33.1 97.5 41.5 97.5 51.7c0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#thunderstorm-cloud)"
      />
      <g stroke="#4A7FC4" strokeWidth="5" strokeLinecap="round">
        <line x1="38" y1="86" x2="33" y2="98" />
        <line x1="86" y1="86" x2="81" y2="98" />
      </g>
      <path d="M67 78 L52 100 L63 100 L55 116 L79 92 L66 92 Z" fill="#FFC94A" stroke="#E8A62B" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
