/**
 * Zentrale URL-Definitionen des Frontends. Alle Links/Revalidierungen nutzen diese Helfer,
 * damit Routen nur an einer Stelle festgelegt sind.
 */
export const routes = {
  home: '/',
  posts: '/aktuelles',
  post: (slug: string) => `/aktuelles/${slug}`,
  postsPage: (page: number) => `/aktuelles/seite/${page}`,
  season: (slug: string) => `/aktuelles/saison/${slug}`,
  events: '/termine',
  event: (slug: string) => `/termine/${slug}`,
  eventsIcs: '/termine.ics',
  galleries: '/galerie',
  gallery: (slug: string) => `/galerie/${slug}`,
  search: '/suche',
  contact: '/kontakt',
  privacy: '/datenschutz',
  /** Anker des Kursanmeldeformulars (Block „Formular“ auf der Seite Anfängerkurs) */
  courseRegistration: '/anfaengerkurs#anmeldung',
  courseConfirm: '/anmeldung-bestaetigen',
  altchaChallenge: '/next/altcha',
  login: '/login',
  forgotPassword: '/passwort-vergessen',
  resetPassword: '/passwort-zuruecksetzen',
  invite: '/einladung',
  members: '/mitglieder',
  membersNews: '/mitglieder/aktuelles',
  membersPost: (slug: string) => `/mitglieder/aktuelles/${slug}`,
  membersEvents: '/mitglieder/termine',
  membersDocuments: '/mitglieder/dokumente',
  membersGalleries: '/mitglieder/galerie',
  membersGallery: (slug: string) => `/mitglieder/galerie/${slug}`,
  membersProfile: '/mitglieder/profil',
  membersSecurity: '/mitglieder/sicherheit',
  page: (slug: string) => (slug === 'home' ? '/' : `/${slug}`),
} as const

export type LinkableCollection = 'pages' | 'posts' | 'events' | 'galleries'

export const docPath = (collection: LinkableCollection, slug: string): string => {
  switch (collection) {
    case 'posts':
      return routes.post(slug)
    case 'events':
      return routes.event(slug)
    case 'galleries':
      return routes.gallery(slug)
    default:
      return routes.page(slug)
  }
}
