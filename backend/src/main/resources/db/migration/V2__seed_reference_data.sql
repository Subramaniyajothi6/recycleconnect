-- Collector registration (design reg-collector): email is optional, collectors pick their working days.
alter table users alter column email drop not null;
alter table collector_profiles add column working_days text not null default 'MON,TUE,WED,THU,FRI,SAT';

-- Collectors may record a category the customer did not list (brief §12), so those rows have no estimate.
alter table request_items alter column estimated_qty drop not null;
alter table request_items add column added_by_collector boolean not null default false;
alter table request_items add constraint ck_request_items_estimate
    check (added_by_collector or estimated_qty is not null);

-- Waste categories (brief §5). Text and colours match the approved design.
insert into waste_categories (code, name, unit, accepts_text, warning_text, color, active, sort_order) values
    ('plastic',   'Plastic',          'KG',  'Bottles, containers, carry bags — rinsed and dry', null, '#2F6FDE', true, 1),
    ('paper',     'Paper',            'KG',  'Newspaper, books, office paper, magazines', null, '#D9A21B', true, 2),
    ('cardboard', 'Cardboard',        'KG',  'Boxes and cartons, flattened', null, '#A0683A', true, 3),
    ('metal',     'Metal',            'KG',  'Cans, utensils, small scrap', null, '#6B7A86', true, 4),
    ('glass',     'Glass',            'KG',  'Bottles and jars, unbroken', null, '#159C8F', true, 5),
    ('ewaste',    'E-waste',          'PCS', 'Phones, chargers, cables, small appliances', null, '#7A4FD0', true, 6),
    ('batteries', 'Batteries',        'KG',  'Household dry cells and phone batteries only',
        'Vehicle (lead-acid) batteries are not accepted. Tape the ends of lithium batteries before handing them over.',
        '#D9452B', true, 7),
    ('textile',   'Textile',          'KG',  'Clothes, linen, fabric offcuts — clean and dry', null, '#D6559A', true, 8),
    ('other',     'Other recyclable', 'KG',  'Describe the material in the notes', null, '#8A8F5A', true, 9);

-- Shown to customers before they submit (brief §17).
insert into not_accepted_items (text, sort_order) values
    ('Medical or biomedical waste', 1),
    ('Paint, oil and chemical containers', 2),
    ('Vehicle (lead-acid) batteries', 3),
    ('Food-soiled packaging', 4),
    ('Broken tube lights and CFLs', 5);

-- Admin-editable rules (DECISIONS P6). Times are local (Asia/Kolkata).
insert into settings (key, value) values
    ('working_days',             'MON,TUE,WED,THU,FRI,SAT'),
    ('open_time',                '08:00'),
    ('close_time',               '18:00'),
    ('slot_minutes',             '120'),
    ('closed_dates',             ''),
    ('cancel_cutoff',            'DAY_BEFORE_1800'),
    ('collector_daily_capacity', '8'),
    ('booking_horizon_days',     '14'),
    ('photo_required',           'false'),
    ('email_enabled',            'false'),
    ('reminder',                 'EVENING_BEFORE_1800'),
    ('timezone',                 'Asia/Kolkata');

-- Chennai service areas from the design.
insert into zones (name, code) values
    ('Anna Nagar', 'Z8'),
    ('T. Nagar',   'Z3'),
    ('Adyar',      'Z5'),
    ('Velachery',  'Z6'),
    ('Mylapore',   'Z4'),
    ('Kilpauk',    'Z7'),
    ('Tambaram',   'Z9');
