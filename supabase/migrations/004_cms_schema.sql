-- ============================================
-- UNICORN STUDIO - CMS SCHEMA
-- Content Types, Fields, Entries, Taxonomies
-- ============================================

-- ============================================
-- CONTENT TYPES (User-definierte Inhaltstypen)
-- ============================================
create table public.content_types (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Naming
    name text not null,                    -- "rezept" (slug, lowercase)
    label_singular text not null,          -- "Rezept"
    label_plural text not null,            -- "Rezepte"
    slug text not null,                    -- "rezepte" (für URLs)

    -- UI
    icon text default 'file-text',         -- Lucide icon name
    description text,
    color text,                            -- Accent color

    -- Features
    has_title boolean default true,
    has_slug boolean default true,
    has_content boolean default false,     -- Rich Text Editor
    has_excerpt boolean default false,
    has_featured_image boolean default false,
    has_author boolean default false,
    has_published_date boolean default true,
    has_seo boolean default true,

    -- Archive/Single Pages
    has_archive boolean default true,
    has_single boolean default true,

    -- Sorting
    default_sort_field text default 'created_at',
    default_sort_order text default 'desc' check (default_sort_order in ('asc', 'desc')),

    -- Menu
    menu_position integer default 10,
    show_in_menu boolean default true,

    -- SEO Template
    seo_template jsonb default '{}'::jsonb,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(site_id, name)
);

create index idx_content_types_site on public.content_types(site_id);
create index idx_content_types_menu on public.content_types(site_id, show_in_menu, menu_position);

-- ============================================
-- FIELDS (Felder für Content Types)
-- ============================================
create table public.fields (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,
    content_type_id uuid references public.content_types(id) on delete cascade not null,

    -- Field Definition
    name text not null,                    -- "preis" (key)
    label text not null,                   -- "Preis"
    type text not null,                    -- "number", "image", "repeater"

    -- Help
    instructions text,
    placeholder text,

    -- Validation
    required boolean default false,

    -- Type-specific settings
    settings jsonb default '{}'::jsonb,

    -- For group/repeater: Sub-Fields
    sub_fields jsonb,

    -- For flexible content: Layouts
    layouts jsonb,

    -- Conditional Logic
    conditions jsonb,

    -- Layout
    width text default '100%' check (width in ('100%', '50%', '33%', '25%')),

    -- Position
    position integer default 0,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(content_type_id, name)
);

create index idx_fields_content_type on public.fields(content_type_id);
create index idx_fields_position on public.fields(content_type_id, position);

-- ============================================
-- ENTRIES (Die eigentlichen Inhalte)
-- ============================================
create table public.entries (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,
    content_type_id uuid references public.content_types(id) on delete cascade not null,

    -- Standard Fields
    title text,
    slug text,
    content text,                          -- HTML wenn has_content
    excerpt text,

    -- Custom Field Values
    data jsonb default '{}'::jsonb,

    -- Featured Image
    featured_image_id uuid references public.assets(id) on delete set null,

    -- Status
    status text default 'draft' check (status in ('draft', 'published', 'scheduled', 'archived')),
    published_at timestamptz,
    scheduled_at timestamptz,

    -- Author
    author_id uuid references public.profiles(id) on delete set null,

    -- SEO
    seo jsonb default '{}'::jsonb,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(site_id, content_type_id, slug)
);

create index idx_entries_content_type on public.entries(content_type_id);
create index idx_entries_status on public.entries(status);
create index idx_entries_published on public.entries(published_at desc);
create index idx_entries_site_status on public.entries(site_id, status);

-- ============================================
-- TAXONOMIES (Kategorien, Tags, etc.)
-- ============================================
create table public.taxonomies (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    name text not null,                    -- "kategorie"
    label_singular text not null,          -- "Kategorie"
    label_plural text not null,            -- "Kategorien"
    slug text not null,

    hierarchical boolean default false,    -- true = Parent/Child möglich

    -- Which content types use this?
    content_type_ids uuid[] default '{}',

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(site_id, slug)
);

create index idx_taxonomies_site on public.taxonomies(site_id);

-- ============================================
-- TERMS (Die einzelnen Kategorien/Tags)
-- ============================================
create table public.terms (
    id uuid primary key default gen_random_uuid(),
    taxonomy_id uuid references public.taxonomies(id) on delete cascade not null,

    name text not null,
    slug text not null,
    description text,

    parent_id uuid references public.terms(id) on delete set null,

    image_id uuid references public.assets(id) on delete set null,
    data jsonb default '{}'::jsonb,

    position integer default 0,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(taxonomy_id, slug)
);

create index idx_terms_taxonomy on public.terms(taxonomy_id);
create index idx_terms_parent on public.terms(parent_id);
create index idx_terms_position on public.terms(taxonomy_id, position);

-- ============================================
-- ENTRY_TERMS (Verknüpfung Entry <-> Terms)
-- ============================================
create table public.entry_terms (
    entry_id uuid references public.entries(id) on delete cascade not null,
    term_id uuid references public.terms(id) on delete cascade not null,
    primary key (entry_id, term_id)
);

create index idx_entry_terms_entry on public.entry_terms(entry_id);
create index idx_entry_terms_term on public.entry_terms(term_id);

-- ============================================
-- CMS_COMPONENTS (Component Library für CMS)
-- Separate Tabelle um bestehende components nicht zu ändern
-- ============================================
create table public.cms_components (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Meta
    name text not null,
    description text,

    -- Categorization
    type text not null check (type in ('element', 'block', 'section', 'layout')),
    category text,                         -- 'buttons', 'cards', 'heroes'
    tags text[] default '{}',

    -- Code
    html text not null,

    -- Variants
    variants jsonb default '[]'::jsonb,
    default_variant text default 'default',

    -- Props
    props jsonb default '[]'::jsonb,

    -- Preview
    thumbnail_url text,

    -- Usage
    usage_count integer default 0,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- Constraints
    unique(site_id, name)
);

create index idx_cms_components_site on public.cms_components(site_id);
create index idx_cms_components_type on public.cms_components(site_id, type);
create index idx_cms_components_category on public.cms_components(site_id, category);

-- ============================================
-- TEMPLATES (Layouts für Content Types)
-- ============================================
create table public.templates (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    name text not null,
    description text,

    type text not null check (type in ('page', 'single', 'archive', 'taxonomy')),

    -- Conditions: Wann wird dieses Template verwendet?
    conditions jsonb default '{}'::jsonb,

    -- Content
    html text not null,

    priority integer default 0,
    is_default boolean default false,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_templates_site on public.templates(site_id);
create index idx_templates_type on public.templates(site_id, type);

-- ============================================
-- DESIGN_VARIABLES (Design Tokens)
-- ============================================
create table public.design_variables (
    id uuid primary key default gen_random_uuid(),
    site_id uuid references public.sites(id) on delete cascade not null,

    -- Variables organized by category
    colors jsonb default '{
        "brand": {
            "primary": "#3b82f6",
            "secondary": "#64748b",
            "accent": "#f59e0b"
        },
        "semantic": {
            "success": "#22c55e",
            "warning": "#f59e0b",
            "error": "#ef4444",
            "info": "#3b82f6"
        },
        "neutral": {
            "50": "#f8fafc",
            "100": "#f1f5f9",
            "200": "#e2e8f0",
            "300": "#cbd5e1",
            "400": "#94a3b8",
            "500": "#64748b",
            "600": "#475569",
            "700": "#334155",
            "800": "#1e293b",
            "900": "#0f172a",
            "950": "#020617"
        }
    }'::jsonb,

    typography jsonb default '{
        "fontHeading": "Inter",
        "fontBody": "Inter",
        "fontMono": "JetBrains Mono",
        "fontSizes": {
            "xs": "0.75rem",
            "sm": "0.875rem",
            "base": "1rem",
            "lg": "1.125rem",
            "xl": "1.25rem",
            "2xl": "1.5rem",
            "3xl": "1.875rem",
            "4xl": "2.25rem",
            "5xl": "3rem"
        },
        "fontWeights": {
            "light": "300",
            "normal": "400",
            "medium": "500",
            "semibold": "600",
            "bold": "700"
        },
        "lineHeights": {
            "tight": "1.25",
            "normal": "1.5",
            "relaxed": "1.75"
        }
    }'::jsonb,

    spacing jsonb default '{
        "scale": {
            "xs": "0.25rem",
            "sm": "0.5rem",
            "md": "1rem",
            "lg": "1.5rem",
            "xl": "2rem",
            "2xl": "3rem",
            "3xl": "4rem"
        },
        "containerWidths": {
            "sm": "640px",
            "md": "768px",
            "lg": "1024px",
            "xl": "1280px",
            "2xl": "1536px"
        }
    }'::jsonb,

    borders jsonb default '{
        "radius": {
            "none": "0",
            "sm": "0.125rem",
            "md": "0.375rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "2xl": "1rem",
            "full": "9999px"
        },
        "widths": {
            "thin": "1px",
            "medium": "2px",
            "thick": "4px"
        }
    }'::jsonb,

    shadows jsonb default '{
        "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
        "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
    }'::jsonb,

    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),

    -- One per site
    unique(site_id)
);

create index idx_design_variables_site on public.design_variables(site_id);

-- ============================================
-- SEO_SETTINGS erweitern (Global für Site)
-- Fügt seo_settings Spalte zu sites hinzu
-- ============================================
alter table public.sites
add column if not exists seo_settings jsonb default '{
    "site_name": "",
    "title_separator": " | ",
    "title_format": "{{page_title}}{{separator}}{{site_name}}",
    "default_meta_description": "",
    "default_og_image": null,
    "favicon": null,
    "apple_touch_icon": null,
    "google_verification": null,
    "bing_verification": null,
    "google_analytics_id": null,
    "google_tag_manager_id": null,
    "facebook_pixel_id": null,
    "custom_scripts_head": "",
    "custom_scripts_body": "",
    "robots_txt": "User-agent: *\nAllow: /",
    "sitemap_enabled": true,
    "social_profiles": {
        "facebook": null,
        "twitter": null,
        "instagram": null,
        "linkedin": null,
        "youtube": null
    },
    "local_business": null
}'::jsonb;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.content_types enable row level security;
alter table public.fields enable row level security;
alter table public.entries enable row level security;
alter table public.taxonomies enable row level security;
alter table public.terms enable row level security;
alter table public.entry_terms enable row level security;
alter table public.cms_components enable row level security;
alter table public.templates enable row level security;
alter table public.design_variables enable row level security;

-- ============================================
-- RLS POLICIES - Content Types
-- ============================================

create policy "Users can view content types of their sites"
    on public.content_types for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create content types in their sites"
    on public.content_types for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update content types in their sites"
    on public.content_types for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete content types in their sites"
    on public.content_types for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Fields
-- ============================================

create policy "Users can view fields of their sites"
    on public.fields for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create fields in their sites"
    on public.fields for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update fields in their sites"
    on public.fields for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete fields in their sites"
    on public.fields for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Entries
-- ============================================

create policy "Users can view entries of their sites"
    on public.entries for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create entries in their sites"
    on public.entries for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update entries in their sites"
    on public.entries for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete entries in their sites"
    on public.entries for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- RLS POLICIES - Taxonomies
-- ============================================

create policy "Users can view taxonomies of their sites"
    on public.taxonomies for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create taxonomies in their sites"
    on public.taxonomies for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update taxonomies in their sites"
    on public.taxonomies for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete taxonomies in their sites"
    on public.taxonomies for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Terms
-- ============================================

create policy "Users can view terms of their sites"
    on public.terms for select
    using (
        taxonomy_id in (
            select t.id from public.taxonomies t
            join public.sites s on s.id = t.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create terms in their sites"
    on public.terms for insert
    with check (
        taxonomy_id in (
            select t.id from public.taxonomies t
            join public.sites s on s.id = t.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update terms in their sites"
    on public.terms for update
    using (
        taxonomy_id in (
            select t.id from public.taxonomies t
            join public.sites s on s.id = t.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete terms in their sites"
    on public.terms for delete
    using (
        taxonomy_id in (
            select t.id from public.taxonomies t
            join public.sites s on s.id = t.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- RLS POLICIES - Entry Terms
-- ============================================

create policy "Users can view entry terms of their sites"
    on public.entry_terms for select
    using (
        entry_id in (
            select e.id from public.entries e
            join public.sites s on s.id = e.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create entry terms in their sites"
    on public.entry_terms for insert
    with check (
        entry_id in (
            select e.id from public.entries e
            join public.sites s on s.id = e.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete entry terms in their sites"
    on public.entry_terms for delete
    using (
        entry_id in (
            select e.id from public.entries e
            join public.sites s on s.id = e.site_id
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- RLS POLICIES - CMS Components
-- ============================================

create policy "Users can view CMS components of their sites"
    on public.cms_components for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create CMS components in their sites"
    on public.cms_components for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update CMS components in their sites"
    on public.cms_components for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete CMS components in their sites"
    on public.cms_components for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- RLS POLICIES - Templates
-- ============================================

create policy "Users can view templates of their sites"
    on public.templates for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create templates in their sites"
    on public.templates for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update templates in their sites"
    on public.templates for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can delete templates in their sites"
    on public.templates for delete
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin')
        )
    );

-- ============================================
-- RLS POLICIES - Design Variables
-- ============================================

create policy "Users can view design variables of their sites"
    on public.design_variables for select
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
        )
    );

create policy "Users can create design variables in their sites"
    on public.design_variables for insert
    with check (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

create policy "Users can update design variables in their sites"
    on public.design_variables for update
    using (
        site_id in (
            select s.id from public.sites s
            join public.profiles p on p.organization_id = s.organization_id
            where p.id = auth.uid()
            and p.role in ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- TRIGGERS - Auto-update updated_at
-- ============================================

create trigger on_content_types_update
    before update on public.content_types
    for each row execute function public.handle_updated_at();

create trigger on_fields_update
    before update on public.fields
    for each row execute function public.handle_updated_at();

create trigger on_entries_update
    before update on public.entries
    for each row execute function public.handle_updated_at();

create trigger on_taxonomies_update
    before update on public.taxonomies
    for each row execute function public.handle_updated_at();

create trigger on_terms_update
    before update on public.terms
    for each row execute function public.handle_updated_at();

create trigger on_cms_components_update
    before update on public.cms_components
    for each row execute function public.handle_updated_at();

create trigger on_templates_update
    before update on public.templates
    for each row execute function public.handle_updated_at();

create trigger on_design_variables_update
    before update on public.design_variables
    for each row execute function public.handle_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get entries count by content type
create or replace function public.get_entries_count(target_content_type_id uuid)
returns integer as $$
begin
    return (
        select count(*)::integer
        from public.entries
        where content_type_id = target_content_type_id
    );
end;
$$ language plpgsql security definer;

-- Get fields for a content type (ordered)
create or replace function public.get_content_type_fields(target_content_type_id uuid)
returns setof public.fields as $$
begin
    return query
    select *
    from public.fields
    where content_type_id = target_content_type_id
    order by position asc;
end;
$$ language plpgsql security definer;

-- Duplicate content type with fields
create or replace function public.duplicate_content_type(
    source_content_type_id uuid,
    new_name text,
    new_slug text
)
returns uuid as $$
declare
    new_content_type_id uuid;
    source_site_id uuid;
begin
    -- Get source site_id
    select site_id into source_site_id
    from public.content_types
    where id = source_content_type_id;

    -- Create new content type
    insert into public.content_types (
        site_id, name, label_singular, label_plural, slug, icon, description, color,
        has_title, has_slug, has_content, has_excerpt, has_featured_image,
        has_author, has_published_date, has_seo, has_archive, has_single,
        default_sort_field, default_sort_order, menu_position, show_in_menu, seo_template
    )
    select
        site_id, new_name, label_singular || ' (Kopie)', label_plural || ' (Kopie)', new_slug,
        icon, description, color, has_title, has_slug, has_content, has_excerpt,
        has_featured_image, has_author, has_published_date, has_seo, has_archive,
        has_single, default_sort_field, default_sort_order, menu_position + 1,
        show_in_menu, seo_template
    from public.content_types
    where id = source_content_type_id
    returning id into new_content_type_id;

    -- Copy fields
    insert into public.fields (
        site_id, content_type_id, name, label, type, instructions, placeholder,
        required, settings, sub_fields, layouts, conditions, width, position
    )
    select
        source_site_id, new_content_type_id, name, label, type, instructions,
        placeholder, required, settings, sub_fields, layouts, conditions,
        width, position
    from public.fields
    where content_type_id = source_content_type_id;

    return new_content_type_id;
end;
$$ language plpgsql security definer;

-- Reorder fields
create or replace function public.reorder_fields(
    target_content_type_id uuid,
    field_order uuid[]
)
returns void as $$
declare
    i integer := 0;
    field_id uuid;
begin
    foreach field_id in array field_order loop
        update public.fields
        set position = i
        where id = field_id
        and content_type_id = target_content_type_id;
        i := i + 1;
    end loop;
end;
$$ language plpgsql security definer;

-- Publish entry
create or replace function public.publish_entry(target_entry_id uuid)
returns void as $$
begin
    update public.entries
    set status = 'published',
        published_at = now()
    where id = target_entry_id;
end;
$$ language plpgsql security definer;

-- Unpublish entry
create or replace function public.unpublish_entry(target_entry_id uuid)
returns void as $$
begin
    update public.entries
    set status = 'draft',
        published_at = null
    where id = target_entry_id;
end;
$$ language plpgsql security definer;

-- Create default design variables for a site
create or replace function public.create_default_design_variables(target_site_id uuid)
returns uuid as $$
declare
    new_id uuid;
begin
    insert into public.design_variables (site_id)
    values (target_site_id)
    returning id into new_id;

    return new_id;
end;
$$ language plpgsql security definer;
