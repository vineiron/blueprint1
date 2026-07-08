import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor-workspace";

export const metadata: Metadata = {
  title: { absolute: "Try blueprint1 — paste PostgreSQL, see your ERD" },
  description:
    "Paste PostgreSQL DDL and instantly see an interactive entity-relationship diagram — no sign-up needed. Sign in only when you want to save.",
  alternates: { canonical: "/try" },
  openGraph: {
    type: "website",
    url: "/try",
    title: "Try blueprint1 — paste PostgreSQL, see your ERD",
    description: "Paste PostgreSQL DDL and see your ERD instantly. No sign-up.",
  },
};

/** No-signup playground. Public + indexable; the editor runs in "try" mode
 *  (localStorage only, "Sign in to save" hands the schema to /blueprints/new). */
export default function TryPage() {
  return (
    <div className="h-dvh">
      <EditorWorkspace mode="try" initialTitle="" initialSql="" initialPositions={{}} />
    </div>
  );
}
