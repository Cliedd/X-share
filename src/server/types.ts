export type PlanId = "starter" | "pro" | "elite";
export type ConnectorMode = "review" | "autopilot";
export type Framework = "AIDA" | "PAS" | "custom";
export type MediaKind = "none" | "image" | "video";
export type DraftStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type User = {
  id: string;
  x_user_id: string | null;
  handle: string;
  name: string;
  avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: number | null;
  created_at: number;
};

export type Workspace = {
  id: string;
  user_id: string;
  name: string;
  plan: PlanId;
  credits_remaining: number;
  credits_reset_at: number;
  trial_ends_at: number | null;
  framework: Framework;
  custom_prompt: string | null;
  product_context: string | null;
  timezone: string;
  created_at: number;
};

export type Connector = {
  id: string;
  workspace_id: string;
  url: string;
  title: string;
  mode: ConnectorMode;
  active: number;
  last_fetched_at: number | null;
  last_error: string | null;
  created_at: number;
};

export type SourceItem = {
  id: string;
  connector_id: string;
  guid: string;
  title: string;
  url: string | null;
  summary: string | null;
  published_at: number | null;
  processed: number;
  created_at: number;
};

export type Draft = {
  id: string;
  workspace_id: string;
  source_item_id: string | null;
  content: string;
  framework: Framework;
  status: DraftStatus;
  media_kind: MediaKind;
  scheduled_at: number | null;
  published_at: number | null;
  x_post_id: string | null;
  credit_cost: number;
  error: string | null;
  attempts: number;
  created_at: number;
  updated_at: number;
};

export type PostMetrics = {
  id: string;
  draft_id: string;
  impressions: number;
  likes: number;
  reposts: number;
  replies: number;
  fetched_at: number;
};

export type LedgerEntry = {
  id: string;
  workspace_id: string;
  delta: number;
  reason: string;
  draft_id: string | null;
  created_at: number;
};
