"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RestoreIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { restoreVersionAction } from "@/server/actions/blueprints";

export function RestoreVersionButton({
  blueprintId,
  versionId,
  hasDraft = false,
}: {
  blueprintId: string;
  versionId: string;
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await restoreVersionAction(blueprintId, versionId);
    setLoading(false);
    setOpen(false);
    if (res.ok) {
      toast({
        variant: "success",
        title: "Loaded version as draft",
        description: "Review it, then Save as new version to keep it.",
      });
      router.push(`/blueprints/${blueprintId}?restored=1`);
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't load draft", description: res.error });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <RestoreIcon size={15} />
        Load as draft
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={run}
        loading={loading}
        title="Load this version as a draft?"
        description={
          hasDraft
            ? "This loads the snapshot into the editor as a draft and replaces your current unsaved draft changes. Your saved history is preserved; nothing is committed until you Save as new version."
            : "This loads the snapshot into the editor as a draft for review. Your saved history is preserved; nothing is committed until you Save as new version."
        }
        confirmLabel="Load as draft"
        destructive={hasDraft}
        hideFooterBorder
      />
    </>
  );
}
