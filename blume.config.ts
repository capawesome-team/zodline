import { defineConfig } from 'blume';

export default defineConfig({
  title: 'zodline',
  description: 'A type-safe CLI parser built with Zod — declare commands, options and args as schemas.',
  logo: {
    image: '/logo.svg',
    text: 'zodline',
  },
  theme: {
    // Monochrome accent using Blume's own neutral palette values:
    // near-black in light mode, near-white in dark mode.
    accent: { light: 'oklch(0.145 0 0)', dark: 'oklch(0.96 0 0)' },
    radius: 'md',
    mode: 'system',
  },
  // Source repository — powers "Edit this page" links and the header repo link.
  github: {
    owner: 'capawesome-team',
    repo: 'zodline',
    branch: 'main',
  },
  content: {
    sources: [
      // One source rooted at the repo: docs/ → /docs, blog/ → /blog — the
      // landing page owns /. (Separate roots per folder would break the docs
      // collection's entry ids.)
      {
        type: 'filesystem',
        root: '.',
        include: ['docs/**/*.{md,mdx}', 'blog/**/*.{md,mdx}'],
      },
      // GitHub releases become the /changelog timeline (needs GITHUB_TOKEN at build time).
      {
        type: 'github-releases',
        prefix: 'changelog',
        owner: 'capawesome-team',
        repo: 'zodline',
      },
    ],
  },
  navigation: {
    // Show the GitHub link in the header (requires `github` above).
    repo: true,
    tabs: [
      { label: 'Docs', path: '/docs', icon: 'book-open' },
      { label: 'Blog', path: '/blog', icon: 'newspaper' },
      // The changelog timeline is generated, so it needs an explicit href.
      { label: 'Changelog', path: '/changelog', href: '/changelog', icon: 'history' },
    ],
  },
  // Derive per-page "Last updated" dates from git history; also emits
  // <lastmod> in sitemap.xml for crawl optimization. Needs full git history
  // at build time (fetch-depth: 0 in CI) to be accurate.
  lastModified: true,
  seo: {
    rss: {
      enabled: true,
      types: ['blog', 'changelog'],
    },
  },
  deployment: {
    // Static output (default). Placeholder site URL — the real deploy is separate.
    site: 'https://zodline.dev',
  },
});
