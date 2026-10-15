CREATE TABLE chat_quota (
  bucket TEXT PRIMARY KEY NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX chat_quota_expiry ON chat_quota (expires_at);
