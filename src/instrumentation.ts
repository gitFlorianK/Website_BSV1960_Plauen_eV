/**
 * Startet beim Hochfahren des Produktivservers Payload mit Cron (jobs.autoRun: Löschfristen).
 *
 * Payload startet seine Cron-Jobs nur bei `getPayload({ cron: true })` – das tun sonst nur Admin- und
 * REST-Anfragen. Ohne diesen Hook liefen nach jedem Neustart keine Löschfristen, bis jemand das
 * Admin-Panel öffnet. Fehlt die Datenbank beim Start, wird es im Hintergrund erneut versucht.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return

  const start = async (attempt: number): Promise<void> => {
    try {
      const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
      const payload = await getPayload({ config, cron: true })
      payload.logger.info('Hintergrund-Jobs gestartet (jobs.autoRun)')
    } catch (err) {
      const delay = Math.min(300, 15 * attempt)
      console.error(`Hintergrund-Jobs nicht gestartet (Versuch ${attempt}), neuer Versuch in ${delay} s:`, err)
      setTimeout(() => void start(attempt + 1), delay * 1000).unref()
    }
  }
  await start(1)
}
