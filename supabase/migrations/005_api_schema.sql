-- ============================================
-- UNICORN STUDIO - API SCHEMA
-- API Keys, Webhooks for WordPress Integration
-- ============================================

-- ============================================
-- API KEYS (Für externe API-Zugriffe)
-- ============================================
create table public.api_keys (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade not null,

    -- Key Info
    name text not null,                    -- "WordPress Production"
    key_hash text not null,                -- SHA-256 gehashter Key (niemals plain!)
    key_prefix text not null,              -- "sk-us-abc" (für Anzeige)

    -- Permissions
    permissions text[] default '{"read"}', -- ["read", "write", "delete", "admin"]
    allowed_sites uuid[],                  -- NULL = alle Sites, oder spezifische Site-IDs

    -- Rate Limiting
    rate_limit integer default 1000,       -- Requests pro Stunde
    requests_this_hour integer default 0,
    rate_limit_reset_at timestamptz,

    -- Status
    is_active boolean default true,
    last_used_at timestamptz,
    last_used_ip inet,

    -- Metadata
    description text,

    -- Timestamps
    created_at timestamptz default now(),
    expires_at timestamptz,                -- Optional: Ablaufdatum
    created_by uuid references public.profiles(id)
);

create index idx_api_keys_org on public.api_keys(organization_id);
create index idx_api_keys_hash on public.api_keys(key_hash);
create unique index idx_api_keys_prefix on public.api_keys(key_prefix);

-- ============================================
-- WEBHOOKS (Für Event-Benachrichtigungen)
-- ============================================
create table public.webhooks (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Endpoint
    url text not null,                     -- https://kunde.de/wp-json/unicorn/v1/webhook
    secret text not null,                  -- Für HMAC Signatur-Validierung

    -- Events (welche Events triggern diesen Webhook?)
    events text[] not null,                -- ["entry.created", "entry.updated", ...]

    -- Headers (optional zusätzliche Headers)
    headers jsonb default '{}'::jsonb,

    -- Retry Configuration
    max_retries integer default 3,
    retry_delay_seconds integer default 60,

    -- Status
    is_active boolean default true,

    -- Stats
    last_triggered_at timestamptz,
    last_status_code integer,
    success_count integer default 0,
    failure_count integer default 0,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_webhooks_site on public.webhooks(site_id);
create index idx_webhooks_active on public.webhooks(site_id, is_active);

-- ============================================
-- WEBHOOK LOGS (Event-Protokollierung)
-- ============================================
create table public.webhook_logs (
    id uuid primary key default gen_random_uuid(),
    webhook_id uuid references public.webhooks(id) on delete cascade not null,

    -- Request
    event text not null,
    payload jsonb not null,

    -- Response
    status_code integer,
    response_body text,
    response_headers jsonb,
    response_time_ms integer,

    -- Status
    success boolean default false,
    error_message text,

    -- Retry Info
    attempt integer default 1,
    next_retry_at timestamptz,

    -- Timestamps
    created_at timestamptz default now()
);

create index idx_webhook_logs_webhook on public.webhook_logs(webhook_id);
create index idx_webhook_logs_created on public.webhook_logs(created_at desc);
create index idx_webhook_logs_event on public.webhook_logs(webhook_id, event);

-- Auto-cleanup alte Logs (älter als 30 Tage)
-- Dies sollte als Cron Job in Supabase eingerichtet werden

-- ============================================
-- API REQUEST LOGS (Optional, für Debugging)
-- ============================================
create table public.api_request_logs (
    id uuid primary key default gen_random_uuid(),
    api_key_id uuid references public.api_keys(id) on delete set null,

    -- Request Info
    method text not null,
    path text not null,
    query_params jsonb,

    -- Response Info
    status_code integer not null,
    response_time_ms integer,

    -- Client Info
    ip_address inet,
    user_agent text,

    -- Error (falls vorhanden)
    error_message text,

    -- Timestamps
    created_at timestamptz default now()
);

create index idx_api_logs_key on public.api_request_logs(api_key_id);
create index idx_api_logs_created on public.api_request_logs(created_at desc);
create index idx_api_logs_path on public.api_request_logs(path);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.api_keys enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.api_request_logs enable row level security;

-- ============================================
-- RLS POLICIES - API Keys
-- ============================================

create policy "Users can view API keys of their organization"
    on public.api_keys for select
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
        )
    );

create policy "Admins can create API keys"
    on public.api_keys for insert
    with check (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

create policy "Admins can update API keys"
    on public.api_keys for update
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

create policy "Admins can delete API keys"
    on public.api_keys for delete
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Webhooks
-- ============================================

create policy "Users can view webhooks of their sites"
    on public.webhooks for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create webhooks for their sites"
    on public.webhooks for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update webhooks of their sites"
    on public.webhooks for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Admins can delete webhooks"
    on public.webhooks for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Webhook Logs
-- ============================================

create policy "Users can view webhook logs of their sites"
    on public.webhook_logs for select
    using (
        webhook_id in (
            select w.id from public.webhooks w
            join public.sites s on s.id = w.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

-- Logs werden programmatisch erstellt, nicht durch User direkt
create policy "System can insert webhook logs"
    on public.webhook_logs for insert
    with check (true);

-- ============================================
-- RLS POLICIES - API Request Logs
-- ============================================

create policy "Users can view API logs of their organization"
    on public.api_request_logs for select
    using (
        api_key_id in (
            select ak.id from public.api_keys ak
            join public.profiles p on p.organization_id = ak.organization_id
            where p.id = auth.uid()
        )
    );

-- Logs werden programmatisch erstellt
create policy "System can insert API logs"
    on public.api_request_logs for insert
    with check (true);

-- ============================================
-- TRIGGERS
-- ============================================

create trigger on_webhooks_update
    before update on public.webhooks
    for each row execute function public.handle_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate API Key mit Prefix
create or replace function public.generate_api_key_prefix()
returns text as $$
begin
    return 'sk-us-' || substr(md5(random()::text), 1, 8);
end;
$$ language plpgsql;

-- Rate Limit Check
create or replace function public.check_api_rate_limit(target_api_key_id uuid)
returns boolean as $$
declare
    key_record record;
begin
    select rate_limit, requests_this_hour, rate_limit_reset_at
    into key_record
    from public.api_keys
    where id = target_api_key_id;

    -- Reset counter if hour has passed
    if key_record.rate_limit_reset_at is null or key_record.rate_limit_reset_at < now() then
        update public.api_keys
        set requests_this_hour = 1,
            rate_limit_reset_at = now() + interval '1 hour'
        where id = target_api_key_id;
        return true;
    end if;

    -- Check if under limit
    if key_record.requests_this_hour < key_record.rate_limit then
        update public.api_keys
        set requests_this_hour = requests_this_hour + 1
        where id = target_api_key_id;
        return true;
    end if;

    return false;
end;
$$ language plpgsql security definer;

-- Update API Key last used
create or replace function public.update_api_key_usage(
    target_api_key_id uuid,
    client_ip inet default null
)
returns void as $$
begin
    update public.api_keys
    set last_used_at = now(),
        last_used_ip = client_ip
    where id = target_api_key_id;
end;
$$ language plpgsql security definer;

-- Increment webhook success/failure count
create or replace function public.update_webhook_stats(
    target_webhook_id uuid,
    was_success boolean,
    http_status integer
)
returns void as $$
begin
    if was_success then
        update public.webhooks
        set success_count = success_count + 1,
            last_triggered_at = now(),
            last_status_code = http_status,
            failure_count = 0  -- Reset failure count on success
        where id = target_webhook_id;
    else
        update public.webhooks
        set failure_count = failure_count + 1,
            last_triggered_at = now(),
            last_status_code = http_status
        where id = target_webhook_id;
    end if;
end;
$$ language plpgsql security definer;

-- Get active webhooks for a site and event
create or replace function public.get_active_webhooks(
    target_site_id uuid,
    event_type text
)
returns setof public.webhooks as $$
begin
    return query
    select *
    from public.webhooks
    where site_id = target_site_id
    and is_active = true
    and event_type = any(events);
end;
$$ language plpgsql security definer;

-- Cleanup old logs (run as cron job)
create or replace function public.cleanup_old_logs()
returns void as $$
begin
    -- Delete webhook logs older than 30 days
    delete from public.webhook_logs
    where created_at < now() - interval '30 days';

    -- Delete API request logs older than 7 days
    delete from public.api_request_logs
    where created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;
