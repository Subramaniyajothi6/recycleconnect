-- Cities (roadmap: multi-city operations). Zones belong to a city; requests reach a city through their zone.
create table cities (
    id        bigint generated always as identity primary key,
    name      text    not null unique,
    state     text    not null,
    timezone  text    not null default 'Asia/Kolkata',
    lat       double precision,
    lng       double precision,
    active    boolean not null default true
);
insert into cities (name, state, lat, lng) values ('Chennai', 'Tamil Nadu', 13.0827, 80.2707);

alter table zones add column city_id bigint references cities (id);
update zones set city_id = (select id from cities where name = 'Chennai');
alter table zones alter column city_id set not null;
alter table zones add column lat double precision;
alter table zones add column lng double precision;
update zones set lat = 13.0850, lng = 80.2101 where name = 'Anna Nagar';
update zones set lat = 13.0418, lng = 80.2341 where name = 'T. Nagar';
update zones set lat = 12.9815, lng = 80.2180 where name = 'Velachery';
update zones set lat = 13.0012, lng = 80.2565 where name = 'Adyar';
update zones set lat = 13.0339, lng = 80.2619 where name = 'Mylapore';
update zones set lat = 13.0829, lng = 80.2420 where name = 'Kilpauk';
update zones set lat = 12.9249, lng = 80.1000 where name = 'Tambaram';

-- Human-readable codes: RC-26-00001, CMP-0001.
create sequence request_code_seq start 1;
create sequence complaint_code_seq start 1;

-- Requests: zone for matching collectors, source address, optimistic locking.
alter table collection_requests add column zone_id bigint references zones (id);
alter table collection_requests add column address_id bigint references addresses (id) on delete set null;
alter table collection_requests add column updated_at timestamptz not null default now();
alter table collection_requests add column version bigint not null default 0;
-- The booked date and slot (set by an admin). preferred_* keep what the customer asked for.
alter table collection_requests add column scheduled_date date;
alter table collection_requests add column scheduled_slot text;
create index idx_requests_scheduled_date on collection_requests (scheduled_date);
create index idx_requests_preferred_date on collection_requests (preferred_date);
create index idx_requests_zone on collection_requests (zone_id);
create index idx_requests_created on collection_requests (created_at);

alter table pickups add column version bigint not null default 0;
alter table pickups add column assigned_by bigint references users (id);
create index idx_pickups_date on pickups (scheduled_date);
create index idx_pickups_status on pickups (pickup_status);

create index idx_request_items_category on request_items (category_id);

alter table request_photos add column content_type text;
alter table request_photos add column size_bytes bigint;

alter table collector_profiles add column id_proof_type text;

-- Accounts: token version (bumped to sign out every device), notification preferences, last sign-in.
alter table users add column token_version int not null default 0;
alter table users add column email_notifications boolean not null default true;
alter table users add column reminder_enabled boolean not null default true;
alter table users add column last_login_at timestamptz;
alter table users add column version bigint not null default 0;

alter table complaints add column resolution_type text;
alter table complaints add column version bigint not null default 0;
create index idx_complaints_status on complaints (status);
create index idx_complaints_customer on complaints (customer_id);

alter table customer_confirmations add column confirmed_by bigint references users (id);
alter table customer_confirmations add column auto boolean not null default false;

create index idx_audit_user on audit_log (user_id);
create index idx_audit_entity on audit_log (entity, entity_id);
create index idx_notifications_unread on notifications (user_id) where read_at is null;

insert into settings (key, value) values
    ('auto_complete_hours', '48'),
    ('max_upload_mb',       '5'),
    ('draft_keep_days',     '30');
