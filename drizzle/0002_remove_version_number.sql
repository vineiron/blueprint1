DROP INDEX "blueprint_versions_blueprint_version_uq";--> statement-breakpoint
CREATE INDEX "blueprint_versions_blueprint_created_idx" ON "blueprint_versions" USING btree ("blueprint_id","created_at");--> statement-breakpoint
ALTER TABLE "blueprint_versions" DROP COLUMN "version_number";