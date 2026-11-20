/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--foreground)',
              '--tw-prose-headings': 'var(--foreground)',
              '--tw-prose-links': 'var(--brand-text)',
              '--tw-prose-bold': 'var(--foreground)',
              '--tw-prose-bullets': 'var(--brand)',
              '--tw-prose-counters': 'var(--brand-text)',
              '--tw-prose-quote-borders': 'var(--brand)',
              maxWidth: '72ch',
              a: {
                textUnderlineOffset: '3px',
                fontWeight: '500',
              },
              'a:hover': {
                color: 'var(--navy)',
              },
              h1: {
                fontWeight: '700',
                letterSpacing: '-0.02em',
                marginBottom: '0.5em',
              },
              h2: {
                fontWeight: '700',
                letterSpacing: '-0.01em',
              },
              h3: {
                fontWeight: '600',
              },
            },
          ],
        },
        base: {
          css: [{ h1: { fontSize: '2.25rem' }, h2: { fontSize: '1.5rem' } }],
        },
        md: {
          css: [{ h1: { fontSize: '3rem' }, h2: { fontSize: '1.75rem' } }],
        },
      },
    },
  },
}

export default config
