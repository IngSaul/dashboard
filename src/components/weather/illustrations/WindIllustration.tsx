import type { SVGProps } from 'react'

export function WindIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g stroke="#8FAFDB" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M14 46h58a13 13 0 1 0-11-20" />
        <path d="M14 68h74a13 13 0 1 1-11 20" />
        <path d="M14 90h48a10 10 0 1 0-8-16" />
      </g>
    </svg>
  )
}
