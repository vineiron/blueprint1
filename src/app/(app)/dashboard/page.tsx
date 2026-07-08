import { DashboardGrid } from "@/components/dashboard-grid";
import { requireAuthUserId } from "@/server/auth";
import { getBlueprintSummaries } from "@/server/data/blueprints";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireAuthUserId("/dashboard");
  const blueprints = await getBlueprintSummaries(userId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <DashboardGrid blueprints={blueprints} />
    </div>
  );
}
