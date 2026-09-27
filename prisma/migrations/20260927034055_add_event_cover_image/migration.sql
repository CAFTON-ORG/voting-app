-- Optional banner image for an event, shown on its own hero and its card
-- on the home page. Nullable, no default: an event without one falls back
-- to a generated color identity (see EventHero), so this is purely
-- additive and never breaks an existing event.
ALTER TABLE "events" ADD COLUMN "cover_image_url" TEXT;
