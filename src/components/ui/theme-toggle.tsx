"use client";

import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { IconProps } from "./icons";
import { MoonIcon, SunIcon } from "./icons";

type ResolvedTheme = "light" | "dark";

const OPTIONS: {
  value: ResolvedTheme;
  label: string;
  icon: ComponentType<IconProps>;
}[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex shrink-0 gap-0.5 rounded-md border border-border bg-muted/60 p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && resolvedTheme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={`${label} theme`}
            className={`focus-ring flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
