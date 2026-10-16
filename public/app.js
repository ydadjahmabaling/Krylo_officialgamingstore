/* =====================================================
   Krylo Market — frontend app
   ===================================================== */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = c => '$' + (Number(c || 0) / 100).toFixed(2);
const fmtTime = t => new Date(t).toLocaleString();

let ME = null;

/* ---------------- API helper ---------------- */
async function api(path, opts = {}) {
  const r = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ---------------- Toasts ---------------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3400);
}

/* ---------------- Modal ---------------- */
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-overlay"><div class="modal">${html}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
  return ov;
}
function closeModal() { $('#modal-root').innerHTML = ''; }
document.addEventListener('click', e => { if (e.target.closest('.modal-x')) closeModal(); });

/* =====================================================
   INTRO — "go with gaming?" → glitch → "Krylo"
   Skipped on refresh via sessionStorage.
   ===================================================== */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function scrambleTo(el, final, frames = 30) {
  return new Promise(resolve => {
    const chars = '!<>-_\\/[]{}=+*^?#01▓▒░';
    el.classList.add('glitching');
    el.setAttribute('data-text', final);
    let f = 0;
    const iv = setInterval(() => {
      f++;
      let out = '';
      for (let i = 0; i < final.length; i++) {
        out += (f / frames) * final.length > i + Math.random() * 1.6
          ? final[i]
          : chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      if (f >= frames) {
        clearInterval(iv);
        el.textContent = final;
        el.classList.remove('glitching');
        resolve();
      }
    }, 42);
  });
}

async function runIntro() {
  const intro = $('#intro');
  const seen = sessionStorage.getItem('krylo_intro_seen');
  if (seen) { intro.remove(); document.body.classList.add('ready'); return; }
  sessionStorage.setItem('krylo_intro_seen', '1');

  const l1 = $('#intro-line1'), word = $('#intro-word'), l2 = $('#intro-line2');

  // type "go with"
  for (const ch of 'go with') { l1.textContent += ch; await sleep(65); }
  await sleep(220);

  // reveal "gaming"
  word.textContent = 'gaming';
  word.setAttribute('data-text', 'gaming');
  await sleep(1000);

  // glitch: gaming → Krylo
  await scrambleTo(word, 'Krylo');
  await sleep(550);
  l2.textContent = '?';

  // glitch out to the website
  intro.classList.add('glitch-out');
  await sleep(560);
  intro.remove();
  document.body.classList.add('ready');
}

/* =====================================================
   ROUTER
   ===================================================== */
function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
  const [name, param] = parts;
  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';

  $$('#main-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (name || 'home')));

  switch (name) {
    case '':            return viewHome();
    case 'item':        return viewItem(param);
    case 'login':       return viewLogin();
    case 'register':    return viewRegister();
    case 'messages':    return viewMessages();
    case 'admin':       return viewAdmin();
    case 'contact':     return viewContact();
    default:            return viewHome();
  }
}

/* =====================================================
   HEADER / AUTH AREA
   ===================================================== */
function renderAuthArea() {
  const area = $('#auth-area');
  const isAdmin = ME && ME.role === 'admin';
  $('#nav-messages').classList.toggle('hidden', !ME);
  $('#nav-admin').classList.toggle('hidden', !isAdmin);

  if (!ME) {
    area.innerHTML = `
      <a class="btn btn-ghost btn-sm" href="#/login">Log in</a>
      <a class="btn btn-sm" href="#/register">Sign up</a>`;
    return;
  }
  area.innerHTML = `
    <div class="user-chip">
      <span class="avatar">${esc(ME.name.slice(0, 1).toUpperCase())}</span>
      <span>${esc(ME.name)}</span>
      ${isAdmin ? '<span class="role-tag">ADMIN</span>' : ''}
      <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
    </div>`;
  $('#logout-btn').onclick = async () => {
    await api('/api/logout', { method: 'POST' }).catch(() => {});
    ME = null; renderAuthArea(); refreshUnread();
    toast('Logged out');
    location.hash = '#/';
  };
}

async function refreshUnread() {
  if (!ME) { $('#nav-unread').classList.add('hidden'); return; }
  try {
    const { unread } = await api('/api/messages');
    const b = $('#nav-unread');
    b.textContent = unread;
    b.classList.toggle('hidden', !unread);
  } catch { /* ignore */ }
}

/* =====================================================
   HOME — item listing
   ===================================================== */
async function viewHome() {
  const view = $('#view');
  view.innerHTML = `<div class="loading">Loading the market…</div>`;
  let items = [];
  try { items = (await api('/api/items')).items; }
  catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }

  view.innerHTML = `
    <section class="hero">
      <img src="logo.png" alt="Krylo Market" />
      <h1>Welcome to <span>Krylo Market</span></h1>
      <p>Premium Roblox items, accounts &amp; collectibles — listed by our verified team.
         Message the seller directly to arrange your purchase.</p>
      <span class="usd-flag">ALL PRICES IN USD ($)</span>
    </section>
    <div class="toolbar">
      <input class="input" id="search" placeholder="Search items…" />
      <span class="count-note">${items.length} item${items.length === 1 ? '' : 's'} listed</span>
    </div>
    <div class="grid" id="items-grid"></div>`;

  const grid = $('#items-grid');
  const draw = q => {
    const list = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    grid.innerHTML = list.length ? list.map(i => `
      <article class="card" data-id="${i.id}">
        <div class="card-thumb"><img src="${i.thumbnail}" alt="${esc(i.name)}" loading="lazy" /></div>
        <div class="card-body">
          <div class="card-title">${esc(i.name)}</div>
          <div class="card-desc">${esc(i.description)}</div>
          <div class="card-foot">
            <span class="price">${usd(i.priceCents)} <small>USD</small></span>
            <span class="seller">by ${esc(i.sellerName)}</span>
          </div>
        </div>
      </article>`).join('')
      : `<div class="empty">No items match your search.</div>`;
    $$('.card', grid).forEach(c => c.onclick = () => location.hash = '#/item/' + c.dataset.id);
  };
  draw('');
  $('#search').oninput = e => draw(e.target.value.trim().toLowerCase());
}

/* =====================================================
   ITEM DETAIL + contact seller
   ===================================================== */
async function viewItem(id) {
  const view = $('#view');
  view.innerHTML = `<div class="loading">Loading item…</div>`;
  let data;
  try { data = await api('/api/item?id=' + encodeURIComponent(id)); }
  catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const it = data.item;

  view.innerHTML = `
    <div class="detail">
      <div class="detail-media"><img src="${it.thumbnail}" alt="${esc(it.name)}" /></div>
      <div class="detail-panel">
        <h1>${esc(it.name)}</h1>
        <div class="detail-price">${usd(it.priceCents)} <small>USD — secure checkout via seller contact</small></div>
        <div class="detail-desc">${esc(it.description)}</div>
        <div class="detail-meta">
          <div>Sold by: <b>${esc(it.sellerName)}</b></div>
          <div>Listed: <b>${fmtTime(it.createdAt)}</b></div>
          <div>Currency: <b>USD ($)</b> · Item ID: <b>${esc(it.id)}</b></div>
        </div>
        <button class="btn btn-cyan btn-block" id="contact-btn">✉ Contact Seller to Buy</button>
        <div class="form-hint" style="margin-top:10px">You'll be connected through Krylo Market's built-in message system.</div>
      </div>
    </div>`;

  $('#contact-btn').onclick = () => openCompose(it);
}

function openCompose(item, toId, prefill) {
  if (!ME) {
    toast('Please log in to contact the seller', 'err');
    location.hash = '#/login';
    return;
  }
  openModal(`
    <button class="modal-x">&times;</button>
    <h3>Contact seller</h3>
    <p class="sub">Re: <b>${esc(item.name)}</b> — ${usd(item.priceCents)} USD</p>
    <div class="field">
      <label>Your message</label>
      <textarea class="input" id="compose-body" rows="4" placeholder="Hi! I'm interested in buying…">${esc(prefill || '')}</textarea>
    </div>
    <button class="btn btn-cyan btn-block" id="compose-send">Send message</button>
  `);
  $('#compose-send').onclick = async () => {
    const body = $('#compose-body').value.trim();
    if (!body) return toast('Write a message first', 'err');
    try {
      await api('/api/messages', { method: 'POST', body: { itemId: item.id, toId, body } });
      closeModal();
      toast('Message sent! Check your inbox for replies.');
      refreshUnread();
    } catch (e) { toast(e.message, 'err'); }
  };
}

/* =====================================================
   AUTH VIEWS
   ===================================================== */
function viewLogin() {
  if (ME) { location.hash = '#/'; return; }
  $('#view').innerHTML = `
    <div class="panel">
      <img class="panel-logo" src="logo.png" alt="" />
      <h2>Log in to Krylo Market</h2>
      <p class="sub">Access your inbox and contact sellers.</p>
      <div class="form-error hidden" id="err"></div>
      <div class="field"><label>Email</label><input class="input" id="email" type="email" autocomplete="email" /></div>
      <div class="field"><label>Password</label><input class="input" id="password" type="password" autocomplete="current-password" /></div>
      <button class="btn btn-block" id="go">Log in</button>
      <p class="auth-switch">No account? <a href="#/register">Sign up</a></p>
    </div>`;
  const go = async () => {
    try {
      const { user } = await api('/api/login', { method: 'POST', body: {
        email: $('#email').value, password: $('#password').value } });
      ME = user; renderAuthArea(); refreshUnread();
      toast(`Welcome back, ${user.name}!`);
      location.hash = '#/';
    } catch (e) { const el = $('#err'); el.textContent = e.message; el.classList.remove('hidden'); }
  };
  $('#go').onclick = go;
  $('#view').addEventListener('keydown', function h(e) {
    if (e.key === 'Enter' && !ME) go();
  });
}

function viewRegister() {
  if (ME) { location.hash = '#/'; return; }
  $('#view').innerHTML = `
    <div class="panel">
      <img class="panel-logo" src="logo.png" alt="" />
      <h2>Create your account</h2>
      <p class="sub">Join Krylo Market — prices in USD, chat with sellers directly.</p>
      <div class="form-error hidden" id="err"></div>
      <div class="field"><label>Display name</label><input class="input" id="name" /></div>
      <div class="field"><label>Email</label><input class="input" id="email" type="email" autocomplete="email" /></div>
      <div class="field"><label>Password</label><input class="input" id="password" type="password" autocomplete="new-password" />
        <div class="form-hint">Minimum 6 characters.</div></div>
      <button class="btn btn-block" id="go">Sign up</button>
      <p class="auth-switch">Already registered? <a href="#/login">Log in</a></p>
    </div>`;
  $('#go').onclick = async () => {
    try {
      const { user } = await api('/api/register', { method: 'POST', body: {
        name: $('#name').value, email: $('#email').value, password: $('#password').value } });
      ME = user; renderAuthArea();
      toast(`Account created — welcome, ${user.name}!`);
      location.hash = '#/';
    } catch (e) { const el = $('#err'); el.textContent = e.message; el.classList.remove('hidden'); }
  };
}

/* =====================================================
   MESSAGES (inbox + threaded replies)
   ===================================================== */
async function viewMessages() {
  if (!ME) { toast('Log in to view messages', 'err'); location.hash = '#/login'; return; }
  const view = $('#view');
  view.innerHTML = `<div class="loading">Loading your messages…</div>`;
  let msgs;
  try { msgs = (await api('/api/messages')).messages; }
  catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }

  // group into conversations: item + the other person
  const groups = {};
  for (const m of msgs) {
    const peer = m.mine ? m.toId : m.fromId;
    const key = m.itemId + '|' + peer;
    (groups[key] ||= { itemId: m.itemId, itemTitle: m.itemTitle, itemThumbnail: m.itemThumbnail,
      peerId: peer, peerName: m.mine ? m.toName : m.fromName, msgs: [] }).msgs.push(m);
  }
  const list = Object.values(groups).sort((a, b) =>
    Math.max(...b.msgs.map(m => m.createdAt)) - Math.max(...a.msgs.map(m => m.createdAt)));

  view.innerHTML = `
    <h2 class="page-title"><img src="logo.png" alt="" /> Your Messages</h2>
    <div id="threads"></div>`;

  const wrap = $('#threads');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">No messages yet. Find an item you like and hit “Contact Seller”.</div>`;
    return;
  }

  for (const g of list) {
    g.msgs.sort((a, b) => a.createdAt - b.createdAt);
    const unread = g.msgs.filter(m => !m.mine && !m.read);
    const div = document.createElement('div');
    div.className = 'thread';
    div.innerHTML = `
      <div class="thread-head">
        ${g.itemThumbnail ? `<img src="${g.itemThumbnail}" alt="" />` : ''}
        <div>
          <div class="t">${esc(g.itemTitle)}</div>
          <div class="who">with ${esc(g.peerName)}</div>
        </div>
        ${unread.length ? `<span class="thread-unread">${unread.length} NEW</span>` : ''}
      </div>
      <div class="msg-list">
        ${g.msgs.slice(-6).map(m => `
          <div class="msg ${m.mine ? 'out' : 'in'}">${esc(m.body)}
            <span class="m-meta">${m.mine ? 'you' : esc(m.fromName)} · ${fmtTime(m.createdAt)}</span>
          </div>`).join('')}
      </div>
      <div class="reply-row">
        <input class="input" placeholder="Reply…" />
        <button class="btn btn-cyan btn-sm">Send</button>
      </div>`;
    const [input, btn] = [$('input', div), $('.btn', div)];
    const send = async () => {
      const body = input.value.trim();
      if (!body) return;
      try {
        await api('/api/messages', { method: 'POST', body: { itemId: g.itemId, toId: g.peerId, body } });
        viewMessages(); refreshUnread();
      } catch (e) { toast(e.message, 'err'); }
    };
    btn.onclick = send;
    input.onkeydown = e => { if (e.key === 'Enter') send(); };
    wrap.appendChild(div);

    if (unread.length) {
      api('/api/messages', { method: 'PATCH', body: { ids: unread.map(m => m.id) } })
        .then(() => refreshUnread()).catch(() => {});
    }
  }
}

/* =====================================================
   ADMIN — post items, manage listings
   ===================================================== */
async function viewAdmin() {
  if (!ME) { toast('Log in to access admin', 'err'); location.hash = '#/login'; return; }
  if (ME.role !== 'admin') { $('#view').innerHTML = `<div class="empty">Admin access required.</div>`; return; }

  const view = $('#view');
  view.innerHTML = `<div class="loading">Loading admin panel…</div>`;
  const [{ items }, { messages }] = await Promise.all([
    api('/api/items'), api('/api/messages')
  ]);

  view.innerHTML = `
    <h2 class="page-title"><img src="logo.png" alt="" /> Admin Panel</h2>
    <div class="stats">
      <div class="stat"><b>${items.length}</b><span>Items listed</span></div>
      <div class="stat"><b>${messages.length}</b><span>Messages</span></div>
      <div class="stat"><b>${usd(items.reduce((s, i) => s + i.priceCents, 0))}</b><span>Catalog value</span></div>
    </div>
    <div class="admin-grid">
      <div class="panel" style="margin:0; max-width:none;">
        <h2>List a new item</h2>
        <p class="sub">It appears in the store immediately. Price in USD.</p>
        <div class="form-error hidden" id="aerr"></div>
        <div class="field"><label>Item name</label><input class="input" id="f-name" placeholder="e.g. Dominus Aureus" /></div>
        <div class="field"><label>Price (USD)</label><input class="input" id="f-price" type="number" min="0.01" step="0.01" placeholder="19.99" /></div>
        <div class="field"><label>Description</label><textarea class="input" id="f-desc" rows="3" placeholder="What buyers should know…"></textarea></div>
        <div class="field">
          <label>Thumbnail</label>
          <input class="input" id="f-thumb-url" placeholder="…or paste an image URL" />
          <input type="file" id="f-thumb-file" accept="image/*" class="input" style="margin-top:8px" />
          <div class="form-hint">Upload an image (max ~500KB) or paste a URL. Preview:</div>
          <img class="thumb-preview hidden" id="f-thumb-preview" alt="" />
        </div>
        <button class="btn btn-block" id="f-add">Publish item</button>
      </div>
      <div class="panel" style="margin:0; max-width:none;">
        <h2>Listed items</h2>
        <p class="sub">Delete removes the item and its messages.</p>
        <table class="items-table">
          <thead><tr><th></th><th>Name</th><th>Price</th><th></th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td><img src="${i.thumbnail}" alt="" /></td>
                <td>${esc(i.name)}</td>
                <td>${usd(i.priceCents)}</td>
                <td><button class="btn btn-danger btn-sm" data-del="${i.id}">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  /* thumbnail: URL or file upload */
  let thumbData = '';
  const preview = $('#f-thumb-preview');
  const showPreview = src => { thumbData = src; preview.src = src; preview.classList.remove('hidden'); };
  $('#f-thumb-url').oninput = e => { if (e.target.value.trim()) showPreview(e.target.value.trim()); };
  $('#f-thumb-file').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 600 * 1024) return toast('Image too large — max 500KB', 'err');
    const r = new FileReader();
    r.onload = () => showPreview(r.result);
    r.readAsDataURL(f);
  };

  $('#f-add').onclick = async () => {
    const errEl = $('#aerr'); errEl.classList.add('hidden');
    const name = $('#f-name').value.trim();
    const priceVal = $('#f-price').value;
    const description = $('#f-desc').value.trim();
    if (!thumbData) return toast('Add a thumbnail (upload or URL)', 'err');
    const priceCents = Math.round(parseFloat(priceVal) * 100);
    if (!name || !Number.isFinite(priceCents) || priceCents < 1)
      return toast('Enter a name and a valid price', 'err');
    try {
      await api('/api/items', { method: 'POST', body: { name, description, priceCents, thumbnail: thumbData } });
      toast(`“${name}” published to the store!`);
      viewAdmin();
    } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
  };

  $$('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Delete this item and its messages?')) return;
    try { await api('/api/item?id=' + b.dataset.del, { method: 'DELETE' }); toast('Item deleted'); viewAdmin(); }
    catch (e) { toast(e.message, 'err'); }
  });
}

/* =====================================================
   CONTACT PAGE
   ===================================================== */
function viewContact() {
  $('#view').innerHTML = `
    <h2 class="page-title"><img src="logo.png" alt="" /> Contact Krylo Market</h2>
    <div class="contact-grid">
      <div class="contact-card">
        <h3>💬 Message system</h3>
        <p>The fastest way to reach us: open any item and press “Contact Seller”.
           All negotiation and delivery details happen inside your Krylo Market inbox.</p>
      </div>
      <div class="contact-card">
        <h3>✉ Email</h3>
        <p>Support &amp; order issues:<br><b>admin@krylo.market</b><br>We reply within 24 hours.</p>
      </div>
      <div class="contact-card">
        <h3>💵 Payments</h3>
        <p>All listings are priced in <b>USD ($)</b>. Payment instructions are sent by the
           seller through the built-in message system after you contact them.</p>
      </div>
    </div>`;
}

/* =====================================================
   BOOT
   ===================================================== */
(async function boot() {
  try { ME = (await api('/api/me')).user; } catch { ME = null; }
  renderAuthArea();
  refreshUnread();
  window.addEventListener('hashchange', route);
  await runIntro();
  route();
})();
