"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu, type HeaderUser } from "@/components/account-menu";
import { BrandLockup } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export type { HeaderUser };

export function AppHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/80 backdrop-blur">
      <div
        className={cn(
          "flex h-14 w-full items-center gap-3 px-4",
          isDashboard && "mx-auto max-w-7xl sm:px-6",
        )}
      >
        <Link href="/">
          <BrandLockup />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
