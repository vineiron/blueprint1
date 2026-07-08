"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  KeyIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

const SURFACE_TOKENS = [
  "background",
  "card",
  "muted",
  "accent",
  "primary",
  "border",
];
const SEMANTIC_TOKENS = ["pk", "fk", "destructive", "success", "warning"];

function Swatch({ token }: { token: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="h-12" style={{ backgroundColor: `var(--${token})` }} />
      <div className="bg-card px-2 py-1 font-mono text-xs text-muted-foreground">
        --{token}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">blueprint1 design system</h1>
          <p className="text-sm text-muted-foreground">
            Tokens and components used across the app.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Surface colors">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SURFACE_TOKENS.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
      </Section>

      <Section title="Semantic colors">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SEMANTIC_TOKENS.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight">Heading — Geist Sans</p>
          <p className="text-base text-muted-foreground">
            Body text in the muted foreground color for secondary content.
          </p>
          <p className="font-mono text-sm">
            const monospace = "Geist Mono for SQL and identifiers";
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button loading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Public</Badge>
          <Badge variant="warning">Draft</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="warning">
            <KeyIcon size={11} />
            PK
          </Badge>
          <Badge variant="default">
            <LinkIcon size={11} />
            FK
          </Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-md gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="demo-input">Blueprint name</Label>
            <Input id="demo-input" placeholder="e.g. Commerce schema" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="demo-textarea">Description</Label>
            <Textarea id="demo-textarea" placeholder="Optional description…" rows={3} />
          </div>
        </div>
      </Section>

      <Section title="Overlays & feedback">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <DropdownMenu
            trigger={
              <Button variant="outline">
                Menu
                <ChevronDownIcon size={16} />
              </Button>
            }
          >
            <DropdownItem icon={PlusIcon}>New item</DropdownItem>
            <DropdownItem icon={TrashIcon} destructive>
              Delete
            </DropdownItem>
          </DropdownMenu>
          <Tooltip content="Helpful hint">
            <Button variant="outline">Hover me</Button>
          </Tooltip>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ variant: "success", title: "Saved", description: "Toast example." })
            }
          >
            Show toast
          </Button>
        </div>
      </Section>

      <Section title="Cards">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cards wrap blueprints on the dashboard and group settings.
          </CardContent>
        </Card>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Example dialog"
        description="Dialogs are used for confirmations and sharing."
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Dialog body content goes here.</p>
      </Dialog>
    </main>
  );
}
