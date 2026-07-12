import type { SVGProps } from 'react'

export function CloudyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="cloudy-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C7D3E0" />
          <stop offset="100%" stopColor="#AEBDCF" />
        </linearGradient>
        <linearGradient id="cloudy-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DCE5EF" />
        </linearGradient>
      </defs>
      <path
        d="M78 60c-9 0-16.6 6.6-18.1 15.2C51.8 76.4 46 82.7 46 90.4 46 98.9 52.9 106 61.3 106H86c11.6 0 21-9.4 21-21 0-11-8.5-20-19.3-20.9-1.6-.1-2.7 0-4.1.4z"
        fill="url(#cloudy-back)"
        opacity="0.9"
      />
      <path
        d="M32 84c-11 0-20-9-20-20 0-10.5 8-19.2 18.3-20C33.3 33 43.3 25 55 25c13 0 23.8 9.8 25.4 22.4C90.1 49.1 97.5 57.5 97.5 67.7c0 11.3-9.3 20.6-20.6 20.6H32z"
        fill="url(#cloudy-front)"
      />
    </svg>
  )
}
