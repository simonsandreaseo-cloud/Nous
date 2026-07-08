-- Add billing and token tracking fields to queue_tasks table
ALTER TABLE "public"."queue_tasks" 
ADD COLUMN IF NOT EXISTS "prompt_tokens" int8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS "completion_tokens" int8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS "total_tokens" int8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cost_usd" numeric DEFAULT 0;
