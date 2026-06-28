import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/functions/**/*.test.js'],
    globals: false,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
  },
})
