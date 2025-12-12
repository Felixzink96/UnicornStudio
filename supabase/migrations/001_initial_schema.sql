-- ============================================
-- UNICORN STUDIO - DATABASE SCHEMA
-- Multi-Tenancy mit Row Level Security
-- ============================================

-- ============================================
-- ORGANIZATIONS (Kunden/Workspaces)
-- ============================================
create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    logo_url text,

    -- Plan & Limits
    plan text default 'free' check (plan in ('free', 'pro', 'agency', 'enterprise')),

    -- Settings
    settings jsonb default '{}'::jsonb,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- USER PROFILES (erweitert Supabase Auth)
-- ============================================
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    -- User Info
    full_name text,
    email text,
    avatar_url text,

    -- Organization Membership
    organization_id uuid references public.organizations(id) on delete set null,
    role text default 'member' check (role in ('owner', 'admin', 'editor', 'viewer')),

    -- Preferences
    preferences jsonb default '{
        "theme": "system",
        "editorLayout": "default"
    }'::jsonb,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- SITES (Websites/Projekte)
-- ============================================
create table public.sites (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade not null,

    -- Basic Info
    name text not null,
    slug text not null,
    description text,
    thumbnail_url text,

    -- Domains
    subdomain text unique,
    custom_domain text unique,

    -- Global Site Settings
    settings jsonb default '{
        "fonts": {
            "heading": "Inter",
            "body": "Inter"
        },
        "colors": {
            "primary": "#3b82f6",
            "secondary": "#64748b",
            "accent": "#f59e0b",
            "background": "#ffffff",
            "foreground": "#0f172a"
        },
        "borderRadius": "0.5rem",
        "containerWidth": "1280px"
    }'::jsonb,

    -- SEO Defaults
    seo jsonb default '{
        "title": "",
        "description": "",
        "ogImage": "",
        "favicon": ""
    }'::jsonb,

    -- Integrations (Analytics, etc.)
    integrations jsonb default '{}'::jsonb,

    -- Status
    status text default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(organization_id, slug)
);

-- ============================================
-- PAGES (Seiten einer Website)
-- ============================================
create table public.pages (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Page Info
    name text not null,
    slug text not null,

    -- COMPONENT TREE - Das Herzstück
    content jsonb not null default '{
        "root": {
            "id": "root",
            "type": "root",
            "children": []
        }
    }'::jsonb,

    -- Page Settings
    settings jsonb default '{
        "layout": "default",
        "maxWidth": "full",
        "padding": true
    }'::jsonb,

    -- SEO (überschreibt Site-Defaults)
    seo jsonb default '{}'::jsonb,

    -- Status
    is_home boolean default false,
    is_published boolean default false,
    published_at timestamptz,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(site_id, slug)
);

-- ============================================
-- COMPONENTS (Wiederverwendbare Komponenten)
-- ============================================
create table public.components (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Component Info
    name text not null,
    description text,
    category text,

    -- Component Tree
    content jsonb not null,

    -- Preview
    thumbnail_url text,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- ASSETS (Media Library)
-- ============================================
create table public.assets (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,
    uploaded_by uuid references public.profiles(id),

    -- File Info
    name text not null,
    file_path text not null,
    file_url text not null,

    file_type text not null check (file_type in ('image', 'video', 'document', 'other')),
    mime_type text,
    size_bytes bigint,

    -- Image Specific
    width integer,
    height integer,
    alt_text text,

    -- Organization
    folder text default '/',
    tags text[] default '{}',

    -- Timestamps
    created_at timestamptz default now()
);

-- ============================================
-- FORM SUBMISSIONS
-- ============================================
create table public.form_submissions (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,
    page_id uuid references public.pages(id) on delete set null,

    -- Form Data
    form_name text,
    data jsonb not null,

    -- Metadata
    ip_address inet,
    user_agent text,
    referrer text,

    -- Status
    status text default 'new' check (status in ('new', 'read', 'archived')),

    -- Timestamps
    created_at timestamptz default now()
);

-- ============================================
-- ACTIVITY LOG (Für Collaboration)
-- ============================================
create table public.activity_log (
    id uuid primary key default gen_random_uuid(),

    -- References
    organization_id uuid references public.organizations(id) on delete cascade,
    site_id uuid references public.sites(id) on delete cascade,
    page_id uuid references public.pages(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,

    -- Activity
    action text not null,
    details jsonb default '{}'::jsonb,

    -- Timestamps
    created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.pages enable row level security;
alter table public.components enable row level security;
alter table public.assets enable row level security;
alter table public.form_submissions enable row level security;
alter table public.activity_log enable row level security;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: User kann nur eigenes Profil sehen/bearbeiten
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Organizations: Nur Mitglieder können sehen
create policy "Organization members can view"
    on public.organizations for select
    using (
        id in (
            select organization_id from public.profiles
            where id = auth.uid()
        )
    );

create policy "Anyone can create organizations"
    on public.organizations for insert
    with check (true);

-- Sites: Nur Mitglieder der Organisation
create policy "Organization members can view sites"
    on public.sites for select
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
        )
    );

create policy "Organization members can create sites"
    on public.sites for insert
    with check (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
        )
    );

create policy "Organization members can update sites"
    on public.sites for update
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
        )
    );

create policy "Organization admins can delete sites"
    on public.sites for delete
    using (
        organization_id in (
            select organization_id from public.profiles
            where id = auth.uid()
            and role in ('owner', 'admin')
        )
    );

-- Pages: Wie Sites
create policy "Can view pages of accessible sites"
    on public.pages for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Can insert pages of accessible sites"
    on public.pages for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can update pages of accessible sites"
    on public.pages for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can delete pages of accessible sites"
    on public.pages for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- Assets: Wie Sites
create policy "Can view assets of accessible sites"
    on public.assets for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Can insert assets of accessible sites"
    on public.assets for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can update assets of accessible sites"
    on public.assets for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can delete assets of accessible sites"
    on public.assets for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- Components: Wie Sites
create policy "Can view components of accessible sites"
    on public.components for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Can insert components of accessible sites"
    on public.components for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can update components of accessible sites"
    on public.components for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Can delete components of accessible sites"
    on public.components for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- Form Submissions
create policy "Can view form submissions of accessible sites"
    on public.form_submissions for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Anyone can insert form submissions"
    on public.form_submissions for insert
    with check (true);

-- Activity Log
create policy "Can view activity log of accessible sites"
    on public.activity_log for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Can insert activity log"
    on public.activity_log for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger on_organizations_update
    before update on public.organizations
    for each row execute function public.handle_updated_at();

create trigger on_profiles_update
    before update on public.profiles
    for each row execute function public.handle_updated_at();

create trigger on_sites_update
    before update on public.sites
    for each row execute function public.handle_updated_at();

create trigger on_pages_update
    before update on public.pages
    for each row execute function public.handle_updated_at();

create trigger on_components_update
    before update on public.components
    for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
    new_org_id uuid;
begin
    -- Create a new organization for the user
    insert into public.organizations (name, slug)
    values (
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Workspace',
        lower(replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), ' ', '-')) || '-' || substr(new.id::text, 1, 8)
    )
    returning id into new_org_id;

    -- Create profile with organization
    insert into public.profiles (id, email, full_name, avatar_url, organization_id, role)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        new_org_id,
        'owner'
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================

create index idx_sites_organization on public.sites(organization_id);
create index idx_sites_subdomain on public.sites(subdomain);
create index idx_sites_custom_domain on public.sites(custom_domain);
create index idx_pages_site on public.pages(site_id);
create index idx_pages_slug on public.pages(site_id, slug);
create index idx_assets_site on public.assets(site_id);
create index idx_assets_folder on public.assets(site_id, folder);
create index idx_components_site on public.components(site_id);
create index idx_form_submissions_site on public.form_submissions(site_id);
create index idx_activity_log_site on public.activity_log(site_id);
