-- ============================================================================
-- MENU SYSTEM
-- Dynamische Navigation für Unicorn Studio
-- ============================================================================

-- Menüs (Container)
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,                           -- "Hauptmenü", "Footer Links"
  slug text not null,                           -- "main", "footer", "mobile"
  description text,
  position text default 'custom',               -- 'header', 'footer', 'mobile', 'custom'
  settings jsonb default '{}',                  -- Styling, Verhalten
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(site_id, slug)
);

-- Menü-Einträge (mit Hierarchie für Dropdowns/Mega Menus)
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  parent_id uuid references public.menu_items(id) on delete cascade,

  -- Link-Ziel
  link_type text not null default 'page',       -- 'page', 'external', 'anchor', 'archive', 'taxonomy'
  page_id uuid references public.pages(id) on delete set null,
  entry_id uuid references public.entries(id) on delete set null,
  term_id uuid references public.terms(id) on delete set null,
  content_type_slug text,                       -- Für archive links
  external_url text,
  anchor text,                                  -- '#kontakt'

  -- Anzeige
  label text not null,                          -- Angezeigter Text
  icon text,                                    -- Lucide Icon Name
  description text,                             -- Für Mega Menus
  image_url text,                               -- Für Mega Menus

  -- Attribute
  target text default '_self',                  -- '_self', '_blank'
  css_classes text,

  -- Sortierung
  position integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indizes für Performance
create index if not exists idx_menus_site on public.menus(site_id);
create index if not exists idx_menus_position on public.menus(site_id, position);
create index if not exists idx_menu_items_menu on public.menu_items(menu_id, position);
create index if not exists idx_menu_items_parent on public.menu_items(parent_id);
create index if not exists idx_menu_items_page on public.menu_items(page_id);

-- Funktion für automatische updated_at Aktualisierung (falls nicht vorhanden)
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger für updated_at
create trigger update_menus_updated_at
  before update on public.menus
  for each row execute function update_updated_at_column();

create trigger update_menu_items_updated_at
  before update on public.menu_items
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Menü mit allen Items (hierarchisch) abrufen
create or replace function get_menu_with_items(p_menu_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  -- Hole Menu-Daten
  select jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'slug', m.slug,
    'description', m.description,
    'position', m.position,
    'settings', m.settings,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', mi.id,
          'parent_id', mi.parent_id,
          'link_type', mi.link_type,
          'page_id', mi.page_id,
          'page_slug', p.slug,
          'page_name', p.name,
          'external_url', mi.external_url,
          'anchor', mi.anchor,
          'content_type_slug', mi.content_type_slug,
          'label', mi.label,
          'icon', mi.icon,
          'description', mi.description,
          'image_url', mi.image_url,
          'target', mi.target,
          'css_classes', mi.css_classes,
          'position', mi.position
        ) order by mi.position
      )
      from public.menu_items mi
      left join public.pages p on mi.page_id = p.id
      where mi.menu_id = m.id
    ), '[]'::jsonb)
  ) into result
  from public.menus m
  where m.id = p_menu_id;

  return result;
end;
$$;

-- Alle Menüs einer Site mit Item-Count
create or replace function get_site_menus(p_site_id uuid)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  menu_position text,
  settings jsonb,
  item_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    m.id,
    m.name,
    m.slug,
    m.description,
    m."position" as menu_position,
    m.settings,
    (select count(*) from public.menu_items mi where mi.menu_id = m.id) as item_count,
    m.created_at,
    m.updated_at
  from public.menus m
  where m.site_id = p_site_id
  order by m."position", m.name;
end;
$$;

-- Neues Menü erstellen
create or replace function create_menu(
  p_site_id uuid,
  p_name text,
  p_slug text,
  p_position text default 'custom',
  p_description text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.menus (site_id, name, slug, position, description)
  values (p_site_id, p_name, p_slug, p_position, p_description)
  returning id into new_id;

  return new_id;
end;
$$;

-- Menü-Item hinzufügen
create or replace function add_menu_item(
  p_menu_id uuid,
  p_label text,
  p_link_type text default 'page',
  p_page_id uuid default null,
  p_external_url text default null,
  p_anchor text default null,
  p_content_type_slug text default null,
  p_parent_id uuid default null,
  p_position integer default null,
  p_icon text default null,
  p_description text default null,
  p_target text default '_self'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
  max_position integer;
begin
  -- Bestimme Position wenn nicht angegeben
  if p_position is null then
    select coalesce(max(position), -1) + 1 into max_position
    from public.menu_items
    where menu_id = p_menu_id
    and (parent_id = p_parent_id or (parent_id is null and p_parent_id is null));

    p_position := max_position;
  end if;

  insert into public.menu_items (
    menu_id, label, link_type, page_id, external_url, anchor,
    content_type_slug, parent_id, position, icon, description, target
  )
  values (
    p_menu_id, p_label, p_link_type, p_page_id, p_external_url, p_anchor,
    p_content_type_slug, p_parent_id, p_position, p_icon, p_description, p_target
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Menü-Items neu ordnen
create or replace function reorder_menu_items(
  p_menu_id uuid,
  p_item_order uuid[]
)
returns void
language plpgsql
security definer
as $$
declare
  i integer;
begin
  for i in 1..array_length(p_item_order, 1) loop
    update public.menu_items
    set position = i - 1
    where id = p_item_order[i]
    and menu_id = p_menu_id;
  end loop;
end;
$$;

-- Menü-Item verschieben (auch Parent ändern)
create or replace function move_menu_item(
  p_item_id uuid,
  p_new_parent_id uuid,
  p_new_position integer
)
returns void
language plpgsql
security definer
as $$
begin
  update public.menu_items
  set
    parent_id = p_new_parent_id,
    position = p_new_position,
    updated_at = now()
  where id = p_item_id;
end;
$$;

-- Menü duplizieren
create or replace function duplicate_menu(
  p_menu_id uuid,
  p_new_name text,
  p_new_slug text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_menu_id uuid;
  old_item record;
  id_mapping jsonb := '{}'::jsonb;
  new_item_id uuid;
begin
  -- Menü kopieren
  insert into public.menus (site_id, name, slug, description, position, settings)
  select site_id, p_new_name, p_new_slug, description, position, settings
  from public.menus
  where id = p_menu_id
  returning id into new_menu_id;

  -- Erst alle Items ohne Parent kopieren
  for old_item in
    select * from public.menu_items
    where menu_id = p_menu_id and parent_id is null
    order by position
  loop
    insert into public.menu_items (
      menu_id, parent_id, link_type, page_id, external_url, anchor,
      content_type_slug, label, icon, description, image_url, target, css_classes, position
    )
    values (
      new_menu_id, null, old_item.link_type, old_item.page_id, old_item.external_url, old_item.anchor,
      old_item.content_type_slug, old_item.label, old_item.icon, old_item.description,
      old_item.image_url, old_item.target, old_item.css_classes, old_item.position
    )
    returning id into new_item_id;

    id_mapping := id_mapping || jsonb_build_object(old_item.id::text, new_item_id);
  end loop;

  -- Dann Items mit Parent kopieren
  for old_item in
    select * from public.menu_items
    where menu_id = p_menu_id and parent_id is not null
    order by position
  loop
    insert into public.menu_items (
      menu_id, parent_id, link_type, page_id, external_url, anchor,
      content_type_slug, label, icon, description, image_url, target, css_classes, position
    )
    values (
      new_menu_id,
      (id_mapping->>(old_item.parent_id::text))::uuid,
      old_item.link_type, old_item.page_id, old_item.external_url, old_item.anchor,
      old_item.content_type_slug, old_item.label, old_item.icon, old_item.description,
      old_item.image_url, old_item.target, old_item.css_classes, old_item.position
    );
  end loop;

  return new_menu_id;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.menus enable row level security;
alter table public.menu_items enable row level security;

-- Menus: Nur Org-Mitglieder können zugreifen
create policy "Users can view menus of their organization's sites"
  on public.menus for select
  using (
    exists (
      select 1 from public.sites s
      join public.profiles p on s.organization_id = p.organization_id
      where s.id = menus.site_id
      and p.id = auth.uid()
    )
  );

create policy "Users can insert menus in their organization's sites"
  on public.menus for insert
  with check (
    exists (
      select 1 from public.sites s
      join public.profiles p on s.organization_id = p.organization_id
      where s.id = site_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Users can update menus in their organization's sites"
  on public.menus for update
  using (
    exists (
      select 1 from public.sites s
      join public.profiles p on s.organization_id = p.organization_id
      where s.id = menus.site_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Users can delete menus in their organization's sites"
  on public.menus for delete
  using (
    exists (
      select 1 from public.sites s
      join public.profiles p on s.organization_id = p.organization_id
      where s.id = menus.site_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin')
    )
  );

-- Menu Items: Gleiche Regeln wie Menus
create policy "Users can view menu_items of their organization's menus"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.menus m
      join public.sites s on m.site_id = s.id
      join public.profiles p on s.organization_id = p.organization_id
      where m.id = menu_items.menu_id
      and p.id = auth.uid()
    )
  );

create policy "Users can insert menu_items in their organization's menus"
  on public.menu_items for insert
  with check (
    exists (
      select 1 from public.menus m
      join public.sites s on m.site_id = s.id
      join public.profiles p on s.organization_id = p.organization_id
      where m.id = menu_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Users can update menu_items in their organization's menus"
  on public.menu_items for update
  using (
    exists (
      select 1 from public.menus m
      join public.sites s on m.site_id = s.id
      join public.profiles p on s.organization_id = p.organization_id
      where m.id = menu_items.menu_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Users can delete menu_items in their organization's menus"
  on public.menu_items for delete
  using (
    exists (
      select 1 from public.menus m
      join public.sites s on m.site_id = s.id
      join public.profiles p on s.organization_id = p.organization_id
      where m.id = menu_items.menu_id
      and p.id = auth.uid()
      and p.role in ('owner', 'admin')
    )
  );
