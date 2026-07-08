import { redirect } from "next/navigation";

// The editor now lives at /blueprints/[id]; this route stays as a permanent
// alias so older links/bookmarks (and ?restored= deep-links) keep working.
export default async function EditBlueprintRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const { id } = await params;
  const { restored } = await searchParams;
  const query = restored ? `?restored=${encodeURIComponent(restored)}` : "";
  redirect(`/blueprints/${id}${query}`);
}
