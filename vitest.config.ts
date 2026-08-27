import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
    ],
    exclude: ['tests/e2e/**'],
    setupFiles: ['./tests/setup.ts'],
    // Headroom for `tests/setup.ts`'s raised `asyncUtilTimeout` (widget
    // lazy-load cold-start races under real-machine CPU contention) — a
    // test with a couple of sequential `findBy*`/`waitFor` calls must not
    // hit vitest's own per-test timeout before testing-library's own
    // polling window would have given up.
    testTimeout: 10000,
    // Addresses the actual root cause behind that same race, rather than
    // just outrunning it with a longer timeout: this repo's default worker
    // count (~cpus-1) means dozens of jsdom integration tests compile/
    // transform widget chunks concurrently on a real, otherwise-busy
    // development machine, which is what pushes a first-ever dynamic
    // import past even a generous polling window. A smaller, fixed worker
    // count trades a little total wall-clock time for far less contention
    // per worker.
    maxWorkers: 4,
  },
})
