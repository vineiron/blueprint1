/**
 * The site-wide social card, generated at build time by
 * `src/app/opengraph-image.tsx`. Next adds it automatically to routes that
 * inherit the root metadata, but a route that defines its own `openGraph`
 * block replaces the parent's entirely, so those routes must spread this in.
 * Share pages are the exception: their own `opengraph-image.tsx` wins.
 */
export const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "blueprint1: paste PostgreSQL DDL, see an interactive entity-relationship diagram, share it with anyone.",
};
