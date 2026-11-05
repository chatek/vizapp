import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { createCoverageInventory, familyCoverageThresholds } from './scripts/release/coverage-inventory'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const coverageInventory = createCoverageInventory(projectRoot)

export default defineConfig({
  root: projectRoot,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // tests/e2e belongs to Playwright (playwright.config.ts testDir, docs/AGENTS.md). Playwright's
    // default testMatch also accepts `*.test.ts`, so without this a name added there would run
    // twice — once with no Electron window, as a plain Node test.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: coverageInventory.includePatterns,
      reporter: ['text', 'html', 'json-summary'],
      reportOnFailure: true,
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 70,
        lines: 75,
        ...familyCoverageThresholds(),
      },
    },
  },
})
