// Load .env files
import 'dotenv/config'
import { vi } from 'vitest'

// Next.js-Cache-APIs funktionieren nur im Next-Server; in Integrationstests ohne Wirkung.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))
