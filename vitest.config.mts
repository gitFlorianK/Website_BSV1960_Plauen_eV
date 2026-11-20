import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Node statt jsdom: Payload/Uploads brauchen echte Node-Buffer (file-type prüft instanceof Uint8Array).
    environment: 'node',
    // Integrationstests laufen gegen eine eigene Datenbank (wird bei jedem Lauf geleert).
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL || 'postgres://bsv:bsv_dev_pw@localhost:5432/bsv1960_test',
    },
    // Tests teilen sich eine DB – nicht parallel ausführen.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
