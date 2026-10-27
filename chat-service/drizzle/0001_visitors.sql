CREATE TABLE visitor_seen (
  day TEXT NOT NULL,
  hash TEXT NOT NULL,
  PRIMARY KEY (day, hash)
);
--> statement-breakpoint
CREATE TABLE visitor_daily (
  day TEXT PRIMARY KEY NOT NULL,
  visitors INTEGER NOT NULL DEFAULT 0
);
