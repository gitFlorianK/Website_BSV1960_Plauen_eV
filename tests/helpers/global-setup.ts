import { seed } from './seedUser'

/** Einmal vor allen E2E-Tests: sorgt dafür, dass die Datenbank nie ohne Konto ist (siehe seed-cli.ts). */
export default function globalSetup() {
  seed({ action: 'baseUser' })
}
