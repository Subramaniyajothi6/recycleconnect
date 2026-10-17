/* Design A "Sorted" — screens. Colours come from CSS tokens so palette variants share this file. */
(function () {
  const $ = (id) => document.getElementById(id);
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const I = RC.icon, C = RC.cat;
  const pill = (st) => { const s = RC.requestStatus[st]; return '<span class="pill tone-' + s.tone + '">' + s.label + '</span>'; };
  const strip = (items, key, cls) => '<div class="strip ' + (cls || '') + '">' + items.map((it) => '<i style="flex:' + (it[key || 'est'] || 0) + ';background:var(--c-' + it.cat + ')" title="' + C(it.cat).name + '"></i>').join('') + '</div>';
  const legend = (items, key) => '<div class="legend">' + items.map((it) => '<span><b class="sw" style="background:var(--c-' + it.cat + ')"></b>' + C(it.cat).name + ' ' + RC.qty(it[key || 'est'], C(it.cat).unit) + '</span>').join('') + '</div>';
  const HOME = [RC.customer.lat, RC.customer.lng], TRUCK = [13.0745, 80.2240];
  const ROUTE = [TRUCK, [13.0772, 80.2205], [13.0808, 80.2170], [13.0836, 80.2128], HOME];
  const AREAS = { 'Anna Nagar': [13.0850, 80.2101], 'T. Nagar': [13.0418, 80.2341], 'Velachery': [12.9815, 80.2180], 'Adyar': [13.0012, 80.2565],
    'Mylapore': [13.0339, 80.2619], 'Kilpauk': [13.0829, 80.2420], 'Tambaram': [12.9249, 80.1000] };
  const brand = '<div class="brand"><span class="brand-mark"><i></i><i></i><i></i></span>RecycleConnect</div>';
  const tabbar = (cur) => '<nav class="tabbar" aria-label="Main">' +
    [['home', 'Home', '', 'c-dash'], ['plus', 'New', 'new', 'c-new'], ['list', 'Requests', '', 'c-requests'], ['clock', 'History', '', 'c-history'], ['user', 'Profile', '', 'c-profile']]
      .map(([ic, l, c, to]) => '<a href="#' + to + '" class="' + (c || '') + '"' + (l === cur ? ' aria-current="page"' : '') + '>' + I(ic, 22) + l + '</a>').join('') + '</nav>';

  /* ---------- Customer: dashboard ---------- */
  function cDash() {
    const r = RC.activeRequest, cu = RC.customer, st = cu.stats;
    const byCat = st.byCategory.map(([cat, kg]) => ({ cat, est: kg }));
    $('c-dash').innerHTML = '<div class="screen-wrap"><div class="body">' +
      '<div class="app-top">' + brand + '<a class="icon-btn" href="#c-notifs" aria-label="Notifications, 3 new">' + I('bell') + '<span class="dot"></span></a></div>' +
      '<div class="hello"><h1>Good morning, ' + cu.first + '</h1><p>' + cu.type + ' account, Anna Nagar</p></div>' +
      '<article class="active-card" aria-label="Active pickup">' +
        '<div class="row1"><span>Active pickup ' + r.id + '</span>' + '<span class="pill">' + RC.requestStatus[r.status].label + '</span></div>' +
        '<div class="when">' + r.date + '<br>' + r.slot + '</div>' +
        '<div class="who">' + I('truck', 18) + r.collector.name + ' will collect from your address</div>' +
        '<div class="card-map" id="map-dash" role="img" aria-label="Map of your address and the collector’s route"></div>' +
        strip(r.items) + legend(r.items) +
        '<a href="#c-track" class="btn btn-light btn-block">Track pickup</a>' +
      '</article>' +
      '<a class="new-cta" href="#c-new"><span class="plus">' + I('plus', 22) + '</span><span><b>New collection</b><span>Paper, plastic, metal, e-waste and more</span></span></a>' +
      '<div class="sec-h"><h2>Your recycling so far</h2><a href="#c-history">History</a></div>' +
      '<div class="panel" style="margin:0 20px">' +
        '<div class="total"><span class="disp">' + st.kg + '</span><span>kg collected</span></div>' +
        '<div style="margin-top:14px">' + strip(byCat, 'est', 'thick') + '</div>' +
        '<div style="margin-top:10px">' + legend(byCat) + '</div>' +
        '<div class="counts"><div><b>' + st.total + '</b><span>Requests</span></div><div><b>' + st.completed + '</b><span>Completed</span></div><div><b>' + st.cancelled + '</b><span>Cancelled</span></div><div><b>' + st.failed + '</b><span>Failed</span></div></div>' +
      '</div>' +
      '<div class="sec-h"><h2>Updates</h2><a href="#c-notifs">See all</a></div>' +
      '<div class="list">' + RC.notifications.map((n) => '<div class="li"><span class="ico">' + I(n.kind === 'assigned' ? 'truck' : n.kind === 'rescheduled' ? 'refresh' : 'check', 18) + '</span><div class="t">' + n.text + '<small>Today, ' + n.at + '</small></div></div>').join('') + '</div>' +
      '<div class="sec-h"><h2>Recent requests</h2><a href="#c-requests">All requests</a></div>' +
      '<div class="list">' + RC.history.slice(0, 3).map((h) => {
        const items = h.items.map(([cat, act, est]) => ({ cat, est: act || est }));
        return '<div class="li"><div class="t"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + h.id + '</b>' + pill(h.status) + '</div><small>' + h.date + ' — ' + items.map((i) => C(i.cat).name).join(', ') + (h.reason ? ' — ' + h.reason : '') + '</small>' + strip(items) + '</div></div>';
      }).join('') + '</div>' +
      '</div>' + tabbar('Home') + '</div>';
    initMap('map-dash', (m) => {
      L.polyline(ROUTE, { color: tok('--leaf'), weight: 4, opacity: .9, dashArray: '2 8', lineCap: 'round' }).addTo(m);
      L.marker(HOME, { icon: homeIcon() }).addTo(m);
      L.marker(TRUCK, { icon: truckIcon() }).addTo(m);
      m.fitBounds(ROUTE, { padding: [26, 26] });
    });
  }

  /* ---------- Customer: new collection ---------- */
  const newState = { sel: { paper: 12, cardboard: 8, plastic: 4, batteries: 1 }, day: 1, slot: 1 };
  function cNew() {
    const days = [['Wed', 7], ['Thu', 8], ['Fri', 9], ['Sat', 10], ['Sun', 11, true], ['Mon', 12], ['Tue', 13]];
    const selCats = RC.categories.filter((c) => c.id in newState.sel);
    $('c-new').innerHTML = '<div class="screen-wrap"><div class="body">' +
      '<div class="app-top"><a href="#c-dash" class="icon-btn" aria-label="Back">' + I('back') + '</a><span class="title">New collection</span><span class="muted" style="font-size:13px">Draft saved</span></div>' +
      '<div class="step"><div class="step-h"><span class="n">1</span><h2>What are you recycling?</h2></div>' +
        '<div class="bins">' + RC.categories.map((c) => '<button type="button" class="bin" data-cat="' + c.id + '" style="--c:var(--c-' + c.id + ')" aria-pressed="' + (c.id in newState.sel) + '"><span class="tick">' + I('check', 13) + '</span><b>' + c.name + '</b><small>in ' + c.unit + '</small></button>').join('') + '</div>' +
        '<div class="qty-rows">' + selCats.map((c) => '<div class="qty-row" style="--c:var(--c-' + c.id + ')"><div class="top"><b>' + c.name + '</b><label class="qty-in"><input type="number" min="0.5" step="0.5" value="' + newState.sel[c.id] + '" aria-label="' + c.name + ' quantity"><span>' + c.unit + '</span></label></div><small>' + c.accepts + '</small>' +
          (c.warning ? '<div class="note warn">' + I('alert', 18) + '<span>' + c.warning + '</span></div>' : '') + '</div>').join('') + '</div>' +
        '<details class="na"><summary>' + I('x', 16) + 'Items we can’t collect</summary><ul>' + RC.notAccepted.map((x) => '<li>' + x + '</li>').join('') + '</ul></details>' +
      '</div>' +
      '<div class="step"><div class="step-h"><span class="n">2</span><h2>Pickup address</h2></div>' +
        '<div class="panel"><div class="addr"><span class="ico">' + I('pin') + '</span><div><b>Home</b><div class="muted" style="font-size:14px">' + RC.customer.address + ', Chennai 600040</div></div></div>' +
        '<div class="mapbox" id="map-new"></div><p class="muted" style="font-size:12.5px;margin-top:8px">Drag the pin to your gate or building entrance.</p></div>' +
      '</div>' +
      '<div class="step"><div class="step-h"><span class="n">3</span><h2>Preferred date and time</h2></div>' +
        '<div class="chips">' + days.map(([d, n, closed], i) => '<button type="button" class="day" data-day="' + i + '" aria-pressed="' + (i === newState.day) + '"' + (closed ? ' disabled title="Closed on Sundays"' : '') + '><small>' + d + '</small><b>' + n + '</b><small>' + (closed ? 'Closed' : 'Oct') + '</small></button>').join('') + '</div>' +
        '<div class="slots">' + RC.settings.slots.map((s, i) => '<button type="button" class="slot" data-slot="' + i + '" aria-pressed="' + (i === newState.slot) + '">' + s + '</button>').join('') + '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:8px">Pickups run ' + RC.settings.operatingDays + ', 08:00 – 18:00.</p>' +
      '</div>' +
      '<div class="step"><div class="step-h"><span class="n">4</span><h2>Notes and photos</h2></div>' +
        '<textarea class="input" placeholder="Where should the collector go? Anything to know?">Bundled near the lift on the ground floor. Call before coming up.</textarea>' +
        '<div class="photos"><div class="photo" role="img" aria-label="Photo 1"></div><div class="photo p2" role="img" aria-label="Photo 2"></div><button type="button" class="photo add" aria-label="Add photo">' + I('camera', 22) + '</button></div>' +
      '</div>' +
      '</div><div class="foot"><button class="btn btn-ghost">Save draft</button><button class="btn btn-primary">Submit request</button></div></div>';
    initMap('map-new', (m, el) => {
      m.setView([RC.customer.lat, RC.customer.lng], 16);
      L.marker([RC.customer.lat, RC.customer.lng], { draggable: true, icon: pinIcon('var(--leaf)') }).addTo(m);
    });
  }
  $('c-new').addEventListener('click', (e) => {
    const b = e.target.closest('.bin, .day, .slot'); if (!b) return;
    if (b.classList.contains('bin')) { const id = b.dataset.cat; if (id in newState.sel) delete newState.sel[id]; else newState.sel[id] = 1; }
    if (b.classList.contains('day')) newState.day = +b.dataset.day;
    if (b.classList.contains('slot')) newState.slot = +b.dataset.slot;
    const top = $('c-new').scrollTop; resetMap('map-new'); cNew(); $('c-new').scrollTop = top;
  });

  /* ---------- Customer: track ---------- */
  let trackState = 'before';
  function cTrack() {
    const r = RC.activeRequest, after = trackState === 'after';
    const actual = { paper: 13.4, cardboard: 7.1, plastic: 3.6 };
    const tl = r.timeline.map((t, i) => after ? Object.assign({}, t, i <= 5 ? { done: true, at: t.at || ['', '', '', '', '7 Oct, 10:22', '7 Oct, 10:41'][i], current: i === 5 } : {}) : t);
    if (after) { tl[3].current = false; tl[4].detail = 'Murugan K is on the way'; tl[5].detail = '24.1 kg recorded'; }
    const totEst = r.items.reduce((a, b) => a + b.est, 0), totAct = Object.values(actual).reduce((a, b) => a + b, 0);
    $('c-track').innerHTML = '<div class="screen-wrap"><div class="body">' +
      '<div class="app-top"><a href="#c-dash" class="icon-btn" aria-label="Back">' + I('back') + '</a><span class="title">' + r.id + '</span>' + pill(after ? 'collected' : r.status) + '</div>' +
      (after ? '<section class="confirm"><h3>Did we collect everything?</h3><p>Murugan K recorded ' + totAct.toFixed(1) + ' kg. You estimated ' + totEst + ' kg. Check the items below, then confirm.</p>' +
        '<div class="btns"><button class="btn btn-primary btn-block">Confirm collection</button><button class="btn btn-ghost btn-block" id="report-btn">Report an issue</button></div>' +
        '<div class="issue-types" id="issue-types">' + RC.complaintTypes.map((t) => '<button type="button">' + t + '</button>').join('') + '</div>' +
        '<textarea class="input" style="margin-top:10px;height:64px" placeholder="Feedback for the collector (optional)"></textarea></section>' : '') +
      '<section class="sched"><div class="sched-map" id="map-track" role="img" aria-label="Map showing the collector’s route to your address"></div><div class="head"><small>' + (after ? 'Collected on' : 'Scheduled pickup') + '</small><div class="disp">' + r.date + ', ' + (after ? '10:41' : r.slot) + '</div></div>' +
        '<div class="row">' + I('pin', 18) + '<span class="grow">' + r.address + '</span></div>' +
        '<div class="row">' + I('truck', 18) + '<span class="grow"><b>' + r.collector.name + '</b><br><span class="muted">' + r.collector.vehicle + '</span></span><button class="btn btn-ghost btn-sm" aria-label="Call collector">' + I('phone', 16) + 'Call</button></div>' +
      '</section>' +
      '<div class="sec-h"><h2>Progress</h2></div>' +
      '<ol class="tl">' + tl.map((t) => '<li class="' + (t.done ? 'done' : '') + (t.current ? ' cur' : '') + '"><span class="dot">' + (t.done ? I('check', 10) : '') + '</span>' + t.label + (t.at || t.detail ? '<small>' + [t.detail, t.at].filter(Boolean).join(' — ') + '</small>' : '') + '</li>').join('') + '</ol>' +
      '<div class="sec-h"><h2>Items</h2></div>' +
      '<div class="panel" style="margin:0 20px"><table class="items-t"><thead><tr><th>Material</th><th>You estimated</th><th>Collected</th></tr></thead><tbody>' +
        r.items.map((it) => '<tr><td><b class="sw" style="background:var(--c-' + it.cat + ')"></b>' + C(it.cat).name + '</td><td>' + it.est + ' kg</td><td>' + (after ? actual[it.cat] + ' kg' : '<span class="muted">after pickup</span>') + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td><td>' + totEst + ' kg</td><td>' + (after ? totAct.toFixed(1) + ' kg' : '—') + '</td></tr></tfoot></table></div>' +
      '<div class="sec-h"><h2>Schedule changes</h2></div>' +
      '<div class="resched">' + r.reschedules.map((x) => '<div class="panel"><div class="from">' + x.from + '</div><div><b>' + x.to + '</b></div><p class="muted" style="margin-top:6px">' + x.reason + '. Changed by ' + x.by + ', ' + x.at + '.</p></div>').join('') + '</div>' +
      (after ? '' : '<div class="pad" style="margin-top:22px"><button class="btn btn-danger btn-block">Cancel request</button><p class="muted" style="font-size:12.5px;text-align:center;margin-top:8px">You can cancel until 6:00 pm on Tue 6 Oct. We’ll ask for a reason.</p></div>') +
      '</div>' + tabbar('Requests') + '</div>';
    resetMap('map-track');
    initMap('map-track', (m) => {
      if (after) {
        L.marker(HOME, { icon: homeIcon(true) }).addTo(m);
        m.setView(HOME, 16);
      } else {
        L.polyline(ROUTE, { color: tok('--leaf'), weight: 5, opacity: .9, lineCap: 'round' }).addTo(m);
        L.marker(HOME, { icon: homeIcon() }).addTo(m);
        L.marker(TRUCK, { icon: truckIcon() }).addTo(m);
        m.fitBounds(ROUTE, { padding: [34, 34] });
      }
    });
    requestAnimationFrame(mountMaps);
  }
  $('track-state').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]'); if (!b) return;
    trackState = b.dataset.state;
    $('track-state').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    cTrack();
  });
  $('c-track').addEventListener('click', (e) => { if (e.target.closest('#report-btn')) $('issue-types').classList.toggle('open'); });

  /* ---------- Collector: today ---------- */
  const pkLabel = { assigned: ['New — accept it', 'warn'], accepted: ['Accepted', 'info'], collection_started: ['Collecting now', 'active'], completed: ['Completed', 'done'], failed: ['Failed', 'bad'] };
  function kToday() {
    const k = RC.collector, c = k.counts;
    $('k-today').innerHTML = '<div class="screen-wrap"><div class="body">' +
      '<div class="k-head"><div class="top"><small>' + k.zone + '</small><a class="icon-btn" href="#k-assigned" style="background:transparent;border-color:rgba(255,255,255,.25);color:#fff" aria-label="New assignments">' + I('bell') + '<span class="dot"></span></a></div>' +
        '<h1>' + k.date + ', ' + k.counts.today + ' pickups</h1>' +
        '<div class="k-counts"><div><b>' + c.today + '</b><span>Today</span></div><div><b>' + c.pending + '</b><span>Pending</span></div><div><b>' + c.completed + '</b><span>Completed</span></div><div><b>' + c.failed + '</b><span>Failed</span></div></div>' +
        '<div class="k-kg"><span>Collected today</span><b>' + c.kg + ' kg</b></div></div>' +
      '<div class="filters" role="group" aria-label="Filters"><button class="fchip">' + I('cal', 15) + 'Today</button><button class="fchip" aria-pressed="true">All statuses</button><button class="fchip">Pending</button><button class="fchip">Completed</button><button class="fchip">Failed</button><button class="fchip">' + I('filter', 15) + 'Category</button></div>' +
      '<div class="pad" style="margin-top:12px"><div class="mapbox" id="map-today" style="height:200px"></div></div>' +
      '<div class="sec-h"><h2>Route</h2><a href="https://www.openstreetmap.org/#map=14/13.082/80.222" target="_blank" rel="noopener">Open in maps</a></div>' +
      '<div class="stops">' + RC.pickups.map((p, i) => {
        const [lab, tone] = pkLabel[p.status];
        const items = p.items.map((x) => ({ cat: x.cat, est: x.act || x.est }));
        return '<article class="stop s-' + p.status + '"><span class="num">' + (p.status === 'completed' ? I('check', 16) : i + 1) + '</span><div>' +
          '<div class="r1"><div><div class="slot-t">' + p.slot + '</div><h3>' + p.customer + '</h3><div class="area">' + p.type + ', ' + p.area + '</div></div><span class="pill tone-' + tone + '">' + lab + '</span></div>' +
          strip(items) + legend(items) +
          (p.failReason ? '<div class="fail-r">Reason: ' + p.failReason + '</div>' : '') +
          (p.status === 'assigned' ? '<div class="acts"><button class="btn btn-primary btn-sm">Accept pickup</button><button class="btn btn-ghost btn-sm">Details</button></div>' : '') +
          (p.status === 'collection_started' ? '<div class="acts"><a href="#k-pickup" class="btn btn-primary btn-sm">Continue pickup</a></div>' : '') +
        '</div></article>';
      }).join('') + '</div>' +
      '</div>' + kTab('Today') + '</div>';
    initMap('map-today', (m) => {
      const pts = RC.pickups.map((p) => [p.lat, p.lng]);
      L.polyline(pts, { color: tok('--leaf-ink'), weight: 3, opacity: .6, dashArray: '6 6' }).addTo(m);
      RC.pickups.forEach((p, i) => L.marker([p.lat, p.lng], { icon: numIcon(i + 1, p.status) }).addTo(m));
      m.fitBounds(pts, { padding: [24, 24] });
    });
  }
  const kTab = (cur) => '<nav class="tabbar four" aria-label="Main">' + [['route', 'Today', 'k-today'], ['list', 'Assigned', 'k-assigned'], ['clock', 'History', 'k-history'], ['user', 'Profile', 'k-profile']]
    .map(([ic, l, to]) => '<a href="#' + to + '"' + (l === cur ? ' aria-current="page"' : '') + '>' + I(ic, 22) + l + '</a>').join('') + '</nav>';

  /* ---------- Collector: pickup in progress ---------- */
  function kPickup() {
    const p = RC.pickups[2], flow = RC.pickupFlow, idx = flow.findIndex((f) => f.id === p.status);
    $('k-pickup').innerHTML = '<div class="screen-wrap"><div class="body">' +
      '<div class="app-top"><a href="#k-today" class="icon-btn" aria-label="Back">' + I('back') + '</a><span class="title">Stop 3 of 6</span><span class="muted" style="font-size:13px">' + p.id + '</span></div>' +
      '<div class="stepper" aria-label="Pickup progress">' + flow.map((f, i) => '<div class="' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '" title="' + f.label + '"></div>').join('') + '</div>' +
      '<div class="step-now"><span>Step ' + (idx + 1) + ' of ' + flow.length + ': <b>' + flow[idx].label + '</b></span><span>Next: ' + flow[idx + 1].label + '</span></div>' +
      '<div class="cust"><h2>' + p.customer + '</h2><div class="meta">' + p.type + ', ' + p.slot + '</div>' +
        '<div class="panel" style="margin-top:12px;padding:12px 14px"><div class="cust-map" id="map-pickup" role="img" aria-label="Map of the pickup location and your position"></div><div class="kv"><span>' + I('pin', 18) + '</span><span>' + p.address + '</span><span>' + I('user', 18) + '</span><span>' + p.contact + ', <span class="nowrap">' + p.phone + '</span></span></div>' +
        '<div class="acts"><a class="btn btn-ghost btn-sm" href="https://www.openstreetmap.org/directions?to=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener">' + I('nav', 16) + 'Directions</a><button class="btn btn-ghost btn-sm">' + I('phone', 16) + 'Call</button></div></div>' +
      '</div>' +
      '<div class="cust-note"><div class="note info">' + I('message', 18) + '<span>' + p.notes + '</span></div></div>' +
      '<div class="sec-h"><h2>Record what you collected</h2></div>' +
      '<div class="rec">' + p.items.map((x) => {
        const c = C(x.cat), d = x.act - x.est;
        return '<div class="rec-row" style="--c:var(--c-' + x.cat + ')"><div class="top"><b>' + c.name + '</b><span class="est">Customer estimate: ' + RC.qty(x.est, c.unit) + '</span></div>' +
          '<div class="in"><input class="input" type="number" step="0.1" value="' + x.act + '" aria-label="Actual ' + c.name + '"><select class="input" aria-label="Unit"><option' + (c.unit === 'kg' ? ' selected' : '') + '>kg</option><option' + (c.unit === 'pcs' ? ' selected' : '') + '>pcs</option></select></div>' +
          '<div class="diff">' + (d === 0 ? 'Matches the estimate' : (d > 0 ? '+' : '') + RC.qty(Math.round(d * 10) / 10, c.unit) + ' compared with the estimate') + '</div></div>';
      }).join('') +
        '<button class="btn btn-ghost btn-block" style="border-style:dashed">' + I('plus', 18) + 'Add another material</button>' +
        '<div class="panel"><b style="font-size:14px">Photo evidence (optional)</b><div class="photos"><div class="photo p2" role="img" aria-label="Photo of sacks"></div><button type="button" class="photo add" aria-label="Take photo">' + I('camera', 22) + '</button></div>' +
        '<textarea class="input" style="margin-top:10px;height:64px" placeholder="Notes for the office (optional)"></textarea></div>' +
      '</div>' +
      '<div class="sheet" id="fail-sheet"><h3>Why did this pickup fail?</h3><p class="muted" style="font-size:13px;margin:4px 0 6px">The customer and office are notified. The request stays in history.</p>' +
        RC.failReasons.map((r, i) => '<label><input type="radio" name="fr"' + (i === 0 ? ' checked' : '') + '>' + r + '</label>').join('') +
        '<button class="btn btn-danger btn-block" style="margin-top:10px;background:var(--red);color:#fff;border:0">Mark pickup failed</button></div>' +
      '<div class="pad" style="margin-top:14px"><button class="btn btn-danger btn-block" id="fail-btn">Can’t complete this pickup</button></div>' +
      '</div><div class="foot" style="grid-template-columns:1fr"><button class="btn btn-primary btn-block" style="height:56px;font-size:16px">' + I('scale', 20) + flow[idx].action + ' and mark collected</button></div></div>';
  }
  function kPickupMap() {
    const p = RC.pickups[2], here = [p.lat + 0.0009, p.lng - 0.0013];
    initMap('map-pickup', (m) => {
      L.polyline([here, [p.lat + 0.0009, p.lng], [p.lat, p.lng]], { color: tok('--leaf'), weight: 4, opacity: .9, dashArray: '2 7', lineCap: 'round' }).addTo(m);
      L.marker([p.lat, p.lng], { icon: pinIcon() }).addTo(m);
      L.marker(here, { icon: L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div style="width:18px;height:18px;border-radius:50%;background:#2F6FDE;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,111,222,.25)"></div>' }) }).addTo(m);
      m.fitBounds([here, [p.lat, p.lng]], { padding: [40, 40], maxZoom: 17 });
    });
  }
  $('k-pickup').addEventListener('click', (e) => { if (e.target.closest('#fail-btn')) { const s = $('fail-sheet'); s.classList.toggle('open'); if (s.classList.contains('open')) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); } });

  /* ---------- Admin shell ---------- */
  const side = (cur) => '<aside class="side">' + brand +
    [['grid', 'Dashboard', 'a-dash'], ['users', 'Customers', 'a-customers'], ['truck', 'Collectors', 'a-collectors'], ['list', 'Collection requests', 'a-requests', '37'], ['tag', 'Waste categories', 'a-categories'], ['cal', 'Scheduling', 'a-schedule'], ['message', 'Complaints', 'a-complaints', '5'], ['chart', 'Analytics', 'a-analytics'], ['file', 'Reports', 'a-reports'], ['shield', 'Audit logs', 'a-audit'], ['gear', 'Settings', 'a-settings']]
      .map(([ic, l, to, n]) => '<a href="#' + to + '"' + (l === cur ? ' aria-current="page"' : '') + '>' + I(ic, 18) + l + (n ? '<span class="count">' + n + '</span>' : '') + '</a>').join('') +
    '<div class="me"><span class="avatar">KS</span><div><b>' + RC.admin.name + '</b><div class="muted" style="font-size:12px">Operations admin</div></div></div></aside>';

  /* ---------- Admin: dashboard ---------- */
  function aDash() {
    const A = RC.admin;
    const catItems = A.categoryKg.map(([cat, kg]) => ({ cat, est: kg }));
    const catTotal = catItems.reduce((a, b) => a + b.est, 0);
    const half = Math.ceil(catItems.length / 2);
    const distRows = (arr) => '<table class="dist-t"><tbody>' + arr.map((x) => '<tr><td><span class="legend"><span><b class="sw" style="background:var(--c-' + x.cat + ')"></b>' + C(x.cat).name + '</span></span></td><td>' + RC.kgFmt(x.est) + ' kg</td><td class="muted">' + (x.est / catTotal * 100).toFixed(1) + '%</td></tr>').join('') + '</tbody></table>';
    // monthly columns
    const max = Math.max(...A.monthlyKg), W = 360, H = 190, bw = 36, gap = (W - bw * 6) / 6;
    const cols = A.monthlyKg.map((v, i) => { const h = v / max * 140, x = gap / 2 + i * (bw + gap), y = 160 - h;
      return '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="6" fill="' + (i === 5 ? 'var(--chart-strong)' : 'var(--chart)') + '" opacity="' + (i === 5 ? 1 : .55 + i * .07) + '"/>' +
        '<text class="v" x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + (v / 1000).toFixed(1) + ' t</text>' +
        '<text x="' + (x + bw / 2) + '" y="180" text-anchor="middle">' + A.months[i] + '</text>'; }).join('');
    const areaMax = A.byArea[0][1];
    $('a-dash').innerHTML = '<div class="admin">' + side('Dashboard') + '<div class="main">' +
      '<div class="topline"><h1>Dashboard</h1><span class="date">Tue 6 Oct 2026</span><span class="sp"></span><div class="search">' + I('search', 16) + 'Search requests, customers, collectors</div><button class="btn btn-ghost btn-sm">' + I('download', 16) + 'Export report</button></div>' +
      '<div class="kpis">' + A.kpis.map((k) => '<div class="kpi' + (k.alert ? ' alert' : '') + '"><span>' + k.label + '</span><b>' + k.value + '</b><small>' + k.note + '</small></div>').join('') + '</div>' +
      '<div class="dgrid">' +
        '<section class="card span2"><div class="ch"><div><h2>What we collected in September</h2><div class="sub">' + RC.kgFmt(catTotal) + ' kg across ' + catItems.length + ' categories</div></div><button class="btn btn-ghost btn-sm">September' + I('down', 16) + '</button></div>' +
          strip(catItems, 'est', 'thick') + '<div class="dist-cols">' + distRows(catItems.slice(0, half)) + distRows(catItems.slice(half)) + '</div></section>' +
        '<section class="card"><div class="ch"><div><h2>Customer activity</h2><div class="sub">September</div></div></div>' +
          '<div class="act-grid"><div><b>' + A.customerActivity.active + '</b><span>Active customers</span></div><div><b>' + A.customerActivity.newThisMonth + '</b><span>New sign-ups</span></div><div><b>' + A.customerActivity.repeat + '</b><span>Booked again</span></div><div><b>1,912</b><span>Requests made</span></div></div>' +
          '<div style="margin-top:18px;font-size:13px" class="muted">Households vs businesses</div><div class="strip thick" style="margin-top:6px"><i style="flex:61;background:var(--c-glass)"></i><i style="flex:39;background:var(--c-ewaste)"></i></div>' +
          '<div class="legend" style="margin-top:8px"><span><b class="sw" style="background:var(--c-glass)"></b>Households 61%</span><span><b class="sw" style="background:var(--c-ewaste)"></b>Shops, offices, institutions 39%</span></div></section>' +
        '<section class="card"><div class="ch"><div><h2>Collection volume by month</h2><div class="sub">Apr – Sep 2026</div></div></div><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Monthly collection volume">' + cols + '</svg></section>' +
        '<section class="card span2"><div class="ch"><div><h2>Completed vs failed</h2><div class="sub">Pickups per month</div></div><div class="legend"><span><b class="sw" style="background:var(--chart)"></b>Done</span><span><b class="sw" style="background:var(--red)"></b>Failed</span></div></div>' +
          A.completedFailed.map(([d, f], i) => '<div class="cf"><span>' + A.months[i] + '</span><div class="bars" style="width:' + ((d + f) / 1821 * 100) + '%"><i style="flex:' + d + '"></i><i style="flex:' + f * 4 + '"></i></div><span>' + d + ' / ' + f + '</span></div>').join('') +
          '<p class="muted" style="font-size:12px;margin-top:8px">Failed segment drawn 4× wider so it stays visible.</p></section>' +
        '<section class="card span3"><div class="ch"><div><h2>Requests by location</h2><div class="sub">September. Circle size shows request count; the orange badge shows requests still waiting for review.</div></div><div class="legend"><span><b class="sw" style="background:var(--chart)"></b>Requests</span><span><b class="sw" style="background:var(--amber)"></b>Waiting for review</span></div></div>' +
          '<div class="area-layout"><div class="area-map" id="map-areas" role="img" aria-label="Map of requests by area"></div><div><h3 class="area-h">Busiest areas</h3>' +
          A.byArea.map(([a, n]) => '<div class="hbar"><span>' + a + '</span><span class="track"><i style="width:' + (n / areaMax * 100) + '%"></i></span><b>' + n + '</b></div>').join('') + '</div></div></section>' +
        '<section class="card span3"><div class="ch"><div><h2>Collector performance</h2><div class="sub">September</div></div><button class="btn btn-ghost btn-sm">All collectors</button></div>' +
          '<table class="tbl"><thead><tr><th>Collector</th><th>Zone</th><th class="num">Completed</th><th class="num">Failed</th><th class="num">Collected</th><th class="num">On time</th></tr></thead><tbody>' +
          A.collectors.map((c) => '<tr><td><b>' + c.name + '</b></td><td class="muted">' + c.zone + '</td><td class="num">' + c.done + '</td><td class="num">' + c.failed + '</td><td class="num">' + RC.kgFmt(c.kg) + ' kg</td><td class="num"><span class="ontime' + (c.onTime < 92 ? ' low' : '') + '" style="--w:' + c.onTime + '%"><i></i>' + c.onTime + '%</span></td></tr>').join('') +
          '</tbody></table></section>' +
      '</div></div></div>';
    initMap('map-areas', (m) => {
      const waiting = { 'T. Nagar': 9, 'Velachery': 6, 'Anna Nagar': 5, 'Adyar': 4, 'Mylapore': 3, 'Kilpauk': 2, 'Tambaram': 8 };
      A.byArea.forEach(([a, n]) => {
        const sz = 26 + n / areaMax * 26;
        L.marker(AREAS[a], { title: a + ': ' + n + ' requests', icon: L.divIcon({ className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
          html: '<div class="area-dot" style="width:' + sz + 'px;height:' + sz + 'px"><b>' + n + '</b><span>' + a + '</span>' + (waiting[a] ? '<i>' + waiting[a] + '</i>' : '') + '</div>' }) }).addTo(m);
      });
      m.fitBounds(Object.values(AREAS), { padding: [36, 36] });
    });
  }

  /* ---------- Admin: requests & review ---------- */
  let selReq = 'RC-26-01495', rejectOpen = false;
  function aRequests() {
    const A = RC.admin, R = A.review;
    $('a-requests').innerHTML = '<div class="admin">' + side('Collection requests') + '<div class="main">' +
      '<div class="topline"><h1>Collection requests</h1><span class="sp"></span><div class="search">' + I('search', 16) + 'Search by request ID or customer</div><button class="btn btn-ghost btn-sm">' + I('download', 16) + 'Export CSV</button></div>' +
      '<div class="tabs" role="tablist">' + [['Needs review', 37], ['Accepted', 18], ['Scheduled', 44], ['In progress', 21], ['Awaiting confirmation', 9], ['Closed', 9603]]
        .map(([l, n], i) => '<button role="tab" aria-selected="' + (i === 0) + '">' + l + '<span class="c">' + n.toLocaleString('en-IN') + '</span></button>').join('') + '</div>' +
      '<div class="fbar">' + [['Waste type', 'All'], ['Area', 'All'], ['Preferred date', 'This week'], ['Collector', 'Any'], ['Quantity', 'Any']]
        .map(([k, v]) => '<button class="fsel"><span>' + k + ':</span>' + v + I('down', 14) + '</button>').join('') + '</div>' +
      '<div class="req-layout"><div class="req-table"><table class="tbl"><thead><tr><th>Request</th><th>Customer</th><th>Materials</th><th class="num">Est. qty</th><th>Preferred</th><th>Status</th><th>Collector</th></tr></thead><tbody>' +
        A.requests.map((r) => '<tr data-id="' + r.id + '" class="' + (r.id === selReq ? 'sel' : '') + '"><td class="idc">' + r.id + '</td><td class="cust-c"><b>' + r.customer + '</b><small>' + r.type + ', ' + r.area + '</small></td><td><div class="mats">' + r.cats.map((c) => '<span class="mat"><b class="sw" style="background:var(--c-' + c + ')"></b>' + C(c).name + '</span>').join('') + '</div></td><td class="num">' + r.qty + '</td><td style="white-space:nowrap">' + r.pref + '</td><td>' + pill(r.status) + '</td><td>' + (r.collector || '<span class="muted">—</span>') + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<aside class="review" aria-label="Review request">' +
          '<div class="rh"><div class="r1"><h2>' + R.id + '</h2>' + pill('submitted') + '</div><small>Submitted ' + R.submitted + '</small></div>' +
          '<div class="rs"><h3>Customer</h3><div class="kv"><span>' + I('user', 16) + '</span><span><b>' + R.customer + '</b>, ' + R.type + '<br><span class="muted">' + R.contact + ', ' + R.phone + '</span></span><span>' + I('pin', 16) + '</span><span>' + R.address + '</span></div><div class="review-map" id="map-review" role="img" aria-label="Map of the pickup address and nearby collectors"></div><div class="legend" style="margin-top:6px;font-size:12px"><span><b class="sw" style="background:var(--leaf)"></b>Pickup address</span><span><b class="sw" style="background:var(--ink)"></b>Collector base</span><span>Dashed: T. Nagar zone</span></div></div>' +
          '<div class="rs"><h3>Materials</h3>' + strip(R.items) + '<div style="margin-top:8px">' + legend(R.items) + '</div>' +
            '<div class="note ok" style="margin-top:10px;padding:8px 10px">' + I('check', 16) + '<span>All materials are on the accepted list.</span></div>' +
            '<p style="margin-top:10px">' + R.notes + '</p><div class="photos"><div class="photo" role="img" aria-label="Photo 1" style="width:60px;height:60px"></div><div class="photo p2" role="img" aria-label="Photo 2" style="width:60px;height:60px"></div></div></div>' +
          '<div class="rs"><h3>Decision</h3><div class="decide"><button class="btn btn-primary">' + I('check', 16) + 'Accept</button><button class="btn btn-ghost">Ask for info</button><button class="btn btn-ghost" id="rej-btn">Reject</button><button class="btn btn-danger">Cancel request</button></div>' +
            '<div class="reject-box' + (rejectOpen ? ' open' : '') + '"><label class="field-label" style="margin-top:4px">Reason for rejecting (sent to the customer)</label><textarea class="input" style="height:64px">Material is outside our service area for this week.</textarea><button class="btn btn-danger btn-sm" style="margin-top:8px">Reject request</button></div></div>' +
          '<div class="rs"><h3>Schedule and assign</h3>' +
            '<label class="field-label">Pickup date</label><input class="input" type="date" value="2026-10-08" min="2026-10-07" style="height:40px">' +
            '<div class="mini-slots">' + RC.settings.slots.map((s, i) => '<button type="button" aria-pressed="' + (i === 1) + '">' + s.replace(' – ', '–').replace(/:00/g, '') + '</button>').join('') + '</div>' +
            '<p class="muted" style="font-size:12px;margin:6px 0 12px">Customer asked for ' + R.pref + ', ' + R.slot + '. Sundays are closed.</p>' +
            '<label class="field-label">Collector</label><div class="coll">' + R.collectorOptions.map((c, i) => '<label><input type="radio" name="col"' + (i === 0 ? ' checked' : '') + '><span><b>' + c.name + '</b>' + (c.inZone ? '<span class="tag-zone">In zone</span>' : '') + '<small>' + c.zone + '</small></span><span class="load">' + c.load + ' of 8 on Thu<i style="--w:' + (c.load / 8 * 100) + '%"></i></span></label>').join('') + '</div>' +
            '<button class="btn btn-primary btn-block" style="margin-top:12px;height:44px">Schedule and assign Selvi R</button></div>' +
          '<div class="rs" style="border-bottom:0"><h3>Activity</h3><ul class="log">' + R.log.map((l) => '<li><span>' + l.at + '</span>' + l.text + '</li>').join('') + '</ul></div>' +
        '</aside></div></div></div>';
  }
  function aRequestsMap() {
    const at = [13.0405, 80.2337];
    const bases = { 'Selvi R': [13.0462, 80.2262], 'Arun Prakash': [12.9815, 80.2180], 'Murugan K': [13.0850, 80.2101] };
    initMap('map-review', (m) => {
      L.circle(AREAS['T. Nagar'], { radius: 1500, color: tok('--leaf'), weight: 1.5, fillOpacity: .06, dashArray: '4 6' }).addTo(m);
      L.marker(at, { icon: pinIcon() }).addTo(m);
      Object.entries(bases).forEach(([n, ll]) => L.marker(ll, { title: n, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
        html: '<div style="width:30px;height:30px;border-radius:50%;background:' + tok('--ink') + ';color:#fff;border:2px solid #fff;display:grid;place-items:center;font:700 11px Figtree,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)">' + n.split(' ').map((w) => w[0]).join('') + '</div>' }) }).addTo(m));
      m.setView([13.0432, 80.2300], 14);
    });
  }
  $('a-requests').addEventListener('click', (e) => {
    if (e.target.closest('#rej-btn')) { rejectOpen = !rejectOpen; document.querySelector('#a-requests .reject-box').classList.toggle('open', rejectOpen); return; }
    const tr = e.target.closest('tr[data-id]');
    if (tr) { selReq = tr.dataset.id; document.querySelectorAll('#a-requests tr[data-id]').forEach((r) => r.classList.toggle('sel', r === tr)); }
    const ms = e.target.closest('.mini-slots button');
    if (ms) ms.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === ms)));
  });

  /* ---------- maps (OpenStreetMap via Leaflet) ---------- */
  const pending = {};
  function homeIcon(done) {
    return L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      html: '<div style="width:38px;height:38px;border-radius:50%;background:' + (done ? tok('--leaf') : tok('--ink')) + ';color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)">' + I(done ? 'check' : 'home', 17) + '</div>' });
  }
  function truckIcon() {
    return L.divIcon({ className: '', iconSize: [42, 42], iconAnchor: [21, 21],
      html: '<div style="width:42px;height:42px;border-radius:50%;background:' + tok('--leaf') + ';color:' + tok('--on-leaf') + ';display:grid;place-items:center;border:3px solid #fff;box-shadow:0 0 0 7px ' + tok('--leaf-glow') + ',0 3px 10px rgba(0,0,0,.35)">' + I('truck', 19) + '</div>' });
  }
  function pinIcon(color) {
    return L.divIcon({ className: '', iconSize: [30, 40], iconAnchor: [15, 38],
      html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39s13-13 13-23A13 13 0 1 0 2 16c0 10 13 23 13 23z" fill="' + tok('--leaf') + '" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>' });
  }
  function numIcon(n, st) {
    const bg = st === 'completed' ? tok('--leaf') : st === 'failed' ? tok('--red') : st === 'collection_started' ? tok('--ink') : '#fff';
    const fg = st === 'completed' ? tok('--on-leaf') : ['failed', 'collection_started'].includes(st) ? '#fff' : tok('--ink');
    return L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: '<div style="width:26px;height:26px;border-radius:50%;background:' + bg + ';color:' + fg + ';border:2px solid ' + tok('--ink') + ';display:grid;place-items:center;font:700 12px Figtree,sans-serif;box-sizing:border-box">' + n + '</div>' });
  }
  function initMap(id, setup) { pending[id] = setup; }
  function resetMap(id) { const el = $(id); if (el && el._m) { el._m.remove(); el._m = null; } }
  function mountMaps() {
    Object.keys(pending).forEach((id) => {
      const el = $(id); if (!el || el.offsetParent === null) return;
      if (el._m) { el._m.invalidateSize(); return; }
      if (!window.L) { el.innerHTML = '<div class="map-off">Map preview needs an internet connection</div>'; return; }
      const m = L.map(el, { zoomControl: false, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abc', attribution: '© OpenStreetMap contributors, HOT' }).addTo(m);
      if (m.attributionControl) m.attributionControl.setPrefix(false);
      pending[id](m, el); el._m = m;
      setTimeout(() => m.invalidateSize(), 300);
    });
  }

  RC.A = { pill, strip, legend, brand, tabbar, kTab, side, initMap, resetMap, mountMaps, pinIcon, homeIcon, tok };
  cDash(); cNew(); cTrack(); kToday(); kPickup(); kPickupMap(); aDash(); aRequests(); aRequestsMap();
  new MutationObserver(() => requestAnimationFrame(mountMaps)).observe($('c-new'), { childList: true });
  document.addEventListener('screenshown', () => requestAnimationFrame(mountMaps));
})();
