import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckIcon,
  CodeIcon,
  CopyIcon,
  ChevronRightIcon,
  DownloadIcon,
  GlobeIcon,
  ImageIcon,
  SparklesIcon,
  XIcon,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { AutoLayoutDemo } from "@/components/auto-layout-demo";
import { ShowcaseLive } from "@/components/showcase-live";
import { SignInButton } from "@/components/sign-in-button";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: { absolute: "blueprint1: Turn PostgreSQL DDL into shareable ERDs" },
  description:
    "Paste PostgreSQL CREATE TABLE statements and get an interactive, versioned, shareable entity-relationship diagram. No sign-up needed to view shared blueprints.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "blueprint1: Turn PostgreSQL DDL into shareable ERDs",
    description:
      "Paste PostgreSQL DDL and get an interactive, versioned, shareable entity-relationship diagram.",
  },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  // Both the header "Sign in" and this CTA land on the dashboard after Google
  // sign-in (the popup defaults `next` to /dashboard when none is passed).
  const primaryCtaClass =
    "focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary-hover";
  const secondaryCtaClass =
    "focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-6 text-base font-medium hover:bg-muted";

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate">
        {/* Blueprint-grid backdrop confined to the hero, dissolving toward its
            bottom so it's fully faded before the features begin — a soft seam
            instead of a hard grid-to-plain edge. Cards/panels are opaque
            (bg-card) and float on it. */}
        <div
          aria-hidden="true"
          className="bg-diagram-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,black_45%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_45%,transparent)]"
        />
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-24 pb-10 text-center sm:px-6 sm:pt-32 sm:pb-14">
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Simply <span className="text-primary">visualize</span> your SQL
            schema.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Paste your SQL. See the diagram. Share it with anyone.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/try"
              className={user ? secondaryCtaClass : primaryCtaClass}
            >
              <SparklesIcon size={18} />
              {user ? "Open SQL playground" : "Try it now, no sign-up"}
            </Link>
            {user ? (
              <Link href="/dashboard" className={primaryCtaClass}>
                Go to dashboard
                <ChevronRightIcon size={18} />
              </Link>
            ) : (
              <SignInButton className={secondaryCtaClass}>
                Get started for free
              </SignInButton>
            )}
          </div>
        </div>

        {/* Hero showcase: the live paste-SQL-to-ERD demo, promoted to a
            full-width centerpiece directly below the CTAs. The diagram is the
            star (see ShowcaseLive); the card floats on the blueprint grid. */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <ShowcaseLive />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
        {/* Four equal alternating showcase rows — no overall section header.
            Sides flip right -> left -> right -> left down the page via
            lg:order-last on the visual column (rows 1, 3) and on the text
            column (rows 2, 4); rows stack on mobile. Each visual is a single
            aria-hidden decorative mockup mirroring real app UI; the meaningful
            content lives in each row's heading + description. */}
        <div className="flex flex-col gap-16 sm:gap-24">
          {/* ROW 1 — AUTO LAYOUT, visual on the right: the real embedded ERD
              canvas that arranges itself on view (see AutoLayoutDemo). */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                One click to a tidy diagram.
              </h3>
              <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                No more dragging boxes around by hand. Tap once and everything
                lines up into a clean, easy-to-read picture.
              </p>
            </div>

            {/* Visual: the REAL ERD canvas, embedded and display-only. On view
                the tables drop in and the layout engine arranges them — the
                actual auto-layout in action — and the button replays it. This is
                the real component (same as /try), not a mockup. */}
            <div className="lg:order-last">
              <AutoLayoutDemo />
            </div>
          </div>

          {/* ROW 2 — SHARE, visual on the left. */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-last">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Share with a single link.
              </h3>
              <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                Send your diagram to anyone with a link. They can take a look
                without signing up or changing a thing.
              </p>
            </div>

            {/* Visual: the Share dialog — a "Share blueprint" title row with a
                close glyph, the success-tinted Public toggle (GlobeIcon, on-state
                pill switch), the read-only caption, and a share URL row with a
                Copy affordance. Mirrors share-dialog.tsx. */}
            <div>
              <div
                className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border sm:p-6"
                aria-hidden="true"
              >
                {/* dialog title row */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-base font-semibold">Share blueprint</span>
                  <span className="text-muted-foreground">
                    <XIcon size={18} />
                  </span>
                </div>

                {/* Public toggle row */}
                <div className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                    <GlobeIcon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Public</span>
                    <span className="block text-xs text-muted-foreground">
                      Anyone with the link can view (read-only).
                    </span>
                  </span>
                  <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-primary">
                    <span className="inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white" />
                  </span>
                </div>

                {/* Share link row */}
                <div className="mt-4">
                  <span className="mb-1.5 block text-sm font-medium">Share link</span>
                  <div className="flex gap-2">
                    <span className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-input bg-card px-3 font-mono text-xs text-muted-foreground">
                      <span className="truncate">blueprint1.app/share/orders-erd</span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm">
                      <CopyIcon size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3 — EXPORT TO PNG, visual on the right. */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Download it as an image.
              </h3>
              <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                Save your whole diagram as a picture in one click &mdash; a PNG
                you can drop into slides, docs, or a message. Nothing gets cut
                off.
              </p>
            </div>

            {/* Visual: the Export button + an open dropdown ("PNG image" /
                "SVG vector"), PNG emphasized with a selected-format CheckIcon,
                plus a "download complete" blueprint.png chip. Mirrors the
                erd-canvas Export menu. */}
            <div className="lg:order-last">
              <div
                className="bg-diagram-grid overflow-hidden rounded-xl border border-border p-6 shadow-sm ring-1 ring-border sm:p-10"
                aria-hidden="true"
              >
                <div className="flex flex-col items-end gap-2">
                  {/* Export trigger button */}
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm">
                    <DownloadIcon size={16} />
                    Export
                  </span>

                  {/* open dropdown menu */}
                  <div className="w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                    <span className="flex items-center gap-2 rounded-sm bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-foreground">
                      <ImageIcon size={16} />
                      PNG image
                      <CheckIcon size={15} className="ml-auto text-primary" />
                    </span>
                    <span className="flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-popover-foreground">
                      <CodeIcon size={16} />
                      SVG vector
                    </span>
                  </div>
                </div>

                {/* "export complete" download chip — the real export filename. */}
                <div className="mt-8 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground">
                    <ImageIcon size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
                    blueprint.png
                  </span>
                  <CheckIcon size={15} className="shrink-0 text-success" />
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4 — VERSION, visual on the left. Reuses the timeline mockup. */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="lg:order-last">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Go back to any earlier save.
              </h3>
              <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                Every time you save, we keep a copy &mdash; so you can look back
                at how your design used to be. Nothing ever gets lost.
              </p>
            </div>

            {/* Visual: the version timeline on a solid card with connector line,
                ring-card dots, and version pills. Reused from the current page. */}
            <div>
              <div
                className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm ring-1 ring-border sm:p-10"
                aria-hidden="true"
              >
                <ol className="relative space-y-6">
                  {/* connector line */}
                  <span className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                  <li className="relative flex items-center gap-4 pl-7">
                    <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary ring-4 ring-card" />
                    <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-xs font-semibold text-primary-foreground">
                      v3
                    </span>
                    <Badge variant="default">latest</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">now</span>
                  </li>
                  <li className="relative flex items-center gap-4 pl-7">
                    <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-border ring-4 ring-card" />
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                      v2
                    </span>
                    <span className="text-sm text-muted-foreground">add indexes</span>
                    <span className="ml-auto text-xs text-muted-foreground">2d ago</span>
                  </li>
                  <li className="relative flex items-center gap-4 pl-7">
                    <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-border ring-4 ring-card" />
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                      v1
                    </span>
                    <span className="text-sm text-muted-foreground">initial schema</span>
                    <span className="ml-auto text-xs text-muted-foreground">5d ago</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
