import Link from "next/link";
import { DatabaseIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-diagram-grid px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <DatabaseIcon size={22} />
      </span>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        This page doesn&apos;t exist, or the blueprint isn&apos;t public.
      </p>
      <Link
        href="/"
        className="focus-ring inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Go home
      </Link>
    </main>
  );
}
