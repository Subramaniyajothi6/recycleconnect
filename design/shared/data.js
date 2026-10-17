/* RecycleConnect design samples — shared sample data.
   Every design renders this same content so the directions can be compared like for like. */
window.RC = (function () {
  const categories = [
    { id: 'plastic',   name: 'Plastic',   unit: 'kg',  accepts: 'Bottles, containers, carry bags — rinsed and dry' },
    { id: 'paper',     name: 'Paper',     unit: 'kg',  accepts: 'Newspaper, books, office paper, magazines' },
    { id: 'cardboard', name: 'Cardboard', unit: 'kg',  accepts: 'Boxes and cartons, flattened' },
    { id: 'metal',     name: 'Metal',     unit: 'kg',  accepts: 'Cans, utensils, small scrap' },
    { id: 'glass',     name: 'Glass',     unit: 'kg',  accepts: 'Bottles and jars, unbroken' },
    { id: 'ewaste',    name: 'E-waste',   unit: 'pcs', accepts: 'Phones, chargers, cables, small appliances' },
    { id: 'batteries', name: 'Batteries', unit: 'kg',  accepts: 'Household dry cells and phone batteries only',
      warning: 'Vehicle (lead-acid) batteries are not accepted. Tape the ends of lithium batteries before handing them over.' },
    { id: 'textile',   name: 'Textile',   unit: 'kg',  accepts: 'Clothes, linen, fabric offcuts — clean and dry' },
    { id: 'other',     name: 'Other recyclable', unit: 'kg', accepts: 'Describe the material in the notes' },
  ];

  const notAccepted = [
    'Medical or biomedical waste',
    'Paint, oil and chemical containers',
    'Vehicle (lead-acid) batteries',
    'Food-soiled packaging',
    'Broken tube lights and CFLs',
  ];

  const settings = {
    operatingDays: 'Mon – Sat',
    slots: ['08:00 – 10:00', '10:00 – 12:00', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00'],
    cancelCutoff: 'until 6:00 pm the day before pickup',
  };

  /* Customer-facing request status (PDF §7) with plain-language labels (§28) */
  const requestStatus = {
    draft:          { label: 'Draft',                tone: 'neutral' },
    submitted:      { label: 'Submitted',            tone: 'info' },
    under_review:   { label: 'Under review',         tone: 'info' },
    info_requested: { label: 'More info needed',     tone: 'warn' },
    accepted:       { label: 'Accepted',             tone: 'info' },
    scheduled:      { label: 'Scheduled',            tone: 'info' },
    assigned:       { label: 'Collector assigned',   tone: 'active' },
    pickup_started: { label: 'Pickup in progress',   tone: 'active' },
    collected:      { label: 'Collected — confirm',  tone: 'warn' },
    completed:      { label: 'Completed',            tone: 'done' },
    cancelled:      { label: 'Cancelled',            tone: 'muted' },
    failed:         { label: 'Pickup failed',        tone: 'bad' },
  };

  /* Collector pickup workflow (PDF §11) */
  const pickupFlow = [
    { id: 'assigned',           label: 'Assigned',           action: 'Accept pickup' },
    { id: 'accepted',           label: 'Accepted',           action: 'Start trip' },
    { id: 'on_the_way',         label: 'On the way',         action: 'I have arrived' },
    { id: 'arrived',            label: 'Arrived',            action: 'Start collection' },
    { id: 'collection_started', label: 'Collection started', action: 'Save quantities' },
    { id: 'collected',          label: 'Collected',          action: 'Mark completed' },
    { id: 'completed',          label: 'Completed',          action: null },
  ];

  const failReasons = [
    'Customer unavailable', 'Incorrect address', 'Material unavailable',
    'Unable to reach location', 'Unsafe or invalid material', 'Other',
  ];

  const complaintTypes = [
    'Collector did not arrive', 'Wrong quantity recorded', 'Wrong material category',
    'Pickup delayed', 'Poor service', 'Other',
  ];

  const customer = {
    name: 'Priya Raman', first: 'Priya', type: 'Household',
    mobile: '+91 98400 12345', email: 'priya.raman@example.in',
    address: 'Flat 4B, Lotus Apartments, 2nd Avenue, Anna Nagar',
    city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pin: '600040',
    lat: 13.0850, lng: 80.2101,
    stats: { total: 14, completed: 11, cancelled: 1, failed: 1, active: 1, kg: 186.4,
      byCategory: [['paper', 72.5], ['cardboard', 48.0], ['plastic', 31.2], ['metal', 17.9], ['glass', 11.6], ['textile', 5.2]] },
  };

  const activeRequest = {
    id: 'RC-26-01482', status: 'assigned', created: 'Tue 6 Oct, 09:14',
    items: [ { cat: 'paper', est: 12 }, { cat: 'cardboard', est: 8 }, { cat: 'plastic', est: 4 } ],
    date: 'Wed 7 Oct', slot: '10:00 – 12:00',
    address: customer.address + ', Chennai 600040',
    notes: 'Bundled near the lift on the ground floor. Call before coming up.',
    photos: 2,
    collector: { name: 'Murugan K', vehicle: 'TN 09 BX 4471', phone: '+91 9•••• ••218', zone: 'Anna Nagar' },
    timeline: [
      { label: 'Request submitted',    at: '6 Oct, 09:14', done: true },
      { label: 'Accepted',             at: '6 Oct, 11:02', done: true },
      { label: 'Pickup scheduled',     at: '6 Oct, 11:05', done: true, detail: 'Wed 7 Oct, 10:00 – 12:00' },
      { label: 'Collector assigned',   at: '6 Oct, 15:40', done: true, current: true, detail: 'Murugan K will collect' },
      { label: 'Pickup started',       at: null },
      { label: 'Material collected',   at: null },
      { label: 'Collection completed', at: null },
    ],
    reschedules: [
      { from: 'Tue 6 Oct, 16:00 – 18:00', to: 'Wed 7 Oct, 10:00 – 12:00', by: 'Admin (Kavya S)', reason: 'No collector free in Anna Nagar on Tuesday evening', at: '6 Oct, 11:05' },
    ],
  };

  const history = [
    { id: 'RC-26-01377', date: '18 Sep', status: 'completed', items: [['paper', 14.2, 15], ['cardboard', 7.2, 6]] },
    { id: 'RC-26-01290', date: '29 Aug', status: 'completed', items: [['plastic', 6.1, 5], ['metal', 3.7, 4]] },
    { id: 'RC-26-01211', date: '12 Aug', status: 'failed',    items: [['glass', null, 6]], reason: 'Customer unavailable' },
    { id: 'RC-26-01102', date: '24 Jul', status: 'cancelled', items: [['textile', null, 5]], reason: 'Travelling that week' },
  ];

  const notifications = [
    { text: 'Murugan K will collect your pickup on Wed 7 Oct, 10:00 – 12:00.', at: '15:40', kind: 'assigned' },
    { text: 'Your pickup moved to Wed 7 Oct, 10:00 – 12:00.', at: '11:05', kind: 'rescheduled' },
    { text: 'Request RC-26-01482 was accepted.', at: '11:02', kind: 'accepted' },
  ];

  /* Collector — Tue 6 Oct */
  const collector = {
    name: 'Murugan K', first: 'Murugan', zone: 'Anna Nagar · Zone 8', vehicle: 'TN 09 BX 4471', date: 'Tue 6 Oct',
    counts: { today: 6, pending: 3, completed: 1, failed: 1, kg: 32.7 },
  };

  const pickups = [
    { id: 'RC-26-01471', customer: 'Lakshmi Stores', type: 'Shop', area: 'Anna Nagar West', address: '14, 3rd Main Road, Anna Nagar West',
      slot: '08:00 – 10:00', status: 'completed', items: [{ cat: 'cardboard', est: 25, act: 27.5 }, { cat: 'plastic', est: 6, act: 5.2 }],
      lat: 13.0878, lng: 80.2050, notes: '' },
    { id: 'RC-26-01474', customer: 'Karthik S', type: 'Household', area: 'Shenoy Nagar', address: '22, Ponni Colony, Shenoy Nagar',
      slot: '08:00 – 10:00', status: 'failed', failReason: 'Customer unavailable', items: [{ cat: 'paper', est: 10 }, { cat: 'metal', est: 3 }],
      lat: 13.0790, lng: 80.2235, notes: '' },
    { id: 'RC-26-01476', customer: 'Bright Minds School', type: 'Institution', area: 'Aminjikarai', address: '5, School Road, Aminjikarai, Chennai 600029',
      slot: '10:00 – 12:00', status: 'collection_started', items: [{ cat: 'paper', est: 40, act: 38.6 }, { cat: 'ewaste', est: 6, act: 7 }],
      lat: 13.0745, lng: 80.2240, contact: 'Mrs. Revathi (Admin office)', phone: '+91 9•••• ••530',
      notes: 'Old answer sheets in sacks behind the staff room. Report to the front office first.' },
    { id: 'RC-26-01479', customer: 'Meena Iyer', type: 'Household', area: 'Kilpauk', address: '7, Lake View Street, Kilpauk',
      slot: '12:00 – 14:00', status: 'accepted', items: [{ cat: 'glass', est: 5 }, { cat: 'textile', est: 4 }],
      lat: 13.0820, lng: 80.2420, notes: 'Gate code 2611' },
    { id: 'RC-26-01480', customer: 'TechNest Office', type: 'Office', area: 'Anna Nagar', address: '41, Shanthi Colony, Anna Nagar',
      slot: '14:00 – 16:00', status: 'accepted', items: [{ cat: 'ewaste', est: 12 }, { cat: 'batteries', est: 2 }],
      lat: 13.0905, lng: 80.2130, notes: 'Use the service lift' },
    { id: 'RC-26-01483', customer: 'Green Leaf Café', type: 'Business', area: 'Anna Nagar', address: '9, 2nd Avenue, Anna Nagar',
      slot: '16:00 – 18:00', status: 'assigned', items: [{ cat: 'cardboard', est: 15 }, { cat: 'plastic', est: 8 }],
      lat: 13.0860, lng: 80.2175, notes: '' },
  ];

  /* Admin */
  const admin = {
    name: 'Kavya S',
    kpis: [
      { id: 'customers',  label: 'Total customers',       value: '1,284',  note: '46 joined this month' },
      { id: 'collectors', label: 'Active collectors',     value: '23',     note: '3 on leave today' },
      { id: 'pending',    label: 'Pending requests',      value: '37',     note: '12 waiting over 24 h', alert: true },
      { id: 'today',      label: "Today's pickups",       value: '58',     note: '21 done, 4 failed' },
      { id: 'completed',  label: 'Completed collections', value: '9,412',  note: 'All time' },
      { id: 'failed',     label: 'Failed pickups',        value: '214',    note: '2.2% of all pickups' },
      { id: 'kg',         label: 'Total collected',       value: '48.2 t', note: '10.4 t in September' },
    ],
    categoryKg: [['paper', 3140], ['cardboard', 2610], ['plastic', 1980], ['metal', 920], ['glass', 760], ['ewaste', 410], ['textile', 380], ['other', 140], ['batteries', 95]],
    months: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    monthlyKg: [6120, 6890, 7410, 8350, 9120, 10435],
    completedFailed: [[1180, 34], [1305, 31], [1390, 29], [1522, 38], [1640, 36], [1781, 40]],
    byArea: [['Anna Nagar', 412], ['T. Nagar', 305], ['Velachery', 288], ['Adyar', 241], ['Mylapore', 198], ['Kilpauk', 164], ['Tambaram', 131]],
    customerActivity: { active: 742, newThisMonth: 46, repeat: '68%', households: 61, business: 39 },
    collectors: [
      { name: 'Fathima N',    zone: 'Adyar',      done: 131, failed: 1, kg: 1402, onTime: 98 },
      { name: 'Selvi R',      zone: 'T. Nagar',   done: 148, failed: 2, kg: 1610, onTime: 97 },
      { name: 'Murugan K',    zone: 'Anna Nagar', done: 162, failed: 3, kg: 1840, onTime: 96 },
      { name: 'Arun Prakash', zone: 'Velachery',  done: 139, failed: 6, kg: 1575, onTime: 91 },
      { name: 'Vignesh T',    zone: 'Tambaram',   done: 117, failed: 7, kg: 1290, onTime: 88 },
    ],
    requests: [
      { id: 'RC-26-01495', customer: 'Sri Vinayaga Traders', type: 'Business',    area: 'T. Nagar',         cats: ['cardboard', 'plastic'], qty: '60 kg',          pref: '8 Oct · 10–12', status: 'submitted',      collector: null },
      { id: 'RC-26-01494', customer: 'Anitha Joseph',        type: 'Household',   area: 'Velachery',        cats: ['paper', 'glass'],       qty: '14 kg',          pref: '8 Oct · 16–18', status: 'submitted',      collector: null },
      { id: 'RC-26-01493', customer: 'Ramco Office Park',    type: 'Office',      area: 'Guindy',           cats: ['ewaste'],               qty: '25 pcs',         pref: '9 Oct · 12–14', status: 'info_requested', collector: null },
      { id: 'RC-26-01492', customer: 'Harish V',             type: 'Household',   area: 'Adyar',            cats: ['metal'],                qty: '6 kg',           pref: '7 Oct · 08–10', status: 'accepted',       collector: null },
      { id: 'RC-26-01490', customer: "St. Mary's College",   type: 'Institution', area: 'Mylapore',         cats: ['paper', 'textile'],     qty: '120 kg',         pref: '7 Oct · 10–12', status: 'scheduled',      collector: null },
      { id: 'RC-26-01482', customer: 'Priya Raman',          type: 'Household',   area: 'Anna Nagar',       cats: ['paper', 'cardboard', 'plastic'], qty: '24 kg', pref: '7 Oct · 10–12', status: 'assigned',       collector: 'Murugan K' },
      { id: 'RC-26-01476', customer: 'Bright Minds School',  type: 'Institution', area: 'Aminjikarai',      cats: ['paper', 'ewaste'],      qty: '40 kg + 6 pcs',  pref: '6 Oct · 10–12', status: 'pickup_started', collector: 'Murugan K' },
      { id: 'RC-26-01474', customer: 'Karthik S',            type: 'Household',   area: 'Shenoy Nagar',     cats: ['paper', 'metal'],       qty: '13 kg',          pref: '6 Oct · 08–10', status: 'failed',         collector: 'Murugan K' },
      { id: 'RC-26-01471', customer: 'Lakshmi Stores',       type: 'Shop',        area: 'Anna Nagar West',  cats: ['cardboard', 'plastic'], qty: '31 kg',          pref: '6 Oct · 08–10', status: 'collected',      collector: 'Murugan K' },
      { id: 'RC-26-01468', customer: 'Deepa M',              type: 'Household',   area: 'Tambaram',         cats: ['glass'],                qty: '8 kg',           pref: '6 Oct · 14–16', status: 'cancelled',      collector: null },
    ],
    review: {
      id: 'RC-26-01495', customer: 'Sri Vinayaga Traders', type: 'Business', contact: 'Ganesh', phone: '+91 98••• ••410',
      address: '112, Usman Road, T. Nagar, Chennai 600017', submitted: 'Tue 6 Oct, 08:52',
      items: [{ cat: 'cardboard', est: 45 }, { cat: 'plastic', est: 15 }],
      pref: 'Thu 8 Oct', slot: '10:00 – 12:00', photos: 2,
      notes: 'Flattened boxes, bundled. Loading bay at the rear entrance — ask for Ganesh.',
      collectorOptions: [
        { name: 'Selvi R',      zone: 'T. Nagar',   load: 4, inZone: true },
        { name: 'Arun Prakash', zone: 'Velachery',  load: 5, inZone: false },
        { name: 'Murugan K',    zone: 'Anna Nagar', load: 6, inZone: false },
      ],
      log: [
        { at: '6 Oct, 08:52', text: 'Submitted by customer' },
        { at: '6 Oct, 08:52', text: 'Notification sent: request submitted' },
      ],
    },
  };

  const screens = [
    { id: 'c-dash', role: 'Customer', title: 'Dashboard', device: 'phone', refs: '§3, §18, §22',
      shows: [
        'Greeting with customer name and type (Household, Shop, Office…)',
        'Active pickup: request ID, status in plain words, date and time slot, assigned collector',
        'One clear action: New collection',
        'History summary: total requests, completed, cancelled, failed, total kg collected',
        'Kg collected per waste category',
        'Latest notifications',
        'Bottom navigation: Home, New, Requests, History, Profile',
      ],
      notes: 'Mobile-first (§27). Notifications and Active Pickup are reachable from here rather than as separate tabs.' },
    { id: 'c-new', role: 'Customer', title: 'New collection', device: 'phone', refs: '§5, §6, §17, §25',
      shows: [
        'Pick one or more waste categories (only active ones)',
        'What is accepted for each category, shown before submit',
        'Warnings for restricted material (e.g. batteries) and the not-accepted list',
        'Approximate quantity + unit per category',
        'Pickup address with an OpenStreetMap pin',
        'Preferred date + time slot, limited to operating days and hours',
        'Notes and optional photos',
        'Save draft / Submit request',
      ],
      notes: 'Validation rules (§25): category required, quantity > 0, date inside operating days, slot inside operating hours.' },
    { id: 'c-track', role: 'Customer', title: 'Track request', device: 'phone', refs: '§9, §13, §15, §16, §28',
      shows: [
        'Plain-language timeline: Submitted → Accepted → Scheduled → Collector assigned → Pickup started → Collected → Completed',
        'Scheduled pickup card: date, slot, address',
        'Collector name and vehicle; phone number masked',
        'Items with estimated quantity (actual quantity appears after pickup)',
        'Reschedule history: old slot, new slot, who, why',
        'Cancel request (before the cutoff, with reason)',
        'After collection: Confirm collection or Report an issue',
      ],
      notes: 'Customers only ever see their own requests (§26).' },
    { id: 'k-today', role: 'Collector', title: "Today's pickups", device: 'phone', refs: '§10, §19',
      shows: [
        "Counts: today's pickups, pending, completed, failed, kg collected",
        'Filters: date, status, waste category',
        'Route map with numbered stops (OpenStreetMap)',
        'Pickup list in slot order: customer, type, area, slot, categories, estimated qty, status',
        'New assignments that still need Accept',
      ],
      notes: 'Mobile-friendly, big tap targets — collectors use this on the move (§27).' },
    { id: 'k-pickup', role: 'Collector', title: 'Pickup in progress', device: 'phone', refs: '§11, §12, §14',
      shows: [
        'Status steps: Assigned → Accepted → On the way → Arrived → Collection started → Collected → Completed',
        'One primary button for the next step',
        'Customer, contact (masked), address, directions via OpenStreetMap',
        'Customer notes',
        'Record actual quantity + unit per category, next to the estimate',
        'Optional photo evidence',
        'Mark pickup failed with a reason',
      ],
      notes: 'Both estimated and actual quantities are kept (§12).' },
    { id: 'a-dash', role: 'Admin', title: 'Dashboard', device: 'desktop', refs: '§20',
      shows: [
        "KPIs: total customers, active collectors, pending requests, today's pickups, completed, failed, total collected",
        'Waste category distribution',
        'Collection volume by month',
        'Completed vs failed pickups',
        'Requests by location',
        'Collector performance',
        'Customer activity',
      ],
      notes: 'Desktop/tablet optimized. Charts would use a free library (Recharts) in the real build.' },
    { id: 'a-requests', role: 'Admin', title: 'Requests & review', device: 'desktop', refs: '§8, §9, §10, §21, §25',
      shows: [
        'Filters: status, waste type, area, date, collector, search by ID or customer',
        'Table: ID, customer, area, categories, est. qty, preferred slot, status, collector',
        'Review panel: customer, address, items, notes, photos',
        'Actions: Accept, Reject (with reason), Ask for more info, Cancel',
        'Schedule: date + slot, assign collector (shows zone and day load)',
        'Activity log for the request',
      ],
      notes: 'Scheduling outside operating days/hours is blocked (§25). Every action is written to the audit log (§26).' },
  ];

  const cat = (id) => categories.find((c) => c.id === id);
  const qty = (n, unit) => (Number.isInteger(n) ? n : n.toFixed(1)) + ' ' + unit;
  const kgFmt = (n) => n.toLocaleString('en-IN');

  return { categories, notAccepted, settings, requestStatus, pickupFlow, failReasons, complaintTypes,
    customer, activeRequest, history, notifications, collector, pickups, admin, screens, cat, qty, kgFmt };
})();
