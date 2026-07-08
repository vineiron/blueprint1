import { EditorWorkspace } from "@/components/editor-workspace";
import { requireAuthUserId } from "@/server/auth";

export const metadata = { title: "New blueprint" };

export default async function NewBlueprintPage() {
  await requireAuthUserId("/blueprints/new");
  return (
    <div className="h-full">
      <EditorWorkspace
        mode="create"
        initialTitle=""
        initialSql=""
        initialPositions={{}}
      />
    </div>
  );
}
