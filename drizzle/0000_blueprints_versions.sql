CREATE TABLE "blueprint_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"sql" text NOT NULL,
	"graph" jsonb NOT NULL,
	"positions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"public_slug" text,
	"draft_sql" text,
	"draft_positions" jsonb,
	"draft_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blueprints_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
ALTER TABLE "blueprint_versions" ADD CONSTRAINT "blueprint_versions_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blueprint_versions_blueprint_version_uq" ON "blueprint_versions" USING btree ("blueprint_id","version_number");--> statement-breakpoint
CREATE INDEX "blueprint_versions_blueprint_idx" ON "blueprint_versions" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "blueprints_owner_id_idx" ON "blueprints" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "blueprints_owner_updated_idx" ON "blueprints" USING btree ("owner_id","updated_at");