import { formatDate } from './dates'

/** @deprecated Bitte direkt die Helfer aus `@/utilities/dates` verwenden. */
export const formatDateTime = (timestamp: string): string => formatDate(timestamp || new Date())
