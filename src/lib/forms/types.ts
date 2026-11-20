/** Ergebnis einer Formularübermittlung (Server Action → Client). */
export type FormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
  /** Eingaben zum Wiederbefüllen nach Fehlern (nie Rückgabe von Geheimnissen). */
  values?: Record<string, string>
}

export const initialFormState: FormState = { status: 'idle' }
