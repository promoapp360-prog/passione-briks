/* Passione Briks — pagina pubblica e Area Alessio */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imgUrl = (id) => '/img/' + encodeURIComponent(id);
  const fmt = (n) => Number(n || 0).toLocaleString('it-IT');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  let token = store.get('pb_token') || '';

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-admin-token'] = token;
    const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Connessione non riuscita. Controlla la rete e riprova.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const CAT = { 'treni-storici': 'Treno storico', 'treni-lego': 'Treno LEGO', 'altro': 'Altra costruzione' };
  const STATUS = { 'finito': 'Finito', 'in-costruzione': 'In costruzione', 'idea': 'Idea' };

  /* ---------------- Pezzi ---------------- */
  function sidePart({ w, plates, studs = true, studsAt }) {
    const W = 200, base = 64, u = 20, ph = 8;
    const x0 = (W - w * u) / 2, h = plates * ph, y = base - h;
    let s = `<rect x="${x0}" y="${y}" width="${w * u}" height="${h}" rx="2" class="p-fill"/>`;
    const at = studsAt || (studs ? [...Array(w).keys()] : []);
    for (const i of at) s += `<rect x="${x0 + i * u + 4}" y="${y - 5}" width="12" height="5" rx="1.5" class="p-fill"/>`;
    return s;
  }
  const PARTS = [
    { name: 'Mattoncino 2×4', code: '3001', svg: sidePart({ w: 4, plates: 3 }), text: 'Il pezzo classico. Lo uso per le fiancate dei vagoni e per i muri delle stazioni.' },
    { name: 'Piastra 2×4', code: '3020', svg: sidePart({ w: 4, plates: 1 }), text: 'Alta un terzo di un mattoncino. Due piastre sovrapposte fanno un telaio robusto.' },
    { name: 'Tegola liscia 1×4', code: '2431', svg: sidePart({ w: 4, plates: 1, studs: false }), text: 'Senza stud: rende lisci i tetti delle carrozze e i pavimenti.' },
    { name: 'Pendenza 45° 2×2', code: '3039', svg: (() => { const x = 60; return `<polygon points="${x},64 ${x + 80},64 ${x + 80},40 ${x + 40},40 ${x},64" class="p-fill"/><rect x="${x + 44}" y="35" width="12" height="5" rx="1.5" class="p-fill"/><rect x="${x + 64}" y="35" width="12" height="5" rx="1.5" class="p-fill"/>`; })(), text: 'Per i tetti curvi e il muso delle locomotive diesel.' },
    { name: 'Piastra jumper 1×2', code: '15573', svg: (() => { const x = 80; return `<rect x="${x}" y="56" width="40" height="8" rx="2" class="p-fill"/><rect x="${x + 14}" y="51" width="12" height="5" rx="1.5" class="p-fill"/>`; })(), text: 'Un solo stud al centro: sposta un pezzo di mezzo stud.' },
    { name: 'Staffa 1×2 – 1×2', code: '99781', svg: (() => { const x = 76; return `<rect x="${x}" y="56" width="40" height="8" rx="2" class="p-fill"/><rect x="${x + 4}" y="51" width="12" height="5" rx="1.5" class="p-fill"/><rect x="${x + 24}" y="51" width="12" height="5" rx="1.5" class="p-fill"/><rect x="${x + 40}" y="24" width="8" height="40" rx="2" class="p-fill"/><rect x="${x + 48}" y="28" width="5" height="12" rx="1.5" class="p-fill"/><rect x="${x + 48}" y="48" width="5" height="12" rx="1.5" class="p-fill"/>`; })(), photo: '/pezzi/staffa-1x2.webp', alt: 'Staffa 1×2 blu: base piatta e parete verticale con gli stud girati di lato', text: 'Fa girare gli stud di lato: sotto si aggancia come una piastra, sulla parete in piedi puoi attaccare altri pezzi in orizzontale. È la base della tecnica SNOT. Nella foto, la staffa di Alessio.' },
    { name: 'Trave Technic 1×7', code: '32524', svg: (() => { let s = `<rect x="16" y="22" width="168" height="26" rx="13" class="p-fill-2"/>`; for (let i = 0; i < 7; i++) s += `<circle cx="${29 + i * 23.7}" cy="35" r="7" class="p-hole"/>`; return s; })(), text: 'Con i fori per perni e assi. Serve per i telai motorizzati e i carrelli.' },
    { name: 'Ruote da treno', code: 'carrello', svg: (() => `<rect x="44" y="18" width="112" height="10" rx="2" class="p-fill"/><rect x="60" y="28" width="80" height="8" rx="2" class="p-dark"/><circle cx="72" cy="48" r="16" class="p-dark"/><circle cx="72" cy="48" r="6" class="p-fill"/><circle cx="128" cy="48" r="16" class="p-dark"/><circle cx="128" cy="48" r="6" class="p-fill"/>`)(), text: 'Ruote con il bordino che le tiene sulle rotaie, montate su un carrello che gira in curva.' },
  ];
  function renderParts() {
    $('#partsGrid').innerHTML = PARTS.map((p) => `
      <article class="part">
        ${p.photo ? `<img class="part-photo" src="${p.photo}" alt="${esc(p.alt || p.name)}" loading="lazy">` : `<svg viewBox="0 0 200 70" aria-hidden="true">${p.svg}</svg>`}
        <h4>${esc(p.name)}</h4>
        <span class="code">Codice pezzo: ${esc(p.code)}</span>
        <p>${esc(p.text)}</p>
      </article>`).join('');
  }

  /* ---------------- Timelines ---------------- */
  const TL_REAL = [
    ['1825', 'Locomotion No. 1', 'Apre in Inghilterra la Stockton–Darlington, la prima ferrovia pubblica con locomotive a vapore.'],
    ['1829', 'Rocket di Stephenson', 'Vince la gara di Rainhill e diventa il modello per le locomotive che vengono dopo.'],
    ['1839', 'Napoli–Portici', 'La prima ferrovia d’Italia, con la locomotiva Bayard.'],
    ['1939', 'ETR 200', 'L’elettrotreno italiano tocca 203 km/h tra Firenze e Milano: record mondiale per l’epoca.'],
    ['1953', 'ETR 300 Settebello', 'Il treno di lusso con il salottino panoramico davanti, al posto della cabina.'],
    ['1964', 'Shinkansen', 'In Giappone parte il primo treno ad alta velocità per i passeggeri.'],
    ['1988', 'ETR 450 Pendolino', 'Si inclina in curva per andare più veloce sulle linee tortuose.'],
    ['2015', 'Frecciarossa 1000', 'Entra in servizio il treno italiano progettato per i 360 km/h.'],
  ];
  const TL_LEGO = [
    ['1966', 'I primi treni', 'Locomotive blu con un motore a pile da 4,5 V che corrono su binari blu.'],
    ['1969', 'Sistema 12 V', 'Il treno prende la corrente da un trasformatore collegato ai binari.'],
    ['1980', 'Binari grigi', 'Arrivano scambi e segnali che si comandano a distanza.'],
    ['1991', 'Sistema 9 V', 'La corrente passa nelle rotaie di metallo: il motore la prende dalle ruote.'],
    ['2006', 'Treni RC', 'Binari di plastica e telecomando a infrarossi, con le pile dentro il treno.'],
    ['2018', 'Powered Up', 'Si guidano con il Bluetooth, anche dal tablet o dal telefono.'],
  ];
  const renderTl = (el, list) => { el.innerHTML = list.map(([y, t, d]) => `<li><span class="year">${y}</span><div class="ev"><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join(''); };

  /* ---------------- Come si monta ---------------- */
  const HOW = [
    ['Studio il treno vero', 'Cerco foto da tutti i lati e le misure: lunghezza, larghezza, quante porte e finestrini ha.', 'foto + misure'],
    ['Scelgo la larghezza', '6 stud come i treni LEGO City, oppure 8 per avere più dettagli. Da qui viene la scala.', '6 o 8 stud'],
    ['Monto il telaio', 'Piastre lunghe sovrapposte e sfalsate, così il treno non si piega. Sotto aggancio i carrelli con le ruote.', 'piastre + carrelli'],
    ['Alzo le fiancate', 'Mattoncini e finestrini. Lascio lo spazio per le porte e controllo che i lati siano uguali.', 'mattoncini + finestre'],
    ['Tetto e dettagli', 'Tegole lisce e pendenze per il tetto, poi fanali, maniglie, numeri e scritte.', 'tegole + pendenze'],
    ['Prova sul binario', 'Faccio girare il treno su curve e scambi. Se tocca o deraglia, sposto i carrelli o accorcio gli sbalzi.', 'curve R40'],
  ];
  const TECH = [
    ['SNOT', 'Stud di lato', 'Con staffe e mattoncini speciali gli stud guardano di lato. Così si attaccano scritte, strisce colorate e musi lisci.'],
    ['Offset', 'Mezzo stud', 'La piastra jumper sposta i pezzi di mezzo stud: utile per centrare un fanale o una porta.'],
    ['Telaio', 'Piastre sfalsate', 'Due strati di piastre con le giunture in punti diversi rendono il telaio rigido come un pezzo unico.'],
    ['Curve', 'Carrelli e sbalzi', 'Più il vagone sporge oltre i carrelli, più in curva esce dal binario. Meglio sbalzi corti e carrelli vicini alle estremità.'],
    ['Ordine', 'Pezzi divisi', 'Prima di iniziare divido i pezzi per forma, poi per colore. Si monta più veloce e si perde meno tempo a cercare.'],
  ];
  function renderHow() {
    $('#howSteps').innerHTML = HOW.map(([t, d, p]) => `<li class="step"><div><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="parts-box">${esc(p)}</span></div></li>`).join('');
    $('#techGrid').innerHTML = TECH.map(([a, t, d]) => `<article class="tech"><span class="abbr">${esc(a)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('');
  }

  /* ---------------- Calcolatore ---------------- */
  function calc() {
    const len = parseFloat($('#calcLen').value);
    const wid = parseFloat($('#calcWid').value);
    const studs = parseInt(($('input[name="calcStuds"]:checked') || {}).value || '6', 10);
    if (!(len > 0) || !(wid > 0)) { $('#outScale').textContent = '—'; $('#outStuds').textContent = '—'; $('#outCm').textContent = '—'; return; }
    const scale = (wid * 1000) / (studs * 8);
    const modelMm = (len * 1000) / scale;
    $('#outScale').textContent = '1:' + Math.round(scale);
    $('#outStuds').textContent = Math.round(modelMm / 8) + ' stud';
    $('#outCm').textContent = (modelMm / 10).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' cm';
  }

  /* ---------------- Costruzioni ---------------- */
  const EXAMPLE = {
    id: 'esempio', example: true, title: 'Locomotiva a vapore', category: 'treni-storici', status: 'in-costruzione',
    realTrain: 'Una locomotiva a vapore FS', pieces: 0, hours: 0, width: 6, cover: null, gallery: [],
    description: 'Questa è una scheda di esempio per vedere come appare una costruzione. Alessio la sostituisce con le sue foto e i suoi passaggi.',
    steps: [
      { text: 'Telaio: due piastre 2×16 sovrapposte e sfalsate.', image: null },
      { text: 'Ruote motrici montate sotto il telaio, la caldaia sopra.', image: null },
      { text: 'Cabina con finestrini e tetto di tegole lisce.', image: null },
    ],
  };
  let projects = [];
  let filter = 'tutte';

  function cardHtml(p) {
    const media = p.cover ? `<img src="${imgUrl(p.cover)}" alt="" loading="lazy">` : '<div class="placeholder-studs"></div>';
    const meta = [];
    if (p.pieces) meta.push(fmt(p.pieces) + ' pezzi');
    if (p.hours) meta.push(fmt(p.hours) + ' h');
    if (p.width) meta.push(p.width + ' stud');
    return `
      <button class="card" type="button" data-id="${esc(p.id)}">
        <div class="card-media">${media}
          <div class="tags">
            ${p.example ? '<span class="tag tag-example">Esempio</span>' : ''}
            <span class="tag">${esc(CAT[p.category] || '')}</span>
            ${p.status !== 'finito' ? `<span class="tag tag-status-${esc(p.status)}">${esc(STATUS[p.status] || '')}</span>` : ''}
          </div>
        </div>
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          ${p.realTrain ? `<p class="small">Ispirata a: ${esc(p.realTrain)}</p>` : ''}
          ${meta.length ? `<div class="card-meta">${meta.map(esc).join('<span aria-hidden="true">·</span>')}</div>` : ''}
        </div>
      </button>`;
  }

  // Foto della home: quella caricata da Alessio, altrimenti public/foto-home.webp se esiste
  let staticHomeOk = null;
  function renderHero() {
    const shot = $('#homeShot'), img = $('#homeShotImg');
    const src = collection.homePhoto ? imgUrl(collection.homePhoto) : (staticHomeOk === false ? '' : '/foto-home.webp');
    if (src) {
      if (img.getAttribute('src') !== src) {
        img.onload = () => { if (!collection.homePhoto) staticHomeOk = true; shot.hidden = false; renderHero(); };
        img.onerror = () => { if (!collection.homePhoto) staticHomeOk = false; shot.hidden = true; renderHero(); };
        img.setAttribute('src', src);
      }
      const own = !!collection.homePhoto;
      $('#homeShotCap').textContent = own ? (collection.homeCaption || 'Il mio Orient Express LEGO') : 'The Orient Express Train, set 21344: il treno LEGO di Alessio.';
      $('#homeShotCredit').textContent = own ? '' : 'Immagine © LEGO Group.';
      img.alt = own ? (collection.homeCaption || 'Il treno LEGO di Alessio') : 'Il set LEGO The Orient Express Train: locomotiva a vapore blu e nera con tender e due carrozze blu e oro';
      shot.classList.toggle('is-own', own);
    } else { shot.hidden = true; }
    const showingShot = !shot.hidden;
    const f = !showingShot && projects.find((p) => p.featured && p.cover);
    $('#heroPhoto').hidden = !f;
    if (!f) return;
    $('#heroPhotoImg').src = imgUrl(f.cover);
    $('#heroPhotoImg').alt = 'Foto di ' + f.title;
    $('#heroPhotoTitle').textContent = f.title;
    const meta = [CAT[f.category]];
    if (f.pieces) meta.push(fmt(f.pieces) + ' pezzi');
    if (f.realTrain) meta.push(f.realTrain);
    $('#heroPhotoMeta').textContent = meta.join(' · ');
    $('#heroPhoto').dataset.id = f.id;
  }

  function renderProjects() {
    renderHero();
    const shown = projects.filter((p) => filter === 'tutte' || p.category === filter);
    $('#projectGrid').innerHTML = shown.length ? shown.map(cardHtml).join('')
      : projects.length ? `<p class="msg-empty">Ancora nessuna costruzione in questa categoria.</p>`
      : `<div class="empty-build"><b>Qui arriveranno le costruzioni di Alessio</b><span>Ogni treno che monta avrà le sue foto, i pezzi usati e i passaggi per rifarlo. Il primo è in arrivo.</span></div>`;
    const real = projects;
    animateNum($('#statProjects'), real.length);
    animateNum($('#statPieces'), real.reduce((a, p) => a + (p.pieces || 0), 0));
    animateNum($('#statHours'), real.reduce((a, p) => a + (p.hours || 0), 0));
  }

  function animateNum(el, to) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || to < 10) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / d); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  function openProject(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const photos = [p.cover, ...(p.gallery || [])].filter(Boolean);
    const spec = [];
    if (p.pieces) spec.push(['Pezzi', fmt(p.pieces)]);
    if (p.hours) spec.push(['Ore', fmt(p.hours)]);
    if (p.width) spec.push(['Larghezza', p.width + ' stud']);
    spec.push(['Stato', STATUS[p.status] || '']);
    $('#projectDetail').innerHTML = `
      <div class="detail-head">
        <p class="eyebrow">${esc(CAT[p.category] || '')}${p.example ? ' · esempio' : ''}</p>
        <h2 id="pdTitle">${esc(p.title)}</h2>
        ${p.realTrain ? `<p class="small">Ispirata a: ${esc(p.realTrain)}</p>` : ''}
      </div>
      <div class="detail-hero">${photos.length ? `<img id="pdMain" src="${imgUrl(photos[0])}" alt="Foto di ${esc(p.title)}">` : '<div class="placeholder-studs"></div>'}</div>
      ${photos.length > 1 ? `<div class="thumbs">${photos.map((ph, i) => `<button type="button" data-ph="${esc(ph)}" class="${i === 0 ? 'is-on' : ''}" aria-label="Foto ${i + 1}"><img src="${imgUrl(ph)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      <div class="spec">${spec.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      ${p.description ? `<p class="detail-desc">${esc(p.description)}</p>` : ''}
      ${p.steps && p.steps.length ? `<h3>Come l’ho montata</h3><ol class="booklet">${p.steps.map((s) => `<li><div class="bs">${s.text ? `<p>${esc(s.text)}</p>` : ''}${s.image ? `<img src="${imgUrl(s.image)}" alt="" loading="lazy">` : ''}</div></li>`).join('')}</ol>` : ''}
    `;
    $$('.thumbs button', $('#projectDetail')).forEach((b) => b.addEventListener('click', () => {
      $('#pdMain').src = imgUrl(b.dataset.ph);
      $$('.thumbs button', $('#projectDetail')).forEach((x) => x.classList.toggle('is-on', x === b));
    }));
    $('#projectDialog').showModal();
  }

  async function loadProjects() {
    try { projects = await api('/api/projects'); } catch { projects = []; }
    renderProjects();
    if (!$('#adminPanel').hidden) renderAdminProjects();
  }

  /* ---------------- Messaggi ---------------- */
  const when = (iso) => { try { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
  async function loadMessages() {
    const el = $('#msgList');
    try {
      const list = await api('/api/messages');
      el.innerHTML = list.length
        ? list.map((m) => `<article class="ticket"><span class="who">${esc(m.name)}</span><span class="when">${esc(when(m.createdAt))}</span><p>${esc(m.text)}</p></article>`).join('')
        : '<p class="msg-empty">Ancora nessun messaggio. Scrivi tu il primo!</p>';
    } catch { el.innerHTML = '<p class="msg-empty">I messaggi non si sono caricati. Ricarica la pagina tra poco.</p>'; }
  }

  /* ---------------- Area Alessio ---------------- */
  let draft = null;     // costruzione in modifica
  let editingId = null;

  async function openAdmin() {
    const dlg = $('#adminDialog');
    let enabled = true;
    try { enabled = (await api('/api/status')).adminEnabled; } catch {}
    if (!enabled) {
      $('#loginForm').hidden = false; $('#adminPanel').hidden = true;
      $('#loginStatus').className = 'form-status err';
      $('#loginStatus').textContent = 'L’area non è ancora attiva: va impostato il PIN (ADMIN_PIN) nei Secrets di Replit.';
    } else if (token) {
      showPanel();
    } else {
      $('#loginForm').hidden = false; $('#adminPanel').hidden = true; $('#loginStatus').textContent = '';
    }
    dlg.showModal();
    if (!$('#loginForm').hidden) setTimeout(() => $('#pinInput').focus(), 50);
  }

  function renderHomeAdmin() {
    $('#homeSlot').innerHTML = collection.homePhoto ? `<img src="${imgUrl(collection.homePhoto)}" alt="Foto della home">` : 'Nessuna foto';
    $('#hRemove').hidden = !collection.homePhoto;
    if (document.activeElement !== $('#hCap')) $('#hCap').value = collection.homeCaption || '';
  }
  async function saveHome(msg) {
    const st = $('#homeStatus');
    try {
      collection = { ...collection, ...(await api('/api/collection', { method: 'PUT', body: JSON.stringify(collection) })) };
      st.className = 'form-status ok'; st.textContent = msg;
    } catch (e) { if (!handleAuthError(e)) { st.className = 'form-status err'; st.textContent = e.message; } }
    renderHomeAdmin(); renderHero();
  }

  function showPanel() {
    $('#loginForm').hidden = true; $('#adminPanel').hidden = false;
    renderAdminProjects(); loadAdminMessages(); renderCatalog(); renderHomeAdmin(); loadPearls(); if (!pearlEdit) resetPearlForm();
  }

  function logout() { token = ''; store.del('pb_token'); $('#adminPanel').hidden = true; $('#loginForm').hidden = false; $('#pinInput').value = ''; renderCatalog(); loadPearls(); }

  function handleAuthError(e) { if (e.status === 401) { logout(); $('#loginStatus').className = 'form-status err'; $('#loginStatus').textContent = 'Sessione scaduta: scrivi di nuovo il PIN.'; return true; } return false; }

  function renderAdminProjects() {
    const ul = $('#adminProjects');
    if (!projects.length) { ul.innerHTML = '<li class="hint">Nessuna costruzione pubblicata. Premi “Nuova costruzione” per aggiungere la prima.</li>'; return; }
    ul.innerHTML = projects.map((p) => `
      <li class="admin-item" data-id="${esc(p.id)}">
        ${p.cover ? `<img class="thumb" src="${imgUrl(p.cover)}" alt="">` : '<span class="thumb"></span>'}
        <div class="grow"><b>${esc(p.title)}</b><span>${esc(CAT[p.category])} · ${esc(STATUS[p.status])}${p.featured ? ' · in home' : ''}</span></div>
        <div class="actions">
          <button class="btn btn-ghost" type="button" data-act="edit">Modifica</button>
          <button class="btn btn-danger" type="button" data-act="del">Elimina</button>
        </div>
      </li>`).join('');
  }

  function askConfirm(container, label, onYes) {
    const actions = container.querySelector('.actions');
    const old = actions.innerHTML;
    actions.innerHTML = `<span class="confirm-row">${esc(label)} <button class="btn btn-danger" type="button" data-yes>Sì, elimina</button><button class="btn btn-ghost" type="button" data-no>No</button></span>`;
    actions.querySelector('[data-no]').onclick = () => { actions.innerHTML = old; };
    actions.querySelector('[data-yes]').onclick = onYes;
  }

  function startEdit(p) {
    editingId = p ? p.id : null;
    draft = p ? JSON.parse(JSON.stringify(p)) : { featured: false, title: '', category: 'treni-storici', status: 'finito', realTrain: '', description: '', pieces: null, hours: null, width: 6, cover: null, gallery: [], steps: [{ text: '', image: null }] };
    $('#pformTitle').textContent = p ? 'Modifica: ' + p.title : 'Nuova costruzione';
    $('#saveProjectBtn').textContent = p ? 'Salva le modifiche' : 'Pubblica';
    $('#fTitle').value = draft.title || '';
    $('#fCategory').value = draft.category;
    $('#fStatus').value = draft.status;
    $('#fReal').value = draft.realTrain || '';
    $('#fDesc').value = draft.description || '';
    $('#fPieces').value = draft.pieces ?? '';
    $('#fHours').value = draft.hours ?? '';
    $('#fWidth').value = draft.width ?? '';
    $('#fFeatured').checked = !!draft.featured;
    $('#projectStatus').textContent = '';
    renderDraftPhotos(); renderDraftSteps();
    $('#projectForm').hidden = false;
    $('#projectForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#fTitle').focus({ preventScroll: true });
  }

  function syncDraftFields() {
    draft.title = $('#fTitle').value; draft.category = $('#fCategory').value; draft.status = $('#fStatus').value;
    draft.realTrain = $('#fReal').value; draft.description = $('#fDesc').value;
    draft.pieces = $('#fPieces').value; draft.hours = $('#fHours').value; draft.width = $('#fWidth').value; draft.featured = $('#fFeatured').checked;
    $$('#stepsEdit textarea').forEach((t, i) => { if (draft.steps[i]) draft.steps[i].text = t.value; });
  }

  function renderDraftPhotos() {
    $('#coverSlot').innerHTML = draft.cover ? `<img src="${imgUrl(draft.cover)}" alt="Foto principale">` : 'Nessuna foto';
    $('#galleryEdit').innerHTML = draft.gallery.map((g, i) => `<div class="gthumb"><img src="${imgUrl(g)}" alt=""><button type="button" data-rm-g="${i}" aria-label="Togli questa foto">×</button></div>`).join('');
  }

  function renderDraftSteps() {
    $('#stepsEdit').innerHTML = draft.steps.map((s, i) => `
      <li>
        <label class="visually-hidden" for="step${i}">Passaggio ${i + 1}</label>
        <textarea id="step${i}" rows="2" maxlength="1500" placeholder="Cosa si fa in questo passaggio?">${esc(s.text)}</textarea>
        <div class="step-row">
          ${s.image ? `<div class="step-photo"><img src="${imgUrl(s.image)}" alt=""><button type="button" data-rm-s="${i}" aria-label="Togli la foto del passaggio">×</button></div>` : ''}
          <label class="btn btn-ghost file-btn" for="stepFile${i}">${s.image ? 'Cambia foto' : 'Aggiungi foto'}</label>
          <input id="stepFile${i}" type="file" accept="image/*" class="visually-hidden" data-step-file="${i}">
          ${i > 0 ? `<button class="btn btn-ghost" type="button" data-up="${i}" aria-label="Sposta su">↑</button>` : ''}
          <button class="btn btn-ghost" type="button" data-del-step="${i}">Togli passaggio</button>
        </div>
      </li>`).join('');
  }

  function resizeImage(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Questa foto non si apre. Prova con una foto JPG o PNG.')); };
      img.src = url;
    });
  }

  async function uploadFile(file) {
    const dataUrl = await resizeImage(file);
    const { id } = await api('/api/images', { method: 'POST', body: JSON.stringify({ dataUrl }) });
    return id;
  }

  async function withUpload(files, onId) {
    const st = $('#projectStatus');
    st.className = 'form-status'; st.textContent = files.length > 1 ? `Carico ${files.length} foto…` : 'Carico la foto…';
    $('#projectForm').classList.add('uploading');
    try {
      for (const f of files) onId(await uploadFile(f));
      st.className = 'form-status ok'; st.textContent = 'Foto caricata.';
    } catch (e) {
      if (!handleAuthError(e)) { st.className = 'form-status err'; st.textContent = e.message; }
    } finally { $('#projectForm').classList.remove('uploading'); }
  }

  async function saveProject(ev) {
    ev.preventDefault();
    syncDraftFields();
    const st = $('#projectStatus');
    if (!draft.title.trim()) { st.className = 'form-status err'; st.textContent = 'Dai un nome alla costruzione.'; $('#fTitle').focus(); return; }
    if (draft.featured && !draft.cover) { st.className = 'form-status err'; st.textContent = 'Per metterla in home serve la foto principale.'; return; }
    const btn = $('#saveProjectBtn'); btn.disabled = true;
    st.className = 'form-status'; st.textContent = 'Salvo…';
    try {
      const body = JSON.stringify(draft);
      if (editingId) await api('/api/projects/' + encodeURIComponent(editingId), { method: 'PUT', body });
      else await api('/api/projects', { method: 'POST', body });
      $('#projectForm').hidden = true;
      await loadProjects();
      const first = $('#adminProjects .admin-item');
      if (first) first.scrollIntoView({ block: 'nearest' });
    } catch (e) {
      if (!handleAuthError(e)) { st.className = 'form-status err'; st.textContent = e.message; }
    } finally { btn.disabled = false; }
  }

  async function loadAdminMessages() {
    const ul = $('#adminMessages');
    try {
      const list = await api('/api/messages?all=1');
      const pending = list.filter((m) => !m.approved).length;
      $('#pendingBadge').hidden = !pending; $('#pendingBadge').textContent = pending;
      ul.innerHTML = list.length ? list.map((m) => `
        <li class="admin-item" data-id="${esc(m.id)}">
          <div class="grow"><b>${esc(m.name)} · <span>${esc(when(m.createdAt))}</span></b><span>${esc(m.text)}</span></div>
          <div class="actions">
            ${m.approved ? '<button class="btn btn-ghost" type="button" data-act="hide">Nascondi</button>' : '<button class="btn btn-primary" type="button" data-act="show">Mostra sul sito</button>'}
            <button class="btn btn-danger" type="button" data-act="del">Elimina</button>
          </div>
        </li>`).join('') : '<li class="hint">Nessun messaggio per ora.</li>';
    } catch (e) { if (!handleAuthError(e)) ul.innerHTML = `<li class="hint">${esc(e.message)}</li>`; }
  }

  /* ---------------- Perle tecniche ---------------- */
  let pearls = [];
  let pearlEdit = null; // { id, title, text, image, photo } in modifica
  const pearlSrc = (pl) => (pl.image ? imgUrl(pl.image) : pl.photo || '');

  function renderPearls() {
    const ol = $('#perleList');
    const pub = pearls.filter((x) => x.published !== false);
    ol.innerHTML = pub.length ? pub.map((pl, i) => `
      <li class="perla">
        ${pearlSrc(pl) ? `<div class="perla-photo"><img src="${esc(pearlSrc(pl))}" alt="${esc(pl.title)}" loading="lazy"></div>` : ''}
        <div class="perla-body">
          <span class="perla-num">Perla n. ${i + 1}</span>
          <h3>${esc(pl.title)}</h3>
          <p>${esc(pl.text)}</p>
        </div>
      </li>`).join('') : '<li class="hint">Le perle arrivano presto.</li>';
    $('#perle').hidden = !pub.length;
  }

  async function loadPearls() {
    try { pearls = await api(token ? '/api/pearls?all=1' : '/api/pearls'); }
    catch { try { pearls = await api('/api/pearls'); } catch { pearls = []; } }
    renderPearls(); renderAdminPearls();
  }

  function renderAdminPearls() {
    const ul = $('#adminPearls'); if (!ul) return;
    ul.innerHTML = pearls.map((pl, i) => `
      <li class="admin-item" data-id="${esc(pl.id)}">
        ${pearlSrc(pl) ? `<img class="thumb" src="${esc(pearlSrc(pl))}" alt="">` : '<span class="thumb"></span>'}
        <div class="grow"><b>${i + 1}. ${esc(pl.title)} ${pl.published === false ? '<span class="draft">Bozza</span>' : '<span class="live">Online</span>'}</b><span>${esc(pl.text.slice(0, 90))}${pl.text.length > 90 ? '…' : ''}</span></div>
        <div class="actions">
          ${i > 0 ? '<button class="btn btn-ghost" type="button" data-pact="up" aria-label="Sposta su">↑</button>' : ''}
          <button class="btn btn-ghost" type="button" data-pact="toggle">${pl.published === false ? 'Pubblica' : 'Nascondi'}</button>
          <button class="btn btn-ghost" type="button" data-pact="edit">Modifica</button>
          <button class="btn btn-danger" type="button" data-pact="del">Elimina</button>
        </div>
      </li>`).join('') || '<li class="hint">Nessuna perla ancora.</li>';
  }

  function resetPearlForm() {
    pearlEdit = { id: '', title: '', text: '', image: null, photo: null, published: true };
    $('#plTitle').value = ''; $('#plText').value = ''; $('#plPublished').checked = true;
    $('#pearlFormTitle').textContent = 'Nuova perla';
    $('#plSave').textContent = 'Salva la perla';
    $('#plCancel').hidden = true;
    renderPearlSlot();
  }
  function renderPearlSlot() {
    const src = pearlEdit && pearlSrc(pearlEdit);
    $('#plSlot').innerHTML = src ? `<img src="${esc(src)}" alt="">` : 'Nessuna foto';
  }

  async function savePearls(list, okMsg) {
    const st = $('#plStatus');
    try {
      pearls = await api('/api/pearls', { method: 'PUT', body: JSON.stringify(list) });
      st.className = 'form-status ok'; st.textContent = okMsg;
      renderPearls(); renderAdminPearls();
      return true;
    } catch (e) { if (!handleAuthError(e)) { st.className = 'form-status err'; st.textContent = e.message; } return false; }
  }

  /* ---------------- Catalogo di tutti i treni LEGO ---------------- */
  const ERAS = [
    { id: 'blu', from: 1964, to: 1979, name: 'Era blu', text: 'Binari blu, treni a pile da 4,5 V e, dal 1969, i primi treni a 12 V con il trasformatore.' },
    { id: 'grigia', from: 1980, to: 1990, name: 'Era grigia', text: 'Binari grigi, treni a 12 V con scambi e segnali comandati a distanza, e le prime monorotaie.' },
    { id: '9v', from: 1991, to: 2005, name: '9 Volt', text: 'La corrente passa nelle rotaie di metallo. È l’epoca del Metroliner, del Coccodrillo e dei Santa Fe.' },
    { id: 'pf', from: 2006, to: 2017, name: 'Telecomando e Power Functions', text: 'Binari di plastica, pile dentro il treno e telecomando: prima a infrarossi, poi con il sistema Power Functions.' },
    { id: 'pu', from: 2018, to: 2100, name: 'Powered Up', text: 'Treni guidati via Bluetooth anche dal tablet, e grandi modelli da collezione come il Coccodrillo e l’Orient Express.' },
  ];
  const SYS = {
    '4.5V': ['4,5 V', 'Motore a pile da 4,5 V dentro il treno.'],
    '12V': ['12 V', 'Corrente da un trasformatore collegato ai binari.'],
    '9V': ['9 V', 'Corrente nelle rotaie di metallo, presa dalle ruote.'],
    'RC': ['IR', 'Telecomando a infrarossi e pile nel treno.'],
    'PF': ['Power Functions', 'Motore e telecomando Power Functions.'],
    'PU': ['Powered Up', 'Motore con Bluetooth, si guida anche dall’app.'],
    'spinta': ['Senza motore', 'Si spinge a mano o è da esposizione.'],
    'monorotaia': ['Monorotaia', 'Treno su una sola rotaia, con motore.'],
    'batteria': ['Motore a pile', 'Motore a batteria incluso nella locomotiva.'],
    'nd': ['Da verificare', 'Set recente: alimentazione non ancora confermata dalle fonti.'],
  };
  const KIND = { treno: 'Treno', vagone: 'Vagone', scenario: 'Stazione / scenario' };
  let catalog = [];
  let collection = { owned: [], wish: [], home: '21344' };
  let catEra = 'blu', catKind = 'tutti', catQuery = '';

  // Treno LEGO in evidenza nella home (scelto da Alessio nel catalogo, di base l'Orient Express)
  const SPOT_NOTES = {
    '21344': 'Il treno di lusso più famoso della storia, che dal 1883 collegava Parigi a Istanbul. Questo set è nato dall’idea di un fan su LEGO Ideas: locomotiva a vapore con tender, vagone ristorante, vagone letto e carrozza salotto, con tantissimi dettagli all’interno.',
  };
  function renderHeroSet() {
    const s = catalog.find((x) => x.n === (collection.home || '21344'));
    $('#heroSet').hidden = !s;
    if (!s) return;
    $('#spotNum').textContent = s.n;
    $('#spotName').textContent = s.name;
    $('#spotMeta').textContent = [s.y, s.line, s.p ? fmt(s.p) + ' pezzi' : '', s.sys ? SYS[s.sys][0] : ''].filter(Boolean).join(' · ');
    $('#spotNote').textContent = SPOT_NOTES[s.n] || s.note || '';
    $('#spotNote').hidden = !$('#spotNote').textContent;
    const base = s.n.split('-')[0];
    $('#spotLego').href = 'https://www.lego.com/it-it/search?q=' + encodeURIComponent(base);
    $('#spotBrickset').href = 'https://brickset.com/sets/' + encodeURIComponent(s.n.includes('-') ? s.n : s.n + '-1');
  }

  // Foto dei set: archivio Brickset, con Rebrickable come riserva
  const fullNum = (n) => (n.includes('-') ? n : n + '-1');
  const photoSources = (n, big) => [
    `https://images.brickset.com/sets/${big ? 'images' : 'small'}/${fullNum(n)}.jpg`,
    `https://cdn.rebrickable.com/media/sets/${fullNum(n).toLowerCase()}.jpg`,
  ];
  function photoImg(n, big, alt) {
    const [a, b] = photoSources(n, big);
    return `<img src="${a}" data-fallback="${b}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer">`;
  }
  // Se una foto non si carica prova la riserva, poi mostra il segnaposto
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
    if (img.dataset.fallback !== 'done') { const f = img.dataset.fallback; img.dataset.fallback = 'done'; img.src = f; }
    else { img.replaceWith(Object.assign(document.createElement('span'), { className: 'no-photo', textContent: 'Foto non disponibile' })); }
  }, true);

  function openSetPhoto(n) {
    const s = catalog.find((x) => x.n === n); if (!s) return;
    $('#setDetail').innerHTML = `
      <div class="set-photo">${photoImg(s.n, true, 'Foto del set ' + s.n + ' ' + s.name)}</div>
      <div class="detail-head">
        <p class="eyebrow">Set ${esc(s.n)} · ${s.y}</p>
        <h2 id="setTitle">${esc(s.name)}</h2>
        <p class="small">${esc([s.line, KIND[s.k], s.p ? fmt(s.p) + ' pezzi' : '', s.sys ? SYS[s.sys][0] : ''].filter(Boolean).join(' · '))}</p>
      </div>
      ${s.note ? `<p>${esc(s.note)}</p>` : ''}
      <p class="spot-links set-links">
        <a href="https://brickset.com/sets/${encodeURIComponent(fullNum(s.n))}" target="_blank" rel="noopener">Scheda e altre foto su Brickset</a>
        <a href="https://www.lego.com/it-it/search?q=${encodeURIComponent(s.n.split('-')[0])}" target="_blank" rel="noopener">Cerca su LEGO.com</a>
      </p>
      <p class="small">Foto: Brickset / Rebrickable · © LEGO Group.</p>`;
    $('#setDialog').showModal();
  }

  const eraOf = (y) => ERAS.find((e) => y >= e.from && y <= e.to) || ERAS[ERAS.length - 1];

  function renderEraBar() {
    $('#eraBar').innerHTML = ERAS.map((e) => {
      const n = catalog.filter((s) => eraOf(s.y) === e).length;
      const last = Math.max(...catalog.filter((s) => eraOf(s.y) === e).map((s) => s.y), e.from);
      return `<button class="era${catEra === e.id && !catQuery ? ' is-on' : ''}" type="button" role="tab" aria-selected="${catEra === e.id}" data-era="${e.id}">
        <b>${esc(e.name)}</b><span>${e.from}–${e.to > 2099 ? last : e.to} · ${n} set</span></button>`;
    }).join('');
  }

  function rowHtml(s) {
    const owned = collection.owned.includes(s.n), wish = collection.wish.includes(s.n);
    const sys = s.sys ? `<span class="pill pill-${esc(s.sys)}">${esc(SYS[s.sys][0])}${s.opt ? ' · motore a parte' : ''}</span>` : '';
    const mine = token
      ? `<button class="own-btn" type="button" data-own="owned" data-n="${esc(s.n)}" aria-pressed="${owned}">Ce l’ho</button><button class="own-btn" type="button" data-own="wish" data-n="${esc(s.n)}" aria-pressed="${wish}">Lo vorrei</button><button class="own-btn" type="button" data-home="${esc(s.n)}" aria-pressed="${collection.home === s.n}">In home</button>`
      : (owned ? '<span class="own own-owned">Ce l’ha Alessio</span>' : wish ? '<span class="own own-wish">Lo vorrebbe</span>' : '');
    return `<li class="row">
      <button class="thumb-btn" type="button" data-photo="${esc(s.n)}" aria-label="Foto grande di ${esc(s.name)}">${photoImg(s.n, false, '')}</button>
      <span class="yr">${s.y}</span>
      <span class="num">${esc(s.n)}</span>
      <span class="nm"><b>${esc(s.name)}</b><small>${esc(s.line)} · ${esc(KIND[s.k])}</small>${s.note ? `<span class="note">${esc(s.note)}</span>` : ''}</span>
      <span class="side">${sys}<span class="pcs">${s.p ? fmt(s.p) + ' pezzi' : ''}</span>${mine}</span>
    </li>`;
  }

  function renderCatalog() {
    if (!catalog.length) return;
    renderEraBar();
    renderHeroSet();
    renderHero();
    const q = catQuery.trim().toLowerCase();
    const match = (s) => {
      if (catKind === 'mine' && !collection.owned.includes(s.n) && !collection.wish.includes(s.n)) return false;
      if (catKind !== 'tutti' && catKind !== 'mine' && s.k !== catKind) return false;
      if (q) return (s.name + ' ' + s.n + ' ' + s.line + ' ' + (s.note || '')).toLowerCase().includes(q);
      return true;
    };
    const across = q || catKind === 'mine';
    const groups = (across ? ERAS : ERAS.filter((e) => e.id === catEra)).map((e) => ({ e, list: catalog.filter((s) => eraOf(s.y) === e && match(s)) })).filter((g) => g.list.length);
    const total = groups.reduce((a, g) => a + g.list.length, 0);
    $('#catCount').textContent = across
      ? `${total} set trovati in tutte le epoche`
      : `${total} set in questa epoca · ${catalog.length} set in tutto il catalogo`;
    $('#catBoard').innerHTML = groups.length
      ? groups.map(({ e, list }) => `<div class="era-block"><h3>${esc(e.name)}</h3><p>${esc(e.text)}</p><ol class="rows">${list.map(rowHtml).join('')}</ol></div>`).join('')
      : `<p class="cat-empty">${catKind === 'mine' ? 'Alessio non ha ancora segnato nessun set. Dall’Area Alessio può toccare “Ce l’ho” o “Lo vorrei” accanto a ogni treno.' : 'Nessun set trovato. Prova con un altro nome o numero.'}</p>`;
  }

  async function loadCatalog() {
    try {
      const [cat, col] = await Promise.all([
        fetch('/treni-lego.json').then((r) => r.json()),
        api('/api/collection').catch(() => ({ owned: [], wish: [], home: '21344' })),
      ]);
      catalog = cat; collection = { owned: [], wish: [], home: '21344', ...col };
      const first = catalog[0].y, last = catalog[catalog.length - 1].y;
      $('#catLead').textContent = `Ogni set del mondo dei treni LEGO, dal ${first} al ${last}: ${catalog.length} set tra locomotive, vagoni, stazioni, monorotaie e i treni dei temi speciali come Harry Potter e Disney.`;
      $('#sysLegend').innerHTML = Object.entries(SYS).map(([k, [lab, d]]) => `<div><dt><span class="pill pill-${esc(k)}">${esc(lab)}</span></dt><dd>${esc(d)}</dd></div>`).join('');
      renderCatalog();
    } catch {
      $('#catBoard').innerHTML = '<p class="cat-empty">Il catalogo non si è caricato. Ricarica la pagina tra poco.</p>';
    }
  }

  let collSaving = Promise.resolve();
  function toggleOwn(n, which) {
    const other = which === 'owned' ? 'wish' : 'owned';
    const has = collection[which].includes(n);
    collection[which] = has ? collection[which].filter((x) => x !== n) : [...collection[which], n];
    if (!has) collection[other] = collection[other].filter((x) => x !== n);
    saveCollection();
  }

  function setHomeSet(n) {
    collection.home = n;
    saveCollection();
    $('#catCount').textContent = 'Fatto: questo treno ora è in evidenza nella home.';
  }

  function saveCollection() {
    renderCatalog();
    const body = JSON.stringify(collection);
    collSaving = collSaving.then(() => api('/api/collection', { method: 'PUT', body })).catch((e) => {
      if (e.status === 401) { logout(); renderCatalog(); }
      $('#catCount').textContent = 'Non sono riuscito a salvare la collezione: ' + e.message;
    });
  }

  /* ---------------- Eventi ---------------- */
  function bind() {
    $$('.filters .chip[data-filter]').forEach((c) => c.addEventListener('click', () => {
      filter = c.dataset.filter;
      $$('.filters .chip[data-filter]').forEach((x) => x.classList.toggle('is-on', x === c));
      renderProjects();
    }));
    $('#heroPhoto').addEventListener('click', () => openProject($('#heroPhoto').dataset.id));
    $('#projectGrid').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openProject(c.dataset.id); });

    $$('dialog').forEach((d) => {
      d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    });

    $('#calcForm').addEventListener('input', calc);
    $('#calcForm').addEventListener('submit', (e) => e.preventDefault());

    $('#msgForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const st = $('#msgStatus');
      const name = $('#msgName').value.trim(), text = $('#msgText').value.trim();
      if (!name || !text) { st.className = 'form-status err'; st.textContent = 'Scrivi il tuo nome e il messaggio.'; return; }
      try {
        await api('/api/messages', { method: 'POST', body: JSON.stringify({ name, text }) });
        $('#msgText').value = '';
        st.className = 'form-status ok'; st.textContent = 'Messaggio inviato. Comparirà qui dopo che Alessio l’avrà letto.';
      } catch (err) { st.className = 'form-status err'; st.textContent = err.message; }
    });

    $('#eraBar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-era]'); if (!b) return;
      catEra = b.dataset.era; catQuery = ''; $('#catSearch').value = '';
      if (catKind === 'mine') { catKind = 'tutti'; $$('#catalogo [data-kind]').forEach((x) => x.classList.toggle('is-on', x.dataset.kind === 'tutti')); }
      renderCatalog();
    });
    $('#catSearch').addEventListener('input', (e) => { catQuery = e.target.value; renderCatalog(); });
    $$('#catalogo [data-kind]').forEach((c) => c.addEventListener('click', () => {
      catKind = c.dataset.kind;
      $$('#catalogo [data-kind]').forEach((x) => x.classList.toggle('is-on', x === c));
      renderCatalog();
    }));
    $('#catBoard').addEventListener('click', (e) => {
      const b = e.target.closest('[data-own]'); if (b) toggleOwn(b.dataset.n, b.dataset.own);
      const h = e.target.closest('[data-home]'); if (h) setHomeSet(h.dataset.home);
      const ph = e.target.closest('[data-photo]'); if (ph) openSetPhoto(ph.dataset.photo);
    });

    $('#adminOpen').addEventListener('click', openAdmin);
    $$('[data-open-admin]').forEach((b) => b.addEventListener('click', openAdmin));

    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const st = $('#loginStatus');
      try {
        const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ pin: $('#pinInput').value }) });
        token = r.token; store.set('pb_token', token);
        st.textContent = ''; showPanel();
      } catch (err) { st.className = 'form-status err'; st.textContent = err.message; }
    });
    $('#logoutBtn').addEventListener('click', logout);

    $$('.tab[data-tab]').forEach((t) => t.addEventListener('click', () => {
      $$('.tab[data-tab]').forEach((x) => { const on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); $('#' + x.dataset.tab).hidden = !on; });
      if (t.dataset.tab === 'tabMessages') loadAdminMessages();
    }));

    $('#hFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const st = $('#homeStatus'); st.className = 'form-status'; st.textContent = 'Carico la foto…';
      try { collection.homePhoto = await uploadFile(f); await saveHome('Fatto: la foto è nella home.'); }
      catch (err) { if (!handleAuthError(err)) { st.className = 'form-status err'; st.textContent = err.message; } }
    });
    $('#hRemove').addEventListener('click', () => { collection.homePhoto = null; saveHome('Foto tolta dalla home.'); });
    $('#hCapSave').addEventListener('click', () => { collection.homeCaption = $('#hCap').value.trim(); saveHome('Scritta salvata.'); });

    $('#plFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const st = $('#plStatus'); st.className = 'form-status'; st.textContent = 'Carico la foto…';
      try { pearlEdit.image = await uploadFile(f); pearlEdit.photo = null; renderPearlSlot(); st.className = 'form-status ok'; st.textContent = 'Foto pronta.'; }
      catch (err) { if (!handleAuthError(err)) { st.className = 'form-status err'; st.textContent = err.message; } }
    });
    $('#pearlForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = $('#plTitle').value.trim(), text = $('#plText').value.trim();
      if (!title) { $('#plStatus').className = 'form-status err'; $('#plStatus').textContent = 'Scrivi il titolo della perla.'; $('#plTitle').focus(); return; }
      const published = $('#plPublished').checked;
      const item = { ...pearlEdit, title, text, published };
      const list = pearlEdit.id ? pearls.map((x) => (x.id === pearlEdit.id ? item : x)) : [...pearls, { ...item, id: '' }];
      if (await savePearls(list, published ? 'Fatto: la perla è online sul sito.' : 'Salvata come bozza: sul sito non si vede finché non la pubblichi.')) resetPearlForm();
    });
    $('#plCancel').addEventListener('click', resetPearlForm);
    $('#adminPearls').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pact]'); if (!b) return;
      const li = b.closest('.admin-item'); const id = li.dataset.id; const i = pearls.findIndex((x) => x.id === id);
      if (b.dataset.pact === 'edit') {
        pearlEdit = { ...pearls[i] };
        $('#plTitle').value = pearlEdit.title; $('#plText').value = pearlEdit.text; $('#plPublished').checked = pearlEdit.published !== false;
        $('#pearlFormTitle').textContent = 'Modifica la perla n. ' + (i + 1);
        $('#plSave').textContent = 'Salva le modifiche'; $('#plCancel').hidden = false;
        renderPearlSlot(); $('#plTitle').focus();
      }
      if (b.dataset.pact === 'toggle') {
        const on = pearls[i].published === false;
        savePearls(pearls.map((x) => (x.id === id ? { ...x, published: on } : x)), on ? 'Perla pubblicata sul sito.' : 'Perla nascosta dal sito.');
      }
      if (b.dataset.pact === 'up' && i > 0) { const l = [...pearls]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; savePearls(l, 'Ordine aggiornato.'); }
      if (b.dataset.pact === 'del') askConfirm(li, 'Eliminare questa perla?', () => savePearls(pearls.filter((x) => x.id !== id), 'Perla eliminata.'));
    });

    $('#newProjectBtn').addEventListener('click', () => startEdit(null));
    $('#cancelProjectBtn').addEventListener('click', () => { $('#projectForm').hidden = true; draft = null; });
    $('#projectForm').addEventListener('submit', saveProject);

    $('#adminProjects').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const li = b.closest('.admin-item'); const id = li.dataset.id;
      if (b.dataset.act === 'edit') startEdit(projects.find((p) => p.id === id));
      if (b.dataset.act === 'del') askConfirm(li, 'Eliminare con tutte le foto?', async () => {
        try { await api('/api/projects/' + encodeURIComponent(id), { method: 'DELETE' }); await loadProjects(); }
        catch (err) { if (!handleAuthError(err)) li.querySelector('.actions').textContent = err.message; }
      });
    });

    $('#adminMessages').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const li = b.closest('.admin-item'); const id = encodeURIComponent(li.dataset.id);
      const run = async (fn) => { try { await fn(); await loadAdminMessages(); loadMessages(); } catch (err) { if (!handleAuthError(err)) li.querySelector('.actions').textContent = err.message; } };
      if (b.dataset.act === 'show') run(() => api('/api/messages/' + id, { method: 'PATCH', body: JSON.stringify({ approved: true }) }));
      if (b.dataset.act === 'hide') run(() => api('/api/messages/' + id, { method: 'PATCH', body: JSON.stringify({ approved: false }) }));
      if (b.dataset.act === 'del') askConfirm(li, 'Eliminare il messaggio?', () => run(() => api('/api/messages/' + id, { method: 'DELETE' })));
    });

    $('#fCover').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      syncDraftFields();
      await withUpload([f], (id) => { draft.cover = id; });
      renderDraftPhotos();
    });
    $('#fGallery').addEventListener('change', async (e) => {
      const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
      syncDraftFields();
      await withUpload(files, (id) => { draft.gallery.push(id); renderDraftPhotos(); });
    });
    $('#galleryEdit').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm-g]'); if (!b) return;
      draft.gallery.splice(+b.dataset.rmG, 1); renderDraftPhotos();
    });
    $('#addStepBtn').addEventListener('click', () => {
      syncDraftFields(); draft.steps.push({ text: '', image: null }); renderDraftSteps();
      const last = $$('#stepsEdit textarea').pop(); if (last) last.focus();
    });
    $('#stepsEdit').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-step]'), up = e.target.closest('[data-up]'), rm = e.target.closest('[data-rm-s]');
      if (!del && !up && !rm) return;
      syncDraftFields();
      if (del) draft.steps.splice(+del.dataset.delStep, 1);
      if (up) { const i = +up.dataset.up; [draft.steps[i - 1], draft.steps[i]] = [draft.steps[i], draft.steps[i - 1]]; }
      if (rm) draft.steps[+rm.dataset.rmS].image = null;
      renderDraftSteps();
    });
    $('#stepsEdit').addEventListener('change', async (e) => {
      const inp = e.target.closest('[data-step-file]'); if (!inp) return;
      const f = inp.files[0]; const i = +inp.dataset.stepFile; if (!f) return;
      syncDraftFields();
      await withUpload([f], (id) => { draft.steps[i].image = id; });
      renderDraftSteps();
    });
  }

  renderParts();
  renderTl($('#tlReal'), TL_REAL);
  renderTl($('#tlLego'), TL_LEGO);
  renderHow();
  calc();
  renderProjects();
  bind();
  loadProjects();
  loadMessages();
  loadCatalog();
  loadPearls();
})();
