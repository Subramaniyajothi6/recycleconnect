/* Design A "Sorted" — remaining screens: sign-in and registration, the rest of the customer and collector apps,
   and the admin management screens. Uses helpers exposed by sorted.js as RC.A. */
(function () {
  const $ = (id) => document.getElementById(id);
  const I = RC.icon, C = RC.cat, A = RC.A;
  const { pill, strip, legend, brand, tabbar, kTab, side } = A;
  const put = (id, html) => { const el = $(id); if (el) el.innerHTML = html; return el; };
  const top = (title, back, extra) => '<div class="app-top">' + (back ? '<a href="#' + back + '" class="icon-btn" aria-label="Back">' + I('back') + '</a>' : '') + '<span class="title">' + title + '</span>' + (extra || '') + '</div>';
  const items = (arr) => arr.map(([cat, v]) => ({ cat, est: v }));
  const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const toggle = (id, on, label, dis) => '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + ' aria-label="' + label + '"><span></span></label>';
  const pressGroup = (root, sel) => root.addEventListener('click', (e) => { const b = e.target.closest(sel); if (b && !b.disabled) b.parentElement.querySelectorAll(sel).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const multiPress = (root, sel) => root.addEventListener('click', (e) => { const b = e.target.closest(sel); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
  const adminTop = (title, sub, right) => '<div class="topline"><div><h1>' + title + '</h1>' + (sub ? '<div class="page-sub">' + sub + '</div>' : '') + '</div><span class="sp"></span>' + (right || '') + '</div>';
  const fsel = (k, v) => '<button class="fsel"><span>' + k + ':</span>' + v + I('down', 14) + '</button>';
  const searchBox = (ph) => '<div class="search">' + I('search', 16) + ph + '</div>';
  const shell = (cur, html) => '<div class="admin">' + side(cur) + '<div class="main">' + html + '</div></div>';

  /* =====================================================================
     SIGN IN AND REGISTRATION
     ===================================================================== */
  put('login', '<div class="screen-wrap"><div class="body">' +
    '<div class="auth-hero">' + brand + '<h1>Book a pickup for your recyclables</h1><p>Paper, plastic, metal, e-waste and more, collected from your door at a time you choose.</p>' +
      strip(items([['paper', 30], ['cardboard', 25], ['plastic', 19], ['metal', 9], ['glass', 7], ['ewaste', 4], ['textile', 4]])) + '</div>' +
    '<form class="auth-body" onsubmit="event.preventDefault()">' +
      '<h2 style="font-size:22px">Sign in</h2>' +
      '<div class="field"><label class="field-label" for="li-user">Mobile number or email</label><input class="input" id="li-user" value="98400 12345" autocomplete="username"></div>' +
      '<div class="field"><label class="field-label" for="li-pw">Password</label><div class="pw"><input class="input" id="li-pw" type="password" value="password12" autocomplete="current-password"><button type="button" id="li-show">Show</button></div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px"><label class="check" style="align-items:center"><input type="checkbox" checked> Keep me signed in</label><a href="#" style="color:var(--leaf-text);font-weight:600">Forgot password?</a></div>' +
      '<a href="#c-dash" class="btn btn-primary btn-block">Sign in</a>' +
      '<p class="muted" style="font-size:12.5px;text-align:center">Customers, collectors and admins all sign in here. You’ll see the screens for your role.</p>' +
      '<div class="divider">New to RecycleConnect?</div>' +
      '<div class="auth-links">' +
        '<a class="auth-link" href="#reg-customer"><span class="ico">' + I('home', 20) + '</span><span><b>Create a customer account</b><small>For homes, shops, offices and institutions</small></span>' + I('chev', 18) + '</a>' +
        '<a class="auth-link" href="#reg-collector"><span class="ico">' + I('truck', 20) + '</span><span><b>Register as a collector</b><small>Collect recyclables in your area</small></span>' + I('chev', 18) + '</a>' +
      '</div>' +
    '</form></div></div>');
  $('login').addEventListener('click', (e) => { if (e.target.id === 'li-show') { const f = $('li-pw'); const show = f.type === 'password'; f.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Hide' : 'Show'; } });

  put('reg-customer', '<div class="screen-wrap"><div class="body">' + top('Create account', 'login', '<span class="muted" style="font-size:13px">Customer</span>') +
    '<div class="reg-body"><form class="form" onsubmit="event.preventDefault()">' +
      '<div class="form-sec"><h2>About you</h2>' +
        '<div class="field"><label class="field-label" for="rc-name">Full name or business name</label><input class="input" id="rc-name" value="Priya Raman" autocomplete="name"></div>' +
        '<div class="field"><span class="field-label">I’m registering as</span><div class="opts" id="rc-type">' + ['Household', 'Shop', 'Office', 'Institution', 'Business'].map((t, i) => '<button type="button" class="opt" aria-pressed="' + (i === 0) + '">' + t + '</button>').join('') + '</div></div></div>' +
      '<div class="form-sec"><h2>Contact</h2>' +
        '<div class="field"><label class="field-label" for="rc-mob">Mobile number</label><input class="input" id="rc-mob" value="+91 98400 12345" inputmode="tel" autocomplete="tel"><span class="hint ok">' + I('check', 14) + 'Looks good</span></div>' +
        '<div class="field"><label class="field-label" for="rc-mail">Email</label><input class="input err" id="rc-mail" value="priya.raman@example" inputmode="email" autocomplete="email"><span class="hint err">' + I('alert', 14) + 'Enter a full email address, like name@example.com</span></div>' +
        '<div class="field"><span class="field-label">How should we contact you?</span><div class="opts" id="rc-contact"><button type="button" class="opt" aria-pressed="true">' + I('phone', 16) + 'Phone call</button><button type="button" class="opt" aria-pressed="false">' + I('message', 16) + 'Email</button><button type="button" class="opt" aria-pressed="false">' + I('bell', 16) + 'App only</button></div></div></div>' +
      '<div class="form-sec"><h2>Pickup address</h2>' +
        '<div class="field"><label class="field-label" for="rc-addr">House, building and street</label><input class="input" id="rc-addr" value="Flat 4B, Lotus Apartments, 2nd Avenue" autocomplete="address-line1"></div>' +
        '<div class="row2"><div class="field"><label class="field-label" for="rc-area">Area</label><input class="input" id="rc-area" value="Anna Nagar"></div><div class="field"><label class="field-label" for="rc-pin">PIN code</label><input class="input" id="rc-pin" value="600040" inputmode="numeric" autocomplete="postal-code"></div></div>' +
        '<div class="row2"><div class="field"><label class="field-label" for="rc-city">City</label><input class="input" id="rc-city" value="Chennai" autocomplete="address-level2"></div><div class="field"><label class="field-label" for="rc-dist">District</label><input class="input" id="rc-dist" value="Chennai"></div></div>' +
        '<div class="field"><label class="field-label" for="rc-state">State</label><select class="input" id="rc-state"><option selected>Tamil Nadu</option><option>Karnataka</option><option>Kerala</option><option>Andhra Pradesh</option></select></div>' +
        '<div class="addr-map" id="map-reg" role="img" aria-label="Map pin for the pickup address"></div><span class="hint" style="font-size:12.5px;color:var(--muted)">Drag the pin to your gate. You can add more addresses later.</span></div>' +
      '<div class="form-sec"><h2>Password</h2>' +
        '<div class="field"><label class="field-label" for="rc-pw">Create a password</label><div class="pw"><input class="input" id="rc-pw" type="password" value="greenbins26" autocomplete="new-password"><button type="button">Show</button></div><span class="hint">At least 8 characters</span></div>' +
        '<label class="check"><input type="checkbox" checked> <span>I agree to the terms and privacy policy. My phone number is shown only to the collector assigned to my pickup.</span></label></div>' +
      '<a href="#c-dash" class="btn btn-primary btn-block" style="margin-top:6px">Create account</a>' +
      '<p class="muted" style="font-size:13px;text-align:center">Already have an account? <a href="#login" style="color:var(--leaf-text);font-weight:600">Sign in</a></p>' +
    '</form></div></div></div>');
  pressGroup($('reg-customer'), '#rc-type .opt'); pressGroup($('reg-customer'), '#rc-contact .opt');
  A.initMap('map-reg', (m) => { m.setView([RC.customer.lat, RC.customer.lng], 16); L.marker([RC.customer.lat, RC.customer.lng], { draggable: true, icon: A.pinIcon() }).addTo(m); });

  const zones = ['Anna Nagar', 'T. Nagar', 'Velachery', 'Adyar', 'Mylapore', 'Kilpauk', 'Tambaram'];
  put('reg-collector', '<div class="screen-wrap"><div class="body">' + top('Become a collector', 'login') +
    '<div class="reg-body"><div class="note info" style="margin-bottom:16px">' + I('info', 18) + '<span>An admin checks every new collector. You’ll get a notification when your account is approved, usually within 2 working days.</span></div>' +
    '<form class="form" onsubmit="event.preventDefault()">' +
      '<div class="form-sec"><h2>Your details</h2>' +
        '<div class="field"><label class="field-label" for="rk-name">Full name</label><input class="input" id="rk-name" value="Dinesh Kumar" autocomplete="name"></div>' +
        '<div class="row2"><div class="field"><label class="field-label" for="rk-mob">Mobile</label><input class="input" id="rk-mob" value="+91 99401 55821" inputmode="tel"></div><div class="field"><label class="field-label" for="rk-mail">Email (optional)</label><input class="input" id="rk-mail" value="" placeholder="name@example.com" inputmode="email"></div></div></div>' +
      '<div class="form-sec"><h2>Vehicle</h2>' +
        '<div class="field"><span class="field-label">Vehicle type</span><div class="opts" id="rk-veh">' + ['Cargo tricycle', 'Three-wheeler', 'Mini truck'].map((t, i) => '<button type="button" class="opt" aria-pressed="' + (i === 1) + '">' + t + '</button>').join('') + '</div></div>' +
        '<div class="field"><label class="field-label" for="rk-reg">Registration number</label><input class="input" id="rk-reg" value="TN 22 AQ 7310"></div></div>' +
      '<div class="form-sec"><h2>Where and when you can work</h2>' +
        '<div class="field"><span class="field-label">Areas (pick one or more)</span><div class="opts" id="rk-zones">' + zones.map((z) => '<button type="button" class="opt" aria-pressed="' + (z === 'Velachery' || z === 'Adyar') + '">' + z + '</button>').join('') + '</div></div>' +
        '<div class="field"><span class="field-label">Working days</span><div class="daychips" id="rk-days">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => '<button type="button" aria-pressed="' + (d !== 'Wed') + '">' + d + '</button>').join('') + '</div><span class="hint">Pickups run Monday to Saturday, 08:00 – 18:00.</span></div></div>' +
      '<div class="form-sec"><h2>ID proof</h2>' +
        '<div class="upload"><span class="ico">' + I('file', 20) + '</span><span><b>Upload driving licence or a government photo ID</b><small>Photo or PDF, up to 5 MB. Only admins can see it.</small></span></div></div>' +
      '<div class="form-sec"><h2>Password</h2><div class="field"><label class="field-label" for="rk-pw">Create a password</label><div class="pw"><input class="input" id="rk-pw" type="password" value="collect2026" autocomplete="new-password"><button type="button">Show</button></div></div>' +
        '<label class="check"><input type="checkbox" checked> <span>I agree to the collector terms, including recording actual quantities honestly.</span></label></div>' +
      '<a href="#a-collectors" class="btn btn-primary btn-block" style="margin-top:6px">Send for approval</a>' +
    '</form></div></div></div>');
  multiPress($('reg-collector'), '#rk-zones .opt'); multiPress($('reg-collector'), '#rk-days button'); pressGroup($('reg-collector'), '#rk-veh .opt');

  /* =====================================================================
     CUSTOMER
     ===================================================================== */
  const myReqs = [
    { id: 'RC-26-01482', st: 'assigned', when: 'Wed 7 Oct, 10:00 – 12:00', it: [['paper', 12], ['cardboard', 8], ['plastic', 4]], note: 'Murugan K will collect', tab: 'active', to: 'c-track' },
    { id: 'RC-26-01488', st: 'draft', when: 'Not submitted yet', it: [['textile', 6], ['glass', 3]], note: 'Draft saved Mon 5 Oct', tab: 'draft', to: 'c-new' },
    { id: 'RC-26-01377', st: 'completed', when: 'Fri 18 Sep', it: [['paper', 14.2], ['cardboard', 7.2]], note: '21.4 kg collected', tab: 'past' },
    { id: 'RC-26-01290', st: 'completed', when: 'Sat 29 Aug', it: [['plastic', 6.1], ['metal', 3.7]], note: 'Complaint CMP-1042 in review', tab: 'past', to: 'c-complaint' },
    { id: 'RC-26-01211', st: 'failed', when: 'Wed 12 Aug', it: [['glass', 6]], note: 'Customer unavailable', tab: 'past' },
    { id: 'RC-26-01102', st: 'cancelled', when: 'Fri 24 Jul', it: [['textile', 5]], note: 'Cancelled by you: travelling that week', tab: 'past' },
    { id: 'RC-26-00987', st: 'completed', when: 'Thu 2 Jul', it: [['paper', 11.4], ['ewaste', 3]], note: '11.4 kg + 3 pcs collected', tab: 'past' },
  ];
  let reqTab = 'active';
  function cRequests() {
    const counts = { active: 1, draft: 1, past: 12 };
    const list = myReqs.filter((r) => r.tab === reqTab);
    put('c-requests', '<div class="screen-wrap"><div class="body">' + top('My requests', '', '<a class="icon-btn" href="#c-new" aria-label="New collection">' + I('plus') + '</a>') +
      '<div class="pad-t"><div class="seg" id="req-tabs">' + [['active', 'Active'], ['draft', 'Drafts'], ['past', 'Past']].map(([k, l]) => '<button type="button" data-tab="' + k + '" aria-pressed="' + (k === reqTab) + '">' + l + '<span class="n">' + counts[k] + '</span></button>').join('') + '</div></div>' +
      (reqTab === 'past' ? '<div class="search-m">' + I('search', 16) + 'Search by request ID or material</div>' : '') +
      '<div class="rcards" style="margin-top:14px">' + list.map((r) => { const its = items(r.it);
        return '<a class="rcard' + (r.st === 'draft' ? ' draft' : '') + '" href="#' + (r.to || 'c-requests') + '"><div class="r1"><span class="id">' + r.id + '</span>' + pill(r.st) + '</div><div class="when">' + r.when + '</div>' + strip(its) + legend(its) +
          '<div class="foot-note"><span>' + r.note + '</span>' + I('chev', 16) + '</div></a>'; }).join('') + '</div>' +
      (reqTab === 'past' ? '<p class="empty-hint">Showing 5 of 12 past requests</p>' : '') +
      (reqTab === 'draft' ? '<p class="empty-hint">Drafts are kept for 30 days. Open one to finish and submit it.</p>' : '') +
      '</div>' + tabbar('Requests') + '</div>');
  }
  $('c-requests').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { reqTab = b.dataset.tab; cRequests(); } });
  cRequests();

  const st = RC.customer.stats;
  const months = [['Apr', 22.1], ['May', 0], ['Jun', 31.6], ['Jul', 11.4], ['Aug', 9.8], ['Sep', 21.4]];
  const mMax = Math.max(...months.map((m) => m[1]));
  put('c-history', '<div class="screen-wrap"><div class="body">' + top('History', '', '<button class="icon-btn" aria-label="Filter">' + I('filter') + '</button>') +
    '<div class="hstats"><div class="big"><span><span class="lbl">Total collected</span><b>' + st.kg + '</b> <span>kg</span></span><span>since March 2026</span></div>' +
      '<div><b>' + st.total + '</b><span>Requests</span></div><div><b>' + st.completed + '</b><span>Completed</span></div><div><b>' + (st.cancelled + st.failed) + '</b><span>Cancelled or failed</span></div></div>' +
    '<div class="sec-h"><h2>By material</h2></div>' +
    '<div class="panel" style="margin:0 20px">' + strip(items(st.byCategory), 'est', 'thick') + '<div style="margin-top:10px">' + legend(items(st.byCategory)) + '</div></div>' +
    '<div class="sec-h"><h2>Kilograms per month</h2></div>' +
    '<div class="panel" style="margin:0 20px"><div class="mini-cols">' + months.map(([m, v]) => '<div><em>' + (v ? v : '–') + '</em><i style="height:' + (v / mMax * 80 + 2) + 'px"></i>' + m + '</div>').join('') + '</div></div>' +
    '<div class="sec-h"><h2>Completed pickups</h2><a href="#c-requests">All requests</a></div>' +
    '<div class="panel" style="margin:0 20px"><table class="htable"><thead><tr><th>Pickup</th><th>Estimated</th><th>Collected</th></tr></thead><tbody>' +
      [['RC-26-01377', '18 Sep, Paper, Cardboard', 21, 21.4], ['RC-26-01290', '29 Aug, Plastic, Metal', 9, 9.8], ['RC-26-01164', '6 Aug, Paper', 10, 9.6], ['RC-26-00987', '2 Jul, Paper, E-waste', '11 + 3 pcs', '11.4 + 3 pcs'], ['RC-26-00851', '11 Jun, Cardboard, Glass', 30, 31.6]]
        .map(([id, d, e, a]) => '<tr><td><b>' + id + '</b><small>' + d + '</small></td><td>' + e + (typeof e === 'number' ? ' kg' : '') + '</td><td><b>' + a + (typeof a === 'number' ? ' kg' : '') + '</b></td></tr>').join('') +
    '</tbody></table></div>' +
    '<div class="panel" style="margin:12px 20px 0;display:flex;gap:10px;align-items:center;font-size:13.5px">' + I('alert', 18) + '<span>1 failed pickup (12 Aug, customer unavailable) and 1 cancellation (24 Jul) are kept in your history.</span></div>' +
    '</div>' + tabbar('History') + '</div>');

  const notifs = [
    ['Today', [
      ['truck', 'Collector assigned', 'Murugan K will collect your pickup on Wed 7 Oct, 10:00 – 12:00.', '15:40', 'unread', 'c-track'],
      ['refresh', 'Pickup rescheduled', 'Moved from Tue 6 Oct, 16:00 – 18:00 to Wed 7 Oct, 10:00 – 12:00. No collector was free on Tuesday evening.', '11:05', 'unread warn', 'c-track'],
      ['cal', 'Pickup scheduled', 'RC-26-01482 is booked for Tue 6 Oct, 16:00 – 18:00.', '11:04', '', 'c-track'],
      ['check', 'Request accepted', 'We accepted RC-26-01482: paper, cardboard and plastic.', '11:02', '', 'c-track'],
      ['list', 'Request submitted', 'We received RC-26-01482 and will review it shortly.', '09:14', '', 'c-track']]],
    ['Earlier', [
      ['message', 'Complaint update', 'CMP-1042 (wrong quantity) is being reviewed by Kavya S. We’ll reply within 2 working days.', 'Mon 5 Oct', '', 'c-complaint'],
      ['bell', 'Pickup reminder', 'Your pickup is tomorrow, Fri 18 Sep, 10:00 – 12:00. Please keep the material ready near the gate.', 'Thu 17 Sep', ''],
      ['truck', 'Pickup started', 'Murugan K is on the way to your address.', 'Fri 18 Sep', ''],
      ['check', 'Pickup completed', '21.4 kg collected: paper 14.2 kg, cardboard 7.2 kg. Thank you!', 'Fri 18 Sep', ''],
      ['x', 'Pickup failed', 'RC-26-01211: the collector couldn’t reach you. Book again any time.', 'Wed 12 Aug', 'bad'],
      ['x', 'Request cancelled', 'You cancelled RC-26-01102. Reason: travelling that week.', 'Fri 24 Jul', '']]],
  ];
  put('c-notifs', '<div class="screen-wrap"><div class="body">' + top('Notifications', 'c-dash', '<button class="btn btn-ghost btn-sm">Mark all read</button>') +
    notifs.map(([g, list]) => '<div class="notif-group">' + g + '</div><div class="nlist">' + list.map(([ic, t, m, at, cls, to]) =>
      '<a class="nitem ' + cls + '" href="#' + (to || 'c-notifs') + '"><span class="ico">' + I(ic, 18) + '</span><span><b>' + t + (cls.includes('unread') ? '<i class="udot" aria-label="unread"></i>' : '') + '</b><span>' + m + '</span></span><time>' + at + '</time></a>').join('') + '</div>').join('') +
    '<p class="empty-hint" style="margin-top:14px">Notifications are shown in the app and sent by email if you turn it on in your profile.</p>' +
    '</div>' + tabbar('Home') + '</div>');

  const cu = RC.customer;
  put('c-profile', '<div class="screen-wrap"><div class="body">' + top('Profile', '', '<a class="icon-btn" href="#" aria-label="Edit profile">' + I('gear') + '</a>') +
    '<div class="prof-head"><span class="av">PR</span><div><h2>' + cu.name + '</h2><p>Customer since March 2026</p><span class="pill">' + cu.type + '</span></div></div>' +
    '<div class="sec-h"><h2>Your details</h2><a href="#">Edit</a></div>' +
    '<div class="kvlist">' +
      '<div class="kvrow">' + I('phone', 18) + '<span>' + cu.mobile + '<small>Mobile, preferred contact</small></span><span class="pill tone-done">Verified</span></div>' +
      '<div class="kvrow">' + I('message', 18) + '<span>' + cu.email + '<small>Email</small></span><span></span></div>' +
      '<div class="kvrow">' + I('pin', 18) + '<span>' + cu.city + ', ' + cu.district + ' district, ' + cu.state + '<small>City, district, state</small></span><span></span></div></div>' +
    '<div class="sec-h"><h2>Pickup addresses</h2><a href="#">Add address</a></div>' +
    '<div class="panel" style="margin:0 20px"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>Home</b> <span class="pill tone-active" style="margin-left:6px">Default</span><div class="muted" style="font-size:14px;margin-top:4px">' + cu.address + ', Chennai ' + cu.pin + '</div></div></div><div class="addr-map" id="map-profile" role="img" aria-label="Map of your home address"></div></div>' +
    '<div class="sec-h"><h2>Notifications</h2></div>' +
    '<div class="kvlist">' +
      '<div class="kvrow">' + I('bell', 18) + '<span>In the app<small>Always on</small></span>' + toggle('pf-app', true, 'In-app notifications', true) + '</div>' +
      '<div class="kvrow">' + I('message', 18) + '<span>Email<small>Pickup updates and complaint replies</small></span>' + toggle('pf-mail', true, 'Email notifications') + '</div>' +
      '<div class="kvrow">' + I('clock', 18) + '<span>Reminder the evening before<small>At 6:00 pm</small></span>' + toggle('pf-rem', true, 'Pickup reminder') + '</div></div>' +
    '<div class="sec-h"><h2>App</h2></div>' +
    '<div class="kvlist">' +
      '<div class="kvrow">' + I('tag', 18) + '<span>Language</span><div class="seg" style="padding:3px;width:150px" id="pf-lang"><button type="button" aria-pressed="true" style="height:30px">English</button><button type="button" aria-pressed="false" style="height:30px">தமிழ்</button></div></div>' +
      '<a class="kvrow" href="#c-complaint">' + I('alert', 18) + '<span>Report an issue<small>Complaints about a pickup</small></span>' + I('chev', 18, 'chev') + '</a>' +
      '<a class="kvrow" href="#">' + I('shield', 18) + '<span>Privacy<small>Who can see your phone number and address</small></span>' + I('chev', 18, 'chev') + '</a></div>' +
    '<div class="signout"><a href="#login" class="btn btn-danger btn-block">Sign out</a></div>' +
    '</div>' + tabbar('Profile') + '</div>');
  pressGroup($('c-profile'), '#pf-lang button');
  A.initMap('map-profile', (m) => { m.setView([cu.lat, cu.lng], 15); L.marker([cu.lat, cu.lng], { icon: A.homeIcon() }).addTo(m); });

  put('c-complaint', '<div class="screen-wrap"><div class="body">' + top('Report an issue', 'c-profile') +
    '<div class="step" style="margin-top:6px"><div class="step-h"><span class="n">1</span><h2>Which pickup?</h2></div><div class="cmp-pick">' +
      [['RC-26-01290', 'Sat 29 Aug, collected by Murugan K', [['plastic', 6.1], ['metal', 3.7]], true], ['RC-26-01377', 'Fri 18 Sep, collected by Murugan K', [['paper', 14.2], ['cardboard', 7.2]], false]]
        .map(([id, d, it, on]) => '<label class="cmp-req"><input type="radio" name="cmpreq"' + (on ? ' checked' : '') + '><span><b>' + id + '</b><small>' + d + '</small>' + strip(items(it)) + legend(items(it)) + '</span></label>').join('') + '</div></div>' +
    '<div class="step"><div class="step-h"><span class="n">2</span><h2>What went wrong?</h2></div><div class="opts" id="cmp-type">' +
      RC.complaintTypes.map((t, i) => '<button type="button" class="opt" aria-pressed="' + (i === 1) + '">' + t + '</button>').join('') + '</div></div>' +
    '<div class="step"><div class="step-h"><span class="n">3</span><h2>Tell us more</h2></div>' +
      '<textarea class="input" aria-label="Describe the issue">The collector recorded 3.7 kg of metal, but I handed over the old pressure cooker and a box of cans, closer to 5 kg.</textarea>' +
      '<div class="photos"><div class="photo" role="img" aria-label="Photo of the metal items"></div><button type="button" class="photo add" aria-label="Add photo">' + I('camera', 22) + '</button></div>' +
      '<a href="#c-complaint" class="btn btn-primary btn-block" style="margin-top:14px">Send complaint</a>' +
      '<p class="muted" style="font-size:12.5px;text-align:center;margin-top:8px">The admin team replies within 2 working days.</p></div>' +
    '<div class="sec-h"><h2>Your complaints</h2></div>' +
    '<div class="cmp-list">' +
      '<div class="cmp"><div class="r1"><span class="muted" style="font-size:13px">CMP-1042, RC-26-01290</span><span class="pill tone-warn">In review</span></div><h3>Wrong quantity recorded</h3>' +
        '<ul class="mini-tl"><li class="done"><i></i>Sent Sun 4 Oct, 19:20</li><li class="done"><i></i>Kavya S is reviewing it, Mon 5 Oct</li><li><i></i>Reply and resolution</li></ul></div>' +
      '<div class="cmp"><div class="r1"><span class="muted" style="font-size:13px">CMP-0981, RC-26-01211</span><span class="pill tone-done">Resolved</span></div><h3>Pickup delayed</h3>' +
        '<div class="reply"><b>Reply from RecycleConnect, 14 Aug</b>Sorry about the delay. The collector’s vehicle broke down. We’ve noted it and offered a priority slot for your next pickup.</div></div>' +
    '</div></div>' + tabbar('Profile') + '</div>');
  pressGroup($('c-complaint'), '#cmp-type .opt');

  /* =====================================================================
     COLLECTOR
     ===================================================================== */
  const kCard = (p, acts) => { const its = p.items.map((x) => ({ cat: x.cat, est: x.est }));
    return '<article class="stop s-' + p.status + '"><span class="num">' + p.n + '</span><div>' +
      '<div class="r1"><div><div class="slot-t">' + p.slot + '</div><h3>' + p.customer + '</h3><div class="area">' + p.type + ', ' + p.area + '</div></div>' + (p.label ? '<span class="pill tone-' + p.tone + '">' + p.label + '</span>' : '') + '</div>' +
      strip(its) + legend(its) + (acts || '') + '</div></article>'; };
  const assigned = {
    need: [
      { n: I('bell', 15), customer: 'Green Leaf Café', type: 'Business', area: 'Anna Nagar', slot: 'Today, 16:00 – 18:00', status: 'assigned', items: [{ cat: 'cardboard', est: 15 }, { cat: 'plastic', est: 8 }], label: 'New', tone: 'warn' },
      { n: I('bell', 15), customer: 'Sundar Residents’ Association', type: 'Institution', area: 'Anna Nagar East', slot: 'Thu 8 Oct, 08:00 – 10:00', status: 'assigned', items: [{ cat: 'paper', est: 25 }, { cat: 'cardboard', est: 30 }], label: 'New', tone: 'warn' }],
    wed: [
      { n: 1, customer: 'Priya Raman', type: 'Household', area: 'Anna Nagar', slot: '10:00 – 12:00', status: 'accepted', items: [{ cat: 'paper', est: 12 }, { cat: 'cardboard', est: 8 }, { cat: 'plastic', est: 4 }], label: 'Accepted', tone: 'info' },
      { n: 2, customer: 'Ravi Kumar', type: 'Household', area: 'Anna Nagar', slot: '12:00 – 14:00', status: 'accepted', items: [{ cat: 'metal', est: 5 }], label: 'Accepted', tone: 'info' },
      { n: 3, customer: 'City Pharmacy', type: 'Shop', area: 'Kilpauk', slot: '14:00 – 16:00', status: 'accepted', items: [{ cat: 'cardboard', est: 18 }, { cat: 'plastic', est: 4 }], label: 'Accepted', tone: 'info' }],
  };
  put('k-assigned', '<div class="screen-wrap"><div class="body">' +
    '<div class="k-head slim"><div class="top"><small>' + RC.collector.zone + '</small></div><h1>Assigned pickups</h1></div>' +
    '<div class="day-tabs" id="k-days" role="group" aria-label="Day">' + [['Today', '6 Oct', 3], ['Wed', '7 Oct', 3], ['Thu', '8 Oct', 5], ['Fri', '9 Oct', 2], ['Sat', '10 Oct', 4]].map(([d, n, c], i) => '<button type="button" aria-pressed="' + (i === 1) + '"><small>' + d + '</small><b>' + n + '</b><span class="cnt">' + c + ' pickups</span></button>').join('') + '</div>' +
    '<div class="sec-h"><h2>Needs your answer</h2></div>' +
    '<div class="need"><h2>2 new assignments</h2><p>Accept them so the customers know you’re coming. If you can’t take one, ask the office to reassign it.</p>' +
      assigned.need.map((p) => kCard(p, '<div class="acts"><button class="btn btn-primary btn-sm">Accept pickup</button><button class="btn btn-ghost btn-sm">Ask to reassign</button></div>')).join('') + '</div>' +
    '<div class="sec-h"><h2>Wed 7 Oct</h2><span class="muted" style="font-size:13px">3 stops, about 51 kg</span></div>' +
    '<div class="stops">' + assigned.wed.map((p) => kCard(p)).join('') + '</div>' +
    '</div>' + kTab('Assigned') + '</div>');
  pressGroup($('k-assigned'), '#k-days button');

  const kHist = [
    ['Tue 6 Oct', '32.7 kg', [
      ['Lakshmi Stores', 'RC-26-01471, 08:00 – 10:00', [['cardboard', 27.5], ['plastic', 5.2]], '32.7 kg', 'est. 31 kg'],
      ['Karthik S', 'RC-26-01474, 08:00 – 10:00', [['paper', 10], ['metal', 3]], 'Failed', '', 'Customer unavailable']]],
    ['Mon 5 Oct', '58.4 kg', [
      ['Anna Nagar Tower RWA', 'RC-26-01462, 08:00 – 10:00', [['paper', 31.2], ['cardboard', 12.4]], '43.6 kg', 'est. 40 kg'],
      ['Meera Krishnan', 'RC-26-01459, 12:00 – 14:00', [['plastic', 4.8], ['glass', 6.4]], '11.2 kg', 'est. 12 kg'],
      ['Arul Electronics', 'RC-26-01457, 14:00 – 16:00', [['ewaste', 9], ['batteries', 3.6]], '3.6 kg + 9 pcs', 'est. 4 kg + 8 pcs']]],
    ['Sat 3 Oct', '41.0 kg', [
      ['Saravana Bhavan staff canteen', 'RC-26-01441, 10:00 – 12:00', [['cardboard', 22.5], ['plastic', 9.1], ['metal', 9.4]], '41.0 kg', 'est. 38 kg']]],
  ];
  put('k-history', '<div class="screen-wrap"><div class="body">' +
    '<div class="k-head slim"><div class="top"><small>' + RC.collector.name + '</small></div><h1>History</h1></div>' +
    '<div class="filters" role="group" aria-label="Filters"><button class="fchip" aria-pressed="true">' + I('cal', 15) + 'October</button><button class="fchip">All statuses</button><button class="fchip">Completed</button><button class="fchip">Failed</button><button class="fchip">' + I('filter', 15) + 'Category</button></div>' +
    '<div class="kstats3"><div><b>18</b><span>Completed</span></div><div><b>2</b><span>Failed</span></div><div><b>214.6</b><span>kg collected</span></div><div><b>95%</b><span>On time</span></div></div>' +
    kHist.map(([d, tot, rows]) => '<div class="hist-day"><span>' + d + '</span><span>' + tot + '</span></div><div class="list">' + rows.map(([n, sub, it, kg, est, why]) =>
      '<div class="hrow"><span><b>' + n + '</b><small>' + sub + '</small></span><span class="kg">' + kg + '<small>' + est + '</small></span>' + strip(items(it)) + (why ? '<span class="why">Failed: ' + why + '</span>' : '') + '</div>').join('') + '</div>').join('') +
    '<p class="empty-hint" style="margin-top:14px">Showing 3 of 20 pickup days in October</p>' +
    '</div>' + kTab('History') + '</div>');

  put('k-profile', '<div class="screen-wrap"><div class="body">' + top('Profile', '') +
    '<div class="prof-head"><span class="av">MK</span><div><h2>Murugan K</h2><p>Collector COL-008, since Jan 2025</p><span class="pill">' + RC.collector.zone + '</span></div></div>' +
    '<div class="kvlist" style="margin-top:14px"><div class="kvrow">' + I('check', 18) + '<span><b>Available for pickups</b><small>Turn off when you’re on leave. The office won’t assign new pickups.</small></span>' + toggle('kp-avail', true, 'Available for pickups') + '</div></div>' +
    '<div class="sec-h"><h2>September</h2></div>' +
    '<div class="kstats3" style="margin-top:0"><div><b>162</b><span>Completed</span></div><div><b>3</b><span>Failed</span></div><div><b>1,840</b><span>kg</span></div><div><b>96%</b><span>On time</span></div></div>' +
    '<div class="sec-h"><h2>Work details</h2></div>' +
    '<div class="kvlist">' +
      '<div class="kvrow">' + I('truck', 18) + '<span>' + RC.collector.vehicle + '<small>Three-wheeler</small></span><span></span></div>' +
      '<div class="kvrow">' + I('pin', 18) + '<span>Anna Nagar, Shenoy Nagar, Kilpauk<small>Areas you cover</small></span><span></span></div>' +
      '<div class="kvrow">' + I('cal', 18) + '<span>Mon – Sat, 08:00 – 18:00<small>Working days</small></span><span></span></div>' +
      '<div class="kvrow">' + I('phone', 18) + '<span>+91 94441 20218<small>Shown to customers partly hidden</small></span><span></span></div></div>' +
    '<div class="sec-h"><h2>App</h2></div>' +
    '<div class="kvlist"><div class="kvrow">' + I('tag', 18) + '<span>Language</span><div class="seg" style="padding:3px;width:150px" id="kp-lang"><button type="button" aria-pressed="false" style="height:30px">English</button><button type="button" aria-pressed="true" style="height:30px">தமிழ்</button></div></div>' +
      '<div class="kvrow">' + I('refresh', 18) + '<span>Save updates when offline<small>Sends step updates and weights when signal returns</small></span>' + toggle('kp-off', true, 'Offline updates') + '</div></div>' +
    '<div class="signout"><a href="#login" class="btn btn-danger btn-block">Sign out</a></div>' +
    '</div>' + kTab('Profile') + '</div>');
  pressGroup($('k-profile'), '#kp-lang button');

  /* =====================================================================
     ADMIN
     ===================================================================== */
  const customers = [
    ['Priya Raman', 'CU-01184', 'Household', 'Anna Nagar', '+91 98••• ••345', 14, 186.4, '18 Sep', 'active'],
    ['Sri Vinayaga Traders', 'CU-01271', 'Business', 'T. Nagar', '+91 98••• ••410', 9, 512.0, '21 Sep', 'active'],
    ['Bright Minds School', 'CU-00422', 'Institution', 'Aminjikarai', '+91 9•••• ••530', 22, 1248.6, '6 Oct', 'active'],
    ['Lakshmi Stores', 'CU-00618', 'Shop', 'Anna Nagar West', '+91 97••• ••102', 31, 902.3, '6 Oct', 'active'],
    ['Ramco Office Park', 'CU-01033', 'Office', 'Guindy', '+91 99••• ••771', 7, 214.0, '15 Sep', 'active'],
    ['Karthik S', 'CU-01242', 'Household', 'Shenoy Nagar', '+91 90••• ••518', 3, 18.2, '2 Sep', 'active'],
    ['St. Mary’s College', 'CU-00211', 'Institution', 'Mylapore', '+91 94••• ••200', 18, 2120.4, '24 Sep', 'active'],
    ['Deepa M', 'CU-01290', 'Household', 'Tambaram', '+91 88••• ••064', 2, 6.5, '30 Aug', 'inactive'],
    ['Quick Mart Express', 'CU-00930', 'Shop', 'Velachery', '+91 96••• ••881', 4, 52.0, '11 Jun', 'blocked'],
  ];
  const stPill = { active: '<span class="pill tone-done">Active</span>', inactive: '<span class="pill tone-muted">Inactive</span>', blocked: '<span class="pill tone-bad">Blocked</span>' };
  put('a-customers', shell('Customers',
    adminTop('Customers', '1,284 registered, 742 active in the last 30 days', searchBox('Search name, mobile or customer ID') + '<button class="btn btn-ghost btn-sm">' + I('download', 16) + 'Export CSV</button><button class="btn btn-primary btn-sm">' + I('plus', 16) + 'Add customer</button>') +
    '<div class="sumchips" id="cu-types">' + [['All', '1,284'], ['Household', '784'], ['Shop', '211'], ['Office', '142'], ['Institution', '63'], ['Business', '84']].map(([l, n], i) => '<button type="button" class="sumchip" aria-pressed="' + (i === 0) + '"><b>' + n + '</b>' + l + '</button>').join('') + '</div>' +
    '<div class="toolbar">' + fsel('Area', 'All') + fsel('Status', 'Active and inactive') + fsel('Last pickup', 'Any time') + fsel('Sort', 'Most recent') + '</div>' +
    '<div class="tcard"><table class="tbl"><thead><tr><th>Customer</th><th>Type</th><th>Area</th><th>Mobile</th><th class="num">Requests</th><th class="num">Collected</th><th>Last pickup</th><th>Status</th><th></th></tr></thead><tbody>' +
      customers.map(([n, id, t, a, ph, r, kg, last, s]) => '<tr><td><div class="who-c"><span class="avatar" style="background:var(--c-' + ['plastic', 'paper', 'cardboard', 'glass', 'ewaste', 'metal'][n.length % 6] + ')">' + initials(n) + '</span><span><b>' + n + '</b><small>' + id + '</small></span></div></td><td>' + t + '</td><td>' + a + '</td><td class="nowrap">' + ph + '</td><td class="num">' + r + '</td><td class="num">' + RC.kgFmt(kg) + ' kg</td><td class="nowrap">' + last + '</td><td>' + stPill[s] + '</td><td><div class="rowact"><button class="lnk">View</button>' + (s === 'blocked' ? '<button class="lnk">Unblock</button>' : '<button class="lnk bad">Deactivate</button>') + '</div></td></tr>').join('') +
    '</tbody></table><div class="pager"><span>Showing 1–9 of 1,284</span><span class="pg"><button aria-label="Previous page">‹</button><button aria-current="page">1</button><button>2</button><button>3</button><button aria-label="Next page">›</button></span></div></div>' +
    '<p class="lock">' + I('shield', 16) + 'Mobile numbers are partly hidden in lists. Opening a customer record is written to the audit log.</p>'));
  pressGroup($('a-customers'), '#cu-types .sumchip');

  const colls = [
    ['Murugan K', 'Anna Nagar, Zone 8', 'TN 09 BX 4471', 'On route', 'active', 6, 162, 96],
    ['Selvi R', 'T. Nagar, Zone 3', 'TN 07 CK 2290', 'On route', 'active', 7, 148, 97],
    ['Fathima N', 'Adyar, Zone 5', 'TN 06 AZ 1184', 'Available', 'info', 2, 131, 98],
    ['Arun Prakash', 'Velachery, Zone 6', 'TN 22 BD 6620', 'On route', 'active', 5, 139, 91],
    ['Vignesh T', 'Tambaram, Zone 9', 'TN 11 MB 0903', 'On leave', 'muted', 0, 117, 88],
    ['Revathi S', 'Mylapore, Zone 4', 'TN 07 DL 5512', 'Available', 'info', 3, 96, 94],
  ];
  put('a-collectors', shell('Collectors',
    adminTop('Collectors', '23 active, 3 on leave today', searchBox('Search name, zone or vehicle') + '<button class="btn btn-primary btn-sm">' + I('plus', 16) + 'Add collector</button>') +
    '<div class="secttl">Waiting for approval <span class="pill tone-warn">2</span></div>' +
    '<div style="display:grid;gap:10px">' +
      [['Dinesh Kumar', 'Three-wheeler TN 22 AQ 7310. Areas: Velachery, Adyar. ID proof uploaded.', 'Registered today, 08:12'], ['Mohammed Irfan', 'Cargo tricycle. Area: Kilpauk. ID proof uploaded.', 'Registered Mon 5 Oct']]
        .map(([n, d, w]) => '<div class="approve"><span class="avatar">' + initials(n) + '</span><span><b>' + n + '</b><small>' + d + '</small><small>' + w + '</small></span><span class="acts"><button class="btn btn-ghost btn-sm">View ID proof</button><button class="btn btn-danger btn-sm">Reject</button><button class="btn btn-primary btn-sm">Approve</button></span></div>').join('') + '</div>' +
    '<div class="secttl">All collectors</div>' +
    '<div class="toolbar" style="margin-top:0">' + fsel('Zone', 'All') + fsel('Status', 'All') + fsel('Sort', 'Today’s load') + '</div>' +
    '<div class="cgrid">' + colls.map(([n, z, v, s, tone, load, done, ot]) => '<article class="ccard' + (tone === 'muted' ? ' off' : '') + '"><div class="top"><span class="avatar">' + initials(n) + '</span><span><h3>' + n + '</h3><small>' + z + '</small><small>' + v + '</small></span><span class="pill tone-' + tone + '">' + s + '</span></div>' +
      '<div class="loadbar"><span>Today: ' + load + ' of 8 pickups</span><span class="t"><i style="width:' + (load / 8 * 100) + '%"></i></span></div>' +
      '<div class="stats"><div><b>' + done + '</b><span>Done in Sep</span></div><div><b>' + ot + '%</b><span>On time</span></div><div><b>' + (tone === 'muted' ? '–' : load) + '</b><span>Today</span></div></div>' +
      '<div class="rowact" style="justify-content:flex-start"><button class="lnk">View schedule</button><button class="lnk">Edit</button>' + (tone === 'muted' ? '' : '<button class="lnk bad">Deactivate</button>') + '</div></article>').join('') + '</div>'));

  const catRows = [
    ['plastic', 'Bottles, containers, carry bags, rinsed and dry', true, 412],
    ['paper', 'Newspaper, books, office paper, magazines', true, 538],
    ['cardboard', 'Boxes and cartons, flattened', true, 497],
    ['metal', 'Cans, utensils, small scrap', true, 186],
    ['glass', 'Bottles and jars, unbroken', true, 133],
    ['ewaste', 'Phones, chargers, cables, small appliances', true, 94],
    ['batteries', 'Household dry cells and phone batteries only', true, 41],
    ['textile', 'Clothes, linen, fabric offcuts, clean and dry', true, 72],
    ['other', 'Described by the customer in notes', false, 0],
  ];
  put('a-categories', shell('Waste categories',
    adminTop('Waste categories', 'What customers can book, and what they see before they submit', '<button class="btn btn-primary btn-sm">' + I('plus', 16) + 'Add category</button>') +
    '<div class="two wide-right">' +
      '<div class="tcard"><table class="tbl cattbl"><thead><tr><th>Category</th><th>Unit</th><th class="num">Requests, 30 days</th><th>Shown to customers</th><th></th></tr></thead><tbody>' +
        catRows.map(([id, acc, on, n]) => { const c = C(id); return '<tr class="' + (on ? '' : 'off') + (id === 'batteries' ? ' sel' : '') + '"><td><div class="catname"><span class="bin-ic" style="--c:var(--c-' + id + ')">' + ({ ewaste: 'EW', other: 'OT', batteries: 'BT', cardboard: 'CB', plastic: 'PL', paper: 'PA', metal: 'MT', glass: 'GL', textile: 'TX' })[id] + '</span><span><b>' + c.name + '</b><small>' + acc + '</small></span></div></td><td>' + c.unit + '</td><td class="num">' + n + '</td><td>' + toggle('cat-' + id, on, 'Show ' + c.name + ' to customers') + '</td><td><div class="rowact"><button class="lnk">Edit</button></div></td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<aside class="review" aria-label="Edit category"><div class="rh"><div class="r1"><h2>Edit: Batteries</h2><span class="pill tone-done">Active</span></div><small>Changes apply to new requests only</small></div>' +
        '<div class="rs"><div class="form">' +
          '<div class="field"><label class="field-label" for="ce-name">Name</label><input class="input" id="ce-name" value="Batteries" style="height:40px"></div>' +
          '<div class="row2"><div class="field"><label class="field-label" for="ce-unit">Unit</label><select class="input" id="ce-unit" style="height:40px"><option selected>kg</option><option>pcs</option></select></div><div class="field"><label class="field-label" for="ce-col">Colour</label><div style="display:flex;gap:6px;align-items:center;height:40px">' + ['batteries', 'plastic', 'ewaste', 'metal'].map((c, i) => '<span style="width:26px;height:26px;border-radius:8px;background:var(--c-' + c + ');' + (i === 0 ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ink)' : '') + '"></span>').join('') + '</div></div></div>' +
          '<div class="field"><label class="field-label" for="ce-acc">What we accept</label><input class="input" id="ce-acc" value="Household dry cells and phone batteries only" style="height:40px"></div>' +
          '<div class="field"><label class="field-label" for="ce-warn">Warning shown before submit</label><textarea class="input" id="ce-warn" style="height:76px">Vehicle (lead-acid) batteries are not accepted. Tape the ends of lithium batteries before handing them over.</textarea><span class="hint">Keep it to what the customer should do. Don’t add handling instructions beyond pickup.</span></div>' +
          '<div class="set-row"><span>Show to customers</span>' + toggle('ce-on', true, 'Show Batteries to customers') + '</div>' +
          '<button class="btn btn-primary btn-block" style="height:44px">Save category</button></div></div>' +
        '<div class="rs" style="border-bottom:0"><h3>Not accepted (shown on every booking)</h3><div class="chiplist">' + RC.notAccepted.map((x) => '<span class="rchip">' + x + '<button type="button" aria-label="Remove ' + x + '">' + I('x', 12) + '</button></span>').join('') + '</div>' +
          '<div class="addrow"><input class="input" placeholder="Add an item that can’t be collected" aria-label="New item that can’t be collected"><button class="btn btn-ghost btn-sm">Add</button></div></div>' +
      '</aside></div>'));

  const board = [
    { n: 'Selvi R', z: 'T. Nagar', load: 4, slots: [['RC-26-01499', 'Kumar Textiles', 'textile', '35 kg'], ['RC-26-01490', 'St. Mary’s College', 'paper', '120 kg'], 'drop', ['RC-26-01501', 'Hotel Annapoorna', 'cardboard', '40 kg'], null] },
    { n: 'Murugan K', z: 'Anna Nagar', load: 3, slots: [null, ['RC-26-01482', 'Priya Raman', 'paper', '24 kg', true], ['RC-26-01489', 'Ravi Kumar', 'metal', '5 kg'], ['RC-26-01491', 'City Pharmacy', 'cardboard', '22 kg'], null] },
    { n: 'Fathima N', z: 'Adyar', load: 2, slots: [null, ['RC-26-01496', 'Besant Flats RWA', 'paper', '45 kg'], null, null, ['RC-26-01500', 'Adyar Bakery', 'cardboard', '18 kg']] },
    { n: 'Arun Prakash', z: 'Velachery', load: 3, slots: [['RC-26-01502', 'Phoenix Kiosk 14', 'plastic', '12 kg'], null, ['RC-26-01498', 'Anitha Joseph', 'glass', '14 kg'], null, ['RC-26-01504', 'Vels Hostel', 'textile', '30 kg']] },
    { n: 'Vignesh T', z: 'Tambaram', leave: true, slots: [] },
  ];
  put('a-schedule', shell('Scheduling',
    adminTop('Scheduling', 'Book accepted requests into slots and balance collectors’ days', '<div class="datebar"><button class="icon-btn" aria-label="Previous day">' + I('back', 18) + '</button><span class="cur">Wed 7 Oct 2026</span><button class="icon-btn" aria-label="Next day">' + I('chev', 18) + '</button></div><div class="seg" style="width:170px;padding:3px" id="sch-view"><button type="button" aria-pressed="true" style="height:32px">Day</button><button type="button" aria-pressed="false" style="height:32px">Week</button></div>') +
    '<div class="note info" style="margin-top:16px">' + I('info', 18) + '<span>Slots outside Mon – Sat, 08:00 – 18:00 can’t be booked. Each collector can take up to 8 pickups a day. Sun 11 Oct is closed.</span></div>' +
    '<div class="two" style="grid-template-columns:minmax(0,1fr) 300px">' +
      '<div class="board"><table><thead><tr><th>Collector</th>' + RC.settings.slots.map((s) => '<th>' + s + '</th>').join('') + '</tr></thead><tbody>' +
        board.map((r) => '<tr class="' + (r.leave ? 'leave' : '') + '"><td><div class="coll"><b>' + r.n + '</b><small>' + r.z + (r.leave ? ', on leave' : ', ' + r.load + ' of 8') + '</small>' + (r.leave ? '' : '<div class="t"><i style="width:' + (r.load / 8 * 100) + '%"></i></div>') + '</div></td>' +
          (r.leave ? '<td colspan="5" style="color:var(--muted);font-size:13px;vertical-align:middle;padding-left:14px">On leave today. No pickups can be assigned.</td>' :
          r.slots.map((s) => '<td>' + (s === 'drop' ? '<div class="slot-free drop">Drop RC-26-01503 here</div>' : s ? '<span class="slotchip' + (s[4] ? ' sel' : '') + '" style="--c:var(--c-' + s[2] + ')"><b>' + s[1] + '</b><small>' + s[0] + ', ' + s[3] + '</small></span>' : '<div class="slot-free">Free</div>') + '</td>').join('')) + '</tr>').join('') +
      '</tbody></table></div>' +
      '<aside><div class="secttl" style="margin-top:0">Waiting for a slot <span class="pill tone-warn">3</span></div><div class="waitlist">' +
        [['RC-26-01503', 'Lakshmi Iyer', 'Mylapore', [['paper', 9]], 'Wed 7 Oct, 12:00 – 14:00', 'Selvi R, 12:00 – 14:00', true], ['RC-26-01492', 'Harish V', 'Adyar', [['metal', 6]], 'Wed 7 Oct, 08:00 – 10:00', 'Fathima N, 08:00 – 10:00'], ['RC-26-01495', 'Sri Vinayaga Traders', 'T. Nagar', [['cardboard', 45], ['plastic', 15]], 'Thu 8 Oct, 10:00 – 12:00', 'Selvi R on Thu']]
          .map(([id, n, a, it, pref, sug, sel]) => '<div class="wait' + (sel ? ' sel' : '') + '"><div class="r1"><b>' + n + '</b><span class="muted" style="font-size:12px">' + id + '</span></div><small>' + a + ', asked for ' + pref + '</small>' + strip(items(it)) + legend(items(it)) +
            '<div class="sugg"><span>Suggested: ' + sug + '</span><button class="btn btn-primary btn-sm" style="height:30px;padding:0 10px;font-size:12.5px">Book</button></div></div>').join('') + '</div></aside>' +
    '</div>' +
    '<div class="secttl">Recent reschedules</div>' +
    '<div class="tcard"><table class="tbl"><thead><tr><th>Request</th><th>From</th><th>To</th><th>Reason</th><th>Changed by</th><th>When</th></tr></thead><tbody>' +
      [['RC-26-01482, Priya Raman', 'Tue 6 Oct, 16:00 – 18:00', 'Wed 7 Oct, 10:00 – 12:00', 'No collector free in Anna Nagar on Tuesday evening', 'Kavya S', '6 Oct, 11:05'], ['RC-26-01486, Velachery Mart', 'Mon 5 Oct, 10:00 – 12:00', 'Tue 6 Oct, 14:00 – 16:00', 'Customer asked to move it', 'Customer', '4 Oct, 18:40'], ['RC-26-01477, Adyar Clinic', 'Sat 3 Oct, 08:00 – 10:00', 'Mon 5 Oct, 08:00 – 10:00', 'Collector vehicle breakdown', 'Kavya S', '3 Oct, 07:55']]
        .map(([r, f, t, why, by, w]) => '<tr><td><b>' + r + '</b></td><td class="chg"><s>' + f + '</s></td><td><b>' + t + '</b></td><td>' + why + '</td><td>' + by + '</td><td class="nowrap muted">' + w + '</td></tr>').join('') +
    '</tbody></table></div>'));
  pressGroup($('a-schedule'), '#sch-view button');

  const complaints = [
    ['CMP-1046', 'Deepa M', 'RC-26-01468', 'Pickup delayed', '6 Oct, 10:12', '—', 'open'],
    ['CMP-1045', 'Anitha Joseph', 'RC-26-01455', 'Collector did not arrive', '5 Oct, 18:30', '—', 'open'],
    ['CMP-1044', 'Lakshmi Stores', 'RC-26-01471', 'Wrong material category', '5 Oct, 12:02', '—', 'open'],
    ['CMP-1043', 'Karthik S', 'RC-26-01474', 'Poor service', '4 Oct, 21:15', 'Kavya S', 'review'],
    ['CMP-1042', 'Priya Raman', 'RC-26-01290', 'Wrong quantity recorded', '4 Oct, 19:20', 'Kavya S', 'review', true],
    ['CMP-1039', 'Ramco Office Park', 'RC-26-01402', 'Other', '28 Sep, 11:40', 'Kavya S', 'resolved'],
  ];
  const cpill = { open: '<span class="pill tone-warn">Open</span>', review: '<span class="pill tone-info">In review</span>', resolved: '<span class="pill tone-done">Resolved</span>' };
  put('a-complaints', shell('Complaints',
    adminTop('Complaints', 'Reply within 2 working days', searchBox('Search complaint, request or customer')) +
    '<div class="tabs" role="tablist">' + [['Open', 3], ['In review', 2], ['Resolved', 41], ['All', 46]].map(([l, n], i) => '<button role="tab" aria-selected="' + (i === 1) + '">' + l + '<span class="c">' + n + '</span></button>').join('') + '</div>' +
    '<div class="toolbar">' + fsel('Type', 'All') + fsel('Collector', 'Any') + fsel('Raised', 'Last 30 days') + '</div>' +
    '<div class="req-layout" style="grid-template-columns:minmax(0,1fr) 390px"><div class="req-table"><table class="tbl"><thead><tr><th>Complaint</th><th>Customer</th><th>Issue</th><th>Raised</th><th>Assigned</th><th>Status</th></tr></thead><tbody>' +
      complaints.map(([id, c, r, t, w, who, s, sel]) => '<tr class="' + (sel ? 'sel' : '') + '"><td class="idc">' + id + '<br><small class="muted" style="font-weight:500">' + r + '</small></td><td><b>' + c + '</b></td><td>' + t + '</td><td class="nowrap">' + w + '</td><td>' + who + '</td><td>' + cpill[s] + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '<aside class="review" aria-label="Complaint detail"><div class="rh"><div class="r1"><h2>CMP-1042</h2>' + cpill.review + '</div><small>Wrong quantity recorded, raised Sun 4 Oct, 19:20</small></div>' +
      '<div class="rs"><h3>Customer says</h3><div class="msgbox"><small>Priya Raman, about RC-26-01290</small>The collector recorded 3.7 kg of metal, but I handed over the old pressure cooker and a box of cans, closer to 5 kg.</div><div class="photos"><div class="photo" role="img" aria-label="Customer photo" style="width:56px;height:56px"></div></div></div>' +
      '<div class="rs"><h3>What was recorded</h3><div class="evid"><div><span class="muted">Customer estimate</span><b>4 kg</b>metal</div><div class="diff"><span class="muted">Collector recorded</span><b>3.7 kg</b>metal, by Murugan K</div></div>' +
        '<p class="muted" style="font-size:13px;margin-top:8px">Collector photo attached at pickup, 29 Aug 10:52. Customer confirmed the collection the same day.</p></div>' +
      '<div class="rs"><h3>Resolution</h3><div class="radio-list"><label><input type="radio" name="res" checked>Explain the recorded weight (no change)</label><label><input type="radio" name="res">Correct the recorded quantity</label><label><input type="radio" name="res">Ask the collector for a statement</label></div>' +
        '<label class="field-label" style="margin-top:12px" for="cmp-reply">Reply to the customer</label><textarea class="input" id="cmp-reply" style="height:86px">Thank you for flagging this. The pressure cooker’s rubber gasket and handle are removed before weighing, which is why the metal came to 3.7 kg. The weighing photo is attached.</textarea>' +
        '<div class="decide" style="margin-top:10px"><button class="btn btn-ghost">Save note</button><button class="btn btn-primary">Send and resolve</button></div></div>' +
      '<div class="rs" style="border-bottom:0"><h3>Activity</h3><ul class="log"><li><span>4 Oct, 19:20</span>Raised by customer</li><li><span>5 Oct, 09:30</span>Assigned to Kavya S</li><li><span>5 Oct, 09:31</span>Customer notified: in review</li></ul></div>' +
    '</aside></div>'));

  const Amin = RC.admin;
  const monthsCat = [ // tonnes per month split by category share
    [6120, [0.31, 0.25, 0.18, 0.09, 0.08, 0.04, 0.04, 0.01]], [6890, [0.30, 0.26, 0.19, 0.09, 0.07, 0.04, 0.04, 0.01]], [7410, [0.30, 0.25, 0.19, 0.09, 0.07, 0.04, 0.05, 0.01]],
    [8350, [0.29, 0.25, 0.20, 0.09, 0.07, 0.04, 0.05, 0.01]], [9120, [0.30, 0.25, 0.19, 0.09, 0.07, 0.04, 0.05, 0.01]], [10435, [0.30, 0.25, 0.19, 0.09, 0.07, 0.04, 0.04, 0.02]]];
  const catOrder = ['paper', 'cardboard', 'plastic', 'metal', 'glass', 'ewaste', 'textile', 'batteries'];
  const W = 520, H = 230, bw = 52, gap = (W - 40 - bw * 6) / 6;
  const stacked = monthsCat.map(([tot, shares], i) => { let y = 190; const x = 40 + gap / 2 + i * (bw + gap);
    return shares.map((sh, j) => { const h = tot * sh / 11000 * 170; y -= h; return '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(h - 1.5, 0) + '" fill="var(--c-' + catOrder[j] + ')"' + (j === shares.length - 1 ? ' rx="2"' : '') + '/>'; }).join('') +
      '<text class="v" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + (tot / 1000).toFixed(1) + ' t</text><text x="' + (x + bw / 2) + '" y="210" text-anchor="middle">' + Amin.months[i] + '</text>'; }).join('') +
    [0, 5000, 10000].map((g) => '<line x1="36" x2="' + W + '" y1="' + (190 - g / 11000 * 170) + '" y2="' + (190 - g / 11000 * 170) + '" stroke="var(--line)"/><text x="0" y="' + (194 - g / 11000 * 170) + '">' + g / 1000 + ' t</text>').join('');
  const heat = [['Mon', [62, 78, 40, 55, 70]], ['Tue', [58, 74, 38, 52, 66]], ['Wed', [55, 70, 35, 50, 60]], ['Thu', [60, 72, 42, 48, 64]], ['Fri', [64, 80, 44, 58, 76]], ['Sat', [88, 100, 70, 62, 54]]];
  put('a-analytics', shell('Analytics',
    adminTop('Analytics', 'Trends to plan collectors, slots and areas', '<button class="btn btn-ghost btn-sm">' + I('download', 16) + 'Export</button>') +
    '<div class="toolbar">' + fsel('Period', 'Apr – Sep 2026') + fsel('Area', 'All') + fsel('Customer type', 'All') + fsel('Category', 'All') + '</div>' +
    '<div class="dgrid">' +
      '<section class="card span2"><div class="ch"><div><h2>Collection volume by month and material</h2><div class="sub">September is up 71% on April</div></div></div><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Stacked monthly volume by material">' + stacked + '</svg>' +
        '<div class="legend" style="margin-top:8px">' + catOrder.map((c) => '<span><b class="sw" style="background:var(--c-' + c + ')"></b>' + C(c).name + '</span>').join('') + '</div></section>' +
      '<section class="card"><div class="ch"><div><h2>Why pickups fail</h2><div class="sub">214 failed pickups, all time</div></div></div><div class="reasons">' +
        [['Customer unavailable', 41], ['Incorrect address', 22], ['Material unavailable', 15], ['Unable to reach location', 11], ['Unsafe or invalid material', 6], ['Other', 5]].map(([r, p]) => '<div><span>' + r + '</span><span class="t"><i style="width:' + (p / 41 * 100) + '%"></i></span><b>' + p + '%</b></div>').join('') +
        '</div><p class="muted" style="font-size:12.5px;margin-top:10px">A reminder the evening before could cut the biggest cause.</p></section>' +
      '<section class="card"><div class="ch"><div><h2>Busiest days and slots</h2><div class="sub">Share of the busiest slot</div></div></div><div class="heat"><span></span>' + RC.settings.slots.map((s) => '<span class="h">' + s.slice(0, 5) + '</span>').join('') +
        heat.map(([d, v]) => '<span>' + d + '</span>' + v.map((x) => '<i style="--v:' + x + '" class="' + (x > 70 ? 'hi' : '') + '">' + x + '</i>').join('')).join('') + '</div></section>' +
      '<section class="card"><div class="ch"><div><h2>Estimate vs actual weight</h2><div class="sub">Average difference, September</div></div></div><div class="acc">' +
        [['Paper', 4], ['Cardboard', 7], ['Plastic', -9], ['Metal', -6], ['Glass', 3], ['Textile', -12]].map(([c, d]) => '<div><span>' + c + '</span><span class="axis"><i style="' + (d >= 0 ? 'left:50%;width:' + d * 3 + '%;background:var(--chart)' : 'right:50%;width:' + -d * 3 + '%;background:var(--amber)') + '"></i></span><b>' + (d > 0 ? '+' : '') + d + '%</b></div>').join('') +
        '</div><p class="muted" style="font-size:12.5px;margin-top:10px">Negative means customers overestimate. Plastic and textile cause most quantity complaints.</p></section>' +
      '<section class="card"><div class="ch"><div><h2>Customers by type</h2><div class="sub">Requests in September</div></div></div>' +
        strip([{ cat: 'glass', est: 61 }, { cat: 'paper', est: 16 }, { cat: 'ewaste', est: 11 }, { cat: 'plastic', est: 7 }, { cat: 'textile', est: 5 }], 'est', 'thick') +
        '<div class="legend" style="margin-top:10px"><span><b class="sw" style="background:var(--c-glass)"></b>Household 61%</span><span><b class="sw" style="background:var(--c-paper)"></b>Shop 16%</span><span><b class="sw" style="background:var(--c-ewaste)"></b>Office 11%</span><span><b class="sw" style="background:var(--c-plastic)"></b>Business 7%</span><span><b class="sw" style="background:var(--c-textile)"></b>Institution 5%</span></div>' +
        '<div class="act-grid" style="margin-top:16px"><div><b>742</b><span>Active customers</span></div><div><b>68%</b><span>Booked again within 60 days</span></div></div></section>' +
      '<section class="card span3"><div class="ch"><div><h2>Collector performance</h2><div class="sub">September</div></div></div><table class="tbl"><thead><tr><th>Collector</th><th>Zone</th><th class="num">Pickups</th><th class="num">Failed</th><th class="num">Collected</th><th class="num">Avg per pickup</th><th class="num">Complaints</th><th class="num">On time</th></tr></thead><tbody>' +
        Amin.collectors.map((c, i) => '<tr><td><b>' + c.name + '</b></td><td class="muted">' + c.zone + '</td><td class="num">' + c.done + '</td><td class="num">' + c.failed + '</td><td class="num">' + RC.kgFmt(c.kg) + ' kg</td><td class="num">' + (c.kg / c.done).toFixed(1) + ' kg</td><td class="num">' + [0, 1, 1, 2, 3][i] + '</td><td class="num"><span class="ontime' + (c.onTime < 92 ? ' low' : '') + '" style="--w:' + c.onTime + '%"><i></i>' + c.onTime + '%</span></td></tr>').join('') +
      '</tbody></table></section>' +
    '</div>'));

  const reports = [
    ['chart', 'Collection volume', 'Kilograms by month, area and material'], ['tag', 'Waste categories', 'Share of each material over time'], ['users', 'Customer activity', 'New, active and repeat customers'],
    ['truck', 'Collector activity', 'Pickups, kilograms and on-time rate'], ['check', 'Pickup completion', 'Completed, failed and cancelled'], ['alert', 'Failed pickups', 'Each failure with its reason'], ['pin', 'Location-wise collection', 'Requests and kilograms by area'],
  ];
  const repRows = [['Anna Nagar', 1240, 980, 610, 220, 170], ['T. Nagar', 905, 770, 520, 180, 140], ['Velachery', 820, 640, 480, 160, 120], ['Adyar', 690, 560, 390, 140, 110], ['Mylapore', 610, 480, 320, 120, 95], ['Kilpauk', 470, 390, 270, 100, 75]];
  put('a-reports', shell('Reports',
    adminTop('Reports', 'Pick a report, set filters, then export a file anyone can open in a spreadsheet') +
    '<div class="rep-layout"><div class="replist" id="rep-list">' + reports.map(([ic, t, d], i) => '<button type="button" class="repitem" aria-pressed="' + (i === 6) + '"><span class="ico">' + I(ic, 18) + '</span><span><b>' + t + '</b><small>' + d + '</small></span></button>').join('') + '</div>' +
    '<div style="display:grid;gap:16px;min-width:0">' +
      '<section class="card"><div class="ch"><div><h2>Location-wise collection</h2><div class="sub">Kilograms collected by area and main material</div></div><div class="exports"><button class="btn btn-ghost btn-sm">' + I('download', 16) + 'CSV</button><button class="btn btn-primary btn-sm">' + I('download', 16) + 'Excel</button></div></div>' +
        '<div class="repfilters"><div class="field"><label class="field-label" for="rp-from">From</label><input class="input" type="date" id="rp-from" value="2026-09-01"></div><div class="field"><label class="field-label" for="rp-to">To</label><input class="input" type="date" id="rp-to" value="2026-09-30"></div><div class="field"><label class="field-label" for="rp-area">Area</label><select class="input" id="rp-area"><option>All areas</option></select></div><div class="field"><label class="field-label" for="rp-cat">Category</label><select class="input" id="rp-cat"><option>All categories</option></select></div></div></section>' +
      '<section class="card"><div class="ch"><div><h2>Preview</h2><div class="sub">1 Sep – 30 Sep 2026, first 6 of 7 areas</div></div></div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Area</th><th class="num">Paper</th><th class="num">Cardboard</th><th class="num">Plastic</th><th class="num">Metal</th><th class="num">Other</th><th class="num">Total</th></tr></thead><tbody>' +
        repRows.map(([a, ...v]) => '<tr><td><b>' + a + '</b></td>' + v.map((x) => '<td class="num">' + RC.kgFmt(x) + '</td>').join('') + '<td class="num"><b>' + RC.kgFmt(v.reduce((p, q) => p + q, 0)) + ' kg</b></td></tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td>' + [0, 1, 2, 3, 4].map((j) => '<td class="num">' + RC.kgFmt(repRows.reduce((p, r) => p + r[j + 1], 0)) + '</td>').join('') + '<td class="num">' + RC.kgFmt(repRows.reduce((p, r) => p + r.slice(1).reduce((x, y) => x + y, 0), 0)) + ' kg</td></tr></tfoot></table></div></section>' +
      '<section class="card"><div class="ch"><div><h2>Recent exports</h2></div></div><ul class="recent"><li><span>Collector activity, September 2026 <small>Excel</small></span><small>Kavya S, 1 Oct</small></li><li><span>Pickup completion, Q2 2026 <small>CSV</small></span><small>Kavya S, 2 Jul</small></li><li><span>Failed pickups, August 2026 <small>CSV</small></span><small>Ravi P, 3 Sep</small></li></ul></section>' +
    '</div></div>'));
  pressGroup($('a-reports'), '#rep-list .repitem');

  const audit = [
    ['6 Oct, 11:05:12', 'Kavya S', 'Admin', 'Rescheduled', 'w', 'RC-26-01482', '<s>Tue 6 Oct, 16–18</s> → <b>Wed 7 Oct, 10–12</b>. Reason: no collector free in Anna Nagar'],
    ['6 Oct, 11:02:40', 'Kavya S', 'Admin', 'Accepted', 'c', 'RC-26-01482', 'Status <s>Submitted</s> → <b>Accepted</b>'],
    ['6 Oct, 10:41:07', 'Murugan K', 'Collector', 'Recorded quantity', 'i', 'RC-26-01476', 'Paper <b>38.6 kg</b> (estimate 40), E-waste <b>7 pcs</b> (estimate 6). Photo attached'],
    ['6 Oct, 10:18:55', 'Murugan K', 'Collector', 'Status update', 'i', 'RC-26-01476', '<s>Arrived</s> → <b>Collection started</b>'],
    ['6 Oct, 09:22:31', 'Murugan K', 'Collector', 'Marked failed', 'b', 'RC-26-01474', 'Reason: <b>Customer unavailable</b>. Called twice, no answer'],
    ['6 Oct, 09:14:03', 'Priya Raman', 'Customer', 'Submitted', 'c', 'RC-26-01482', 'Paper 12 kg, Cardboard 8 kg, Plastic 4 kg. Preferred Tue 6 Oct, 16–18'],
    ['6 Oct, 08:52:44', 'Sri Vinayaga Traders', 'Customer', 'Submitted', 'c', 'RC-26-01495', 'Cardboard 45 kg, Plastic 15 kg'],
    ['6 Oct, 08:12:09', 'Dinesh Kumar', 'Collector', 'Registered', 'i', 'COL-031', 'Waiting for approval. Areas: Velachery, Adyar'],
    ['5 Oct, 18:00:00', 'System', 'System', 'Reminder sent', 'i', '41 requests', 'Evening-before reminders for Tue 6 Oct pickups'],
    ['5 Oct, 16:24:18', 'Kavya S', 'Admin', 'Rejected', 'b', 'RC-26-01486', 'Reason: <b>Vehicle (lead-acid) batteries are not accepted</b>'],
    ['5 Oct, 15:03:51', 'Kavya S', 'Admin', 'Changed setting', 'w', 'Cancellation cutoff', '<s>8:00 pm the day before</s> → <b>6:00 pm the day before</b>'],
    ['5 Oct, 12:40:26', 'Ravi P', 'Admin', 'Deactivated category', 'w', 'Other recyclable', 'Shown to customers <s>On</s> → <b>Off</b>'],
  ];
  put('a-audit', shell('Audit logs',
    adminTop('Audit log', 'Every important action, who did it and when', searchBox('Search request, user or action') + '<button class="btn btn-ghost btn-sm">' + I('download', 16) + 'Export CSV</button>') +
    '<div class="toolbar">' + fsel('User', 'Anyone') + fsel('Role', 'All') + fsel('Action', 'All') + fsel('Date', 'Last 7 days') + '</div>' +
    '<div class="tcard"><table class="tbl audit"><thead><tr><th>Time</th><th>Who</th><th>Action</th><th>On</th><th>Details</th></tr></thead><tbody>' +
      audit.map(([t, u, r, a, cls, on, d]) => '<tr><td class="time">' + t + '</td><td><b>' + u + '</b><br><small class="muted">' + r + '</small></td><td><span class="act-tag ' + cls + '">' + a + '</span></td><td class="nowrap">' + on + '</td><td class="chg">' + d + '</td></tr>').join('') +
    '</tbody></table><div class="pager"><span>Showing 12 of 3,418 entries in the last 7 days</span><span class="pg"><button aria-label="Previous page">‹</button><button aria-current="page">1</button><button>2</button><button>3</button><button aria-label="Next page">›</button></span></div></div>' +
    '<p class="lock">' + I('shield', 16) + 'Entries can’t be edited or deleted. They’re kept for 3 years.</p>'));

  put('a-settings', shell('Settings',
    adminTop('Settings', 'Rules the whole platform follows. Changes are written to the audit log.') +
    '<div class="set-grid">' +
      '<section class="set"><h2>Working days and hours</h2><p class="sub">Customers can only pick times inside these hours.</p>' +
        '<div class="daychips" id="set-days">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => '<button type="button" aria-pressed="' + (d !== 'Sun') + '">' + d + '</button>').join('') + '</div>' +
        '<div class="row2"><div class="field"><label class="field-label" for="set-open">Opens</label><input class="input" type="time" id="set-open" value="08:00" style="height:40px"></div><div class="field"><label class="field-label" for="set-close">Closes</label><input class="input" type="time" id="set-close" value="18:00" style="height:40px"></div></div>' +
        '<div class="field"><label class="field-label" for="set-hol">Closed dates</label><input class="input" id="set-hol" value="2 Oct (Gandhi Jayanti), 20 Oct (Diwali)" style="height:40px"></div></section>' +
      '<section class="set"><h2>Time slots</h2><p class="sub">2-hour slots, generated from working hours.</p><div class="slotlist">' + RC.settings.slots.map((s) => '<div>' + s + '<span class="muted" style="font-weight:500;font-size:13px">up to 8 pickups per collector per day</span></div>').join('') + '</div></section>' +
      '<section class="set"><h2>Requests and pickups</h2>' +
        '<div class="field"><label class="field-label" for="set-cut">Customers can cancel until</label><select class="input" id="set-cut" style="height:40px"><option selected>6:00 pm the day before pickup</option><option>2 hours before the slot</option><option>The start of the slot</option></select></div>' +
        '<div class="field"><label class="field-label" for="set-cap">Pickups per collector per day</label><input class="input" type="number" id="set-cap" value="8" style="height:40px"></div>' +
        '<div class="field"><label class="field-label" for="set-ahead">How far ahead customers can book</label><select class="input" id="set-ahead" style="height:40px"><option selected>14 days</option><option>7 days</option><option>30 days</option></select></div>' +
        '<div class="set-row"><span>Require a photo when recording quantity<small>Helps settle weight disputes</small></span>' + toggle('set-photo', false, 'Require photo') + '</div></section>' +
      '<section class="set"><h2>Notifications</h2>' +
        '<div class="set-row"><span>In-app notifications<small>Always on for every event</small></span>' + toggle('set-app', true, 'In-app', true) + '</div>' +
        '<div class="set-row"><span>Email<small>Sent through a free email service</small></span>' + toggle('set-mail', true, 'Email') + '</div>' +
        '<div class="set-row"><span>SMS<small>Paid service, not used in the first version</small></span>' + toggle('set-sms', false, 'SMS', true) + '</div>' +
        '<div class="field"><label class="field-label" for="set-rem">Pickup reminder</label><select class="input" id="set-rem" style="height:40px"><option selected>6:00 pm the evening before</option><option>2 hours before the slot</option><option>Off</option></select></div></section>' +
      '<section class="set"><h2>Service areas</h2><p class="sub">Zones used to suggest the nearest collector.</p><div class="zones">' +
        [['Anna Nagar', 'Zone 8', 'Murugan K'], ['T. Nagar', 'Zone 3', 'Selvi R'], ['Adyar', 'Zone 5', 'Fathima N'], ['Velachery', 'Zone 6', 'Arun Prakash'], ['Mylapore', 'Zone 4', 'Revathi S'], ['Tambaram', 'Zone 9', 'Vignesh T']].map(([a, z, c]) => '<div><span><b>' + a + '</b> <small>' + z + '</small></span><small>' + c + '</small><button class="lnk">Edit</button></div>').join('') +
        '</div><button class="btn btn-ghost btn-sm" style="justify-self:start">' + I('plus', 16) + 'Add area</button></section>' +
      '<section class="set"><h2>Units and language</h2>' +
        '<div class="set-row"><span>Weight unit<small>Used for most materials</small></span><span class="pill tone-active">kg</span></div>' +
        '<div class="set-row"><span>Count unit<small>Used for e-waste items</small></span><span class="pill tone-active">pcs</span></div>' +
        '<div class="set-row"><span>Languages offered<small>Customers and collectors pick their own</small></span><span class="opts"><span class="pill tone-active">English</span><span class="pill tone-active">தமிழ்</span></span></div></section>' +
    '</div>' +
    '<div class="savebar"><span>2 unsaved changes: email notifications, closed dates</span><span style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm">Discard</button><button class="btn btn-primary btn-sm" style="background:#fff;color:var(--leaf-ink)">Save changes</button></span></div>'));
  multiPress($('a-settings'), '#set-days button');

  A.mountMaps();
})();
