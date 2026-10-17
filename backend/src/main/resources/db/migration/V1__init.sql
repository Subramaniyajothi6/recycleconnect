-- RecycleConnect schema v1. Enum-like columns are text + CHECK so JPA can map them with EnumType.STRING.

create table users (
    id                  bigint generated always as identity primary key,
    role                text        not null check (role in ('CUSTOMER', 'COLLECTOR', 'ADMIN')),
    name                text        not null,
    email               text        not null unique,
    mobile              text        not null unique,
    password_hash       text        not null,
    status              text        not null default 'ACTIVE'
                                    check (status in ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_APPROVAL')),
    preferred_language  text        not null default 'en' check (preferred_language in ('en', 'ta')),
    created_at          timestamptz not null default now()
);

create table customer_profiles (
    user_id           bigint primary key references users (id) on delete cascade,
    customer_type     text not null check (customer_type in ('HOUSEHOLD', 'SHOP', 'OFFICE', 'INSTITUTION', 'BUSINESS')),
    preferred_contact text not null default 'APP' check (preferred_contact in ('PHONE', 'EMAIL', 'APP'))
);

create table collector_profiles (
    user_id        bigint primary key references users (id) on delete cascade,
    vehicle_type   text,
    vehicle_number text,
    id_proof_path  text,
    available      boolean not null default true,
    approved_by    bigint references users (id),
    approved_at    timestamptz
);

create table zones (
    id   bigint generated always as identity primary key,
    name text not null unique,
    code text not null unique
);

create table collector_zones (
    collector_id bigint not null references users (id) on delete cascade,
    zone_id      bigint not null references zones (id) on delete cascade,
    primary key (collector_id, zone_id)
);

create table addresses (
    id         bigint generated always as identity primary key,
    user_id    bigint  not null references users (id) on delete cascade,
    label      text,
    line1      text    not null,
    area       text,
    city       text    not null,
    district   text,
    state      text,
    pin        text,
    lat        double precision,
    lng        double precision,
    is_default boolean not null default false
);
create index idx_addresses_user on addresses (user_id);

create table waste_categories (
    id           bigint generated always as identity primary key,
    code         text    not null unique,
    name         text    not null,
    unit         text    not null check (unit in ('KG', 'PCS')),
    accepts_text text,
    warning_text text,
    color        text    not null,
    active       boolean not null default true,
    sort_order   int     not null default 0
);

create table not_accepted_items (
    id         bigint generated always as identity primary key,
    text       text not null,
    sort_order int  not null default 0
);

create table settings (
    key   text primary key,
    value text not null
);

create table collection_requests (
    id              bigint generated always as identity primary key,
    code            text        not null unique,
    customer_id     bigint      not null references users (id),
    address_label   text,
    address_line1   text        not null,
    address_area    text,
    address_city    text        not null,
    address_district text,
    address_state   text,
    address_pin     text,
    lat             double precision,
    lng             double precision,
    preferred_date  date,
    preferred_slot  text,
    notes           text,
    status          text        not null default 'DRAFT'
                                check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'ACCEPTED',
                                                  'REJECTED', 'SCHEDULED', 'ASSIGNED', 'PICKUP_STARTED', 'COLLECTED',
                                                  'COMPLETED', 'CANCELLED', 'FAILED')),
    reject_reason   text,
    info_request    text,
    cancel_reason   text,
    cancelled_by    bigint references users (id),
    cancelled_at    timestamptz,
    created_at      timestamptz not null default now(),
    submitted_at    timestamptz,
    completed_at    timestamptz
);
create index idx_requests_customer on collection_requests (customer_id);
create index idx_requests_status on collection_requests (status);

create table request_items (
    id            bigint generated always as identity primary key,
    request_id    bigint        not null references collection_requests (id) on delete cascade,
    category_id   bigint        not null references waste_categories (id),
    estimated_qty numeric(10, 2) not null check (estimated_qty > 0),
    unit          text          not null check (unit in ('KG', 'PCS')),
    actual_qty    numeric(10, 2) check (actual_qty >= 0),
    actual_unit   text check (actual_unit in ('KG', 'PCS')),
    unique (request_id, category_id)
);

create table request_photos (
    id          bigint generated always as identity primary key,
    request_id  bigint      not null references collection_requests (id) on delete cascade,
    kind        text        not null check (kind in ('CUSTOMER', 'EVIDENCE')),
    path        text        not null,
    uploaded_by bigint      not null references users (id),
    uploaded_at timestamptz not null default now()
);
create index idx_photos_request on request_photos (request_id);

create table pickups (
    id              bigint generated always as identity primary key,
    request_id      bigint      not null references collection_requests (id),
    collector_id    bigint      not null references users (id),
    scheduled_date  date        not null,
    slot            text        not null,
    pickup_status   text        not null default 'ASSIGNED'
                                check (pickup_status in ('ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED',
                                                         'COLLECTION_STARTED', 'COLLECTED', 'COMPLETED', 'FAILED')),
    active          boolean     not null default true,
    assigned_at     timestamptz not null default now(),
    accepted_at     timestamptz,
    started_at      timestamptz,
    arrived_at      timestamptz,
    collected_at    timestamptz,
    completed_at    timestamptz,
    fail_reason     text,
    fail_note       text,
    collector_notes text
);
-- Only one active pickup per request; reassignment deactivates the old row.
create unique index uq_pickups_active_request on pickups (request_id) where active;
create index idx_pickups_collector_date on pickups (collector_id, scheduled_date);

create table reschedules (
    id         bigint generated always as identity primary key,
    request_id bigint      not null references collection_requests (id) on delete cascade,
    from_date  date,
    from_slot  text,
    to_date    date        not null,
    to_slot    text        not null,
    reason     text,
    changed_by bigint      not null references users (id),
    changed_at timestamptz not null default now()
);

create table status_history (
    id          bigint generated always as identity primary key,
    request_id  bigint      not null references collection_requests (id) on delete cascade,
    from_status text,
    to_status   text        not null,
    by_user     bigint references users (id),
    at          timestamptz not null default now(),
    note        text
);
create index idx_status_history_request on status_history (request_id, at);

create table customer_confirmations (
    request_id bigint primary key references collection_requests (id) on delete cascade,
    confirmed  boolean     not null,
    feedback   text,
    at         timestamptz not null default now()
);

create table complaints (
    id          bigint generated always as identity primary key,
    code        text        not null unique,
    request_id  bigint references collection_requests (id),
    customer_id bigint      not null references users (id),
    type        text        not null,
    description text        not null,
    status      text        not null default 'OPEN' check (status in ('OPEN', 'IN_REVIEW', 'RESOLVED')),
    assigned_to bigint references users (id),
    resolution  text,
    reply       text,
    created_at  timestamptz not null default now(),
    resolved_at timestamptz
);

create table notifications (
    id         bigint generated always as identity primary key,
    user_id    bigint      not null references users (id) on delete cascade,
    kind       text        not null,
    title      text        not null,
    body       text,
    link       text,
    read_at    timestamptz,
    created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (user_id, created_at desc);

-- Append-only: the app never updates or deletes rows here.
create table audit_log (
    id        bigint generated always as identity primary key,
    at        timestamptz not null default now(),
    user_id   bigint references users (id),
    role      text,
    action    text        not null,
    entity    text        not null,
    entity_id text,
    details   jsonb
);
create index idx_audit_at on audit_log (at desc);
