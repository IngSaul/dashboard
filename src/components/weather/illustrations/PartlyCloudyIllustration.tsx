import type { SVGProps } from 'react'

export function PartlyCloudyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <radialGradient id="partly-cloudy-sun" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#FFE49A" />
          <stop offset="100%" stopColor="#FFB648" />
        </radialGradient>
        <linearGradient id="partly-cloudy-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D7E3F0" />
        </linearGradient>
      </defs>
      <circle cx="76" cy="42" r="24" fill="url(#partly-cloudy-sun)" />
      <path
        d="M32 88c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20 3-11 13-19 24.7-19 13 0 23.8 9.8 25.4 22.4 9.7 1.7 17.1 10.1 17.1 20.3 0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#partly-cloudy-cloud)"
      />
    </svg>
  )
}
