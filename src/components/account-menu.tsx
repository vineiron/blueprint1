"use client";

import { DropdownMenu as RMenu } from "radix-ui";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  SignOutIcon,
} from "@/components/ui/icons";
import { signOut } from "@/server/actions/auth";

export interface HeaderUser {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** Mask the local-part of an email: `vitoananta3@gmail.com` → `v•••3@gmail.com`. */
function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}•••${domain}`;
  return `${local[0]}•••${local[local.length - 1]}${domain}`;
}

/** Deterministic, evenly-distributed avatar color derived from a stable seed. */
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 45%)`;
}

function Avatar({
  url,
  color,
  initial,
  size,
}: {
  url: string | null;
  color: string;
  initial: string;
  size: number;
}) {
  if (url) {
    return (
      // biome-ignore lint/performance/noImgElement: external avatar host (e.g. Google) isn't in next.config's image allowlist; raw <img> with referrerPolicy=no-referrer is intentional
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

/**
 * Account chip + dropdown — characteristics ported from leveling0's UserChip
 * (pill trigger with redacted email + chevron, reveal/hide toggle, hash-colored
 * fallback avatar, pop-in dropdown, richer header) and remapped onto blueprint1's
 * sky/slate tokens. Built on Radix directly (controlled `open`) so the reveal
 * state resets whenever the menu closes; the confirm-first sign-out reuses the
 * shared ConfirmDialog. Shared by the in-app and marketing headers.
 */
export function AccountMenu({ user }: { user: HeaderUser }) {
  const label = user.name ?? user.email ?? "Account";
  const initial = (user.email?.[0] ?? user.name?.[0] ?? "?").toUpperCase();
  const color = avatarColor(user.email ?? user.name ?? "account");

  const [open, setOpen] = useState(false);
  const [revealEmail, setRevealEmail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Re-mask the email each time the menu closes.
  useEffect(() => {
    if (!open) setRevealEmail(false);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // signOut() redirects to "/"; this only runs if navigation didn't happen.
      setSigningOut(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <RMenu.Root open={open} onOpenChange={setOpen}>
        <RMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="focus-ring group flex items-center gap-2 rounded-md border border-border bg-card py-2 pl-3 pr-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Avatar url={user.avatarUrl} color={color} initial={initial} size={24} />
            <span
              className={`hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:inline ${
                user.email ? "font-mono" : ""
              }`}
            >
              {user.email ? redactEmail(user.email) : label}
            </span>
            <ChevronDownIcon
              size={14}
              className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            />
          </button>
        </RMenu.Trigger>

        <RMenu.Portal>
          <RMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-64 animate-pop-in overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
              <Avatar url={user.avatarUrl} color={color} initial={initial} size={36} />
              <div className="min-w-0 flex-1">
                {user.name ? (
                  <div className="truncate text-sm font-medium text-foreground">
                    {user.name}
                  </div>
                ) : null}
                {user.email ? (
                  <div className="flex items-center gap-1">
                    <div className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs text-muted-foreground [scrollbar-width:thin]">
                      {revealEmail ? user.email : redactEmail(user.email)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevealEmail((v) => !v)}
                      aria-label={revealEmail ? "Hide email" : "Show email"}
                      aria-pressed={revealEmail}
                      className="focus-ring ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {revealEmail ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                    </button>
                  </div>
                ) : user.name ? null : (
                  <div className="text-xs text-muted-foreground">Account</div>
                )}
              </div>
            </div>

            <div className="p-1">
              <RMenu.Item asChild>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="focus-ring flex w-full cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground outline-none data-[highlighted]:bg-muted"
                >
                  <SignOutIcon size={16} />
                  Sign out
                </button>
              </RMenu.Item>
            </div>
          </RMenu.Content>
        </RMenu.Portal>
      </RMenu.Root>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSignOut}
        title="Sign out?"
        description={
          <p className="text-sm text-muted-foreground">
            {user.email ? (
              <>
                You&apos;ll be signed out of{" "}
                <span className="font-medium text-foreground">{user.email}</span>.
                Your blueprints stay saved to your account.
              </>
            ) : (
              <>You&apos;ll be signed out. Your blueprints stay saved to your account.</>
            )}
          </p>
        }
        confirmLabel="Sign out"
        destructive
        loading={signingOut}
        hideFooterBorder
      />
    </>
  );
}
