ALTER TABLE "blueprint_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blueprints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "blueprints", "blueprint_versions" FROM anon, authenticated;
