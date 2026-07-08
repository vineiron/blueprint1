import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/server/auth";

// Authenticated areas must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const meta = user.user_metadata as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        user={{
          email: user.email ?? null,
          name: meta?.full_name ?? meta?.name ?? null,
          avatarUrl: meta?.avatar_url ?? null,
        }}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
