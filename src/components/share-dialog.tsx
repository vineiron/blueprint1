"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { CheckIcon, CopyIcon, GlobeIcon, LockIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { setVisibilityAction } from "@/server/actions/blueprints";

export function ShareDialog({
  open,
  onClose,
  blueprintId,
  isPublic: initialPublic,
  slug: initialSlug,
}: {
  open: boolean;
  onClose: () => void;
  blueprintId: string;
  isPublic: boolean;
  slug: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [slug, setSlug] = useState(initialSlug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = slug && origin ? `${origin}/share/${slug}` : "";

  async function toggle(next: boolean) {
    setLoading(true);
    const res = await setVisibilityAction(blueprintId, next);
    setLoading(false);
    if (res.ok) {
      setIsPublic(res.data.isPublic);
      setSlug(res.data.publicSlug);
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't update sharing", description: res.error });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ variant: "error", title: "Couldn't copy link" });
    }
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} title="Share blueprint">
      <button
        type="button"
        onClick={() => (isPublic ? setConfirmOff(true) : toggle(true))}
        disabled={loading}
        className="focus-ring flex w-full items-center gap-3 rounded-md border border-border p-3 text-left disabled:opacity-60"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            isPublic ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {isPublic ? <GlobeIcon size={18} /> : <LockIcon size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {isPublic ? "Public" : "Private"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {isPublic
              ? "Anyone with the link can view (read-only)."
              : "Only you can see this blueprint."}
          </span>
        </span>
        <span
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            isPublic ? "bg-primary" : "bg-muted-foreground/30",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              isPublic ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </span>
      </button>

      {isPublic && shareUrl ? (
        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-medium">Share link</span>
          <div className="flex gap-2">
            <Input readOnly value={shareUrl} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link">
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>

    <ConfirmDialog
      open={confirmOff}
      onClose={() => setConfirmOff(false)}
      onConfirm={() => {
        setConfirmOff(false);
        void toggle(false);
      }}
      loading={loading}
      title="Turn off sharing?"
      description="This permanently invalidates the current link — anyone you've shared it with will lose access. Re-enabling sharing later creates a brand-new link."
      confirmLabel="Turn off sharing"
      destructive
    />
    </>
  );
}
