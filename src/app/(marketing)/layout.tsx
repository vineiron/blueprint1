import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { SignInButton } from "@/components/sign-in-button";
import { BrandLockup } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentUser } from "@/server/auth";

const ctaClass =
  "focus-ring inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const meta = user?.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string }
    | undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/35 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/">
            <BrandLockup />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <AccountMenu
                user={{
                  email: user.email ?? null,
                  name: meta?.full_name ?? meta?.name ?? null,
                  avatarUrl: meta?.avatar_url ?? null,
                }}
              />
            ) : (
              <SignInButton className={ctaClass}>Sign in</SignInButton>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="border-t border-border px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>© 2026 vineiron. All rights reserved.</p>
          <nav aria-label="Footer links" className="flex items-center justify-center gap-4">
            <a
              href="https://vineiron.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="focus-ring rounded-sm hover:text-foreground"
            >
              vineiron
            </a>
            <a
              href="https://github.com/vineiron/blueprint1"
              target="_blank"
              rel="noreferrer"
              className="focus-ring rounded-sm hover:text-foreground"
            >
              github
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
