-- Create API keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL, -- First 8 chars for display (e.g., "sk_live_ab")
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rate_limit_per_minute integer DEFAULT 60,
  rate_limit_per_day integer DEFAULT 10000,
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone,
  request_count bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create API request logs for rate limiting
CREATE TABLE public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  ip_address text,
  user_agent text,
  response_status integer,
  response_time_ms integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for rate limiting queries
CREATE INDEX idx_api_request_logs_key_time ON public.api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_keys
CREATE POLICY "Admins can manage api_keys"
ON public.api_keys
FOR ALL
USING (is_admin());

-- RLS policies for api_request_logs
CREATE POLICY "Admins can view api_request_logs"
ON public.api_request_logs
FOR SELECT
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate API key and check rate limits
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS TABLE(
  key_id uuid,
  is_valid boolean,
  rate_limit_minute integer,
  rate_limit_day integer,
  requests_last_minute bigint,
  requests_last_day bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_record RECORD;
  v_requests_minute bigint;
  v_requests_day bigint;
BEGIN
  -- Get API key
  SELECT * INTO v_key_record
  FROM public.api_keys
  WHERE key_hash = p_key_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 0, 0, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  -- Count requests in last minute
  SELECT COUNT(*) INTO v_requests_minute
  FROM public.api_request_logs
  WHERE api_key_id = v_key_record.id
    AND created_at > now() - interval '1 minute';
  
  -- Count requests in last day
  SELECT COUNT(*) INTO v_requests_day
  FROM public.api_request_logs
  WHERE api_key_id = v_key_record.id
    AND created_at > now() - interval '1 day';
  
  -- Update last used
  UPDATE public.api_keys
  SET last_used_at = now(), request_count = request_count + 1
  WHERE id = v_key_record.id;
  
  RETURN QUERY SELECT 
    v_key_record.id,
    true,
    v_key_record.rate_limit_per_minute,
    v_key_record.rate_limit_per_day,
    v_requests_minute,
    v_requests_day;
END;
$$;