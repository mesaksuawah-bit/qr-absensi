import './style.css';
import QRCode from 'qrcode';
import { initDb, isCloud, now } from './store.js';
import { USERS } from './seed.js';

const LATE_MIN = 15; // lewat 15 menit dari sesi dibuka => Terlambat
const $ = (id) => document.getElementById(id);
const app = $('app');
let db;
let stop = () => {};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const user = () => JSON.parse(sessionStorage.getItem('user') || 'null');
const hhmm = (t) => new Date(t).toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':');
const isActive = (s) => !s.closed && now() < s.expiresAt;

function shell(html, u = user()) {
  app.innerHTML = `<header class="bar"><span>Sistem Absensi Mahasiswa Berbasis QR Code</span>
    ${u ? `<span class="who">${esc(u.name)} · ${u.role}<button id="out" class="link">Keluar</button></span>` : ''}</header>
    <main>${html}</main>`;
  if ($('out')) $('out').onclick = () => { sessionStorage.removeItem('user'); location.hash = '#/'; };
}

// ---------- Login ----------
function login() {
  shell(`<section class="card narrow"><h1>Masuk</h1><p class="muted">Khusus Dosen &amp; Admin. Mahasiswa cukup memindai QR Code.</p>
    <div id="msg"></div><label>Username</label><input id="u" autocomplete="username">
    <label>Password</label><input id="p" type="password" autocomplete="current-password">
    <button id="go" class="btn">Masuk</button>
    ${isCloud ? '' : '<p class="muted" style="font-size:.78rem">Mode demo lokal: data tersimpan di browser ini.</p>'}</section>`);
  const submit = () => {
    const f = USERS.find((x) => x.username === $('u').value.trim() && x.password === $('p').value);
    if (!f) { $('msg').innerHTML = '<div class="alert err">Username atau password salah.</div>'; return; }
    sessionStorage.setItem('user', JSON.stringify({ username: f.username, name: f.name, role: f.role }));
    location.hash = f.role === 'Admin' ? '#/admin' : '#/dosen';
  };
  $('go').onclick = submit;
  $('p').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// ---------- Panel Dosen ----------
async function dosen() {
  const courses = await db.list('courses');
  const last = (await db.list('sessions')).sort((a, b) => b.openedAt - a.openedAt)[0];
  shell(`<section class="card"><h1>Panel Dosen</h1>
    <label>Mata Kuliah</label><select id="c">${courses.map((c) => `<option value="${esc(c.id)}">${esc(c.kode)} - ${esc(c.nama)}</option>`).join('')}</select>
    <label>Masa berlaku QR (menit)</label><input id="m" type="number" min="1" value="30">
    <button id="go" class="btn">Buka Sesi &amp; Buat QR</button></section>
    <section class="card"><h1>Sesi Terakhir</h1>${last
      ? `<p><b>${esc(last.courseName)}</b><br><span class="muted">Dibuka ${hhmm(last.openedAt)} · ${isActive(last) ? 'AKTIF' : 'SELESAI'} · ${Object.keys(last.records || {}).length} mahasiswa hadir</span></p>
         <a class="btn sm" href="#/sesi/${last.token}" style="display:inline-block;text-decoration:none">Buka Sesi</a>`
      : '<p>Belum ada sesi.</p>'}</section>
    ${user().role === 'Admin' ? '<p class="tabs"><a href="#/admin">← Kelola Data (Admin)</a></p>' : ''}`);
  $('go').onclick = async () => {
    const c = courses.find((x) => x.id === $('c').value);
    const mins = Math.max(1, Number($('m').value) || 30);
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    const t = now();
    await db.set('sessions', token, { token, courseId: c.id, courseName: c.nama, openedAt: t, expiresAt: t + mins * 60000, closed: false, records: {} });
    location.hash = `#/sesi/${token}`;
  };
}

// ---------- Halaman Sesi: QR + rekap langsung ----------
async function sesi(token) {
  const url = `${location.origin}${location.pathname}#/absen/${token}`;
  const [qr, studs] = await Promise.all([QRCode.toDataURL(url, { width: 260, margin: 1 }), db.list('students')]);
  studs.sort((a, b) => a.nim.localeCompare(b.nim));
  shell(`<section class="card center"><h2 id="t"></h2><p id="info"></p><img src="${qr}" width="260" height="260" alt="QR Code absensi">
    <p>Mahasiswa memindai QR atau membuka:</p><code>${esc(url)}</code>
    <div><button id="close" class="btn">Tutup Sesi</button></div></section>
    <section class="card"><h1>Rekap Kehadiran</h1><div id="rekap"></div><button id="back" class="btn">Kembali</button></section>`);
  let s = null;
  const paint = () => {
    if (!s) { $('t').textContent = 'Sesi tidak ditemukan.'; return; }
    const rec = s.records || {};
    const rows = studs.map((m) => ({ ...m, r: rec[m.nim] }));
    const count = (st) => rows.filter((x) => x.r?.status === st).length;
    $('t').textContent = s.courseName;
    $('info').innerHTML = `Dibuka ${hhmm(s.openedAt)} · berlaku sampai ${hhmm(s.expiresAt)} · <b>${isActive(s) ? 'AKTIF' : 'SELESAI'}</b>`;
    $('close').style.display = isActive(s) ? '' : 'none';
    $('rekap').innerHTML = `<p>Hadir: <b>${count('Hadir')}</b> · Terlambat: <b>${count('Terlambat')}</b> · Belum: <b>${rows.filter((x) => !x.r).length}</b></p>
      <table><tr><th>NIM</th><th>Nama</th><th>Waktu</th><th>Status</th></tr>${rows.map((x) =>
        `<tr><td>${esc(x.nim)}</td><td>${esc(x.nama)}</td><td>${x.r ? hhmm(x.r.time) : '-'}</td>
         <td class="s-${x.r ? x.r.status : 'Belum'}">${x.r ? x.r.status : 'Belum absen'}</td></tr>`).join('')}</table>`;
  };
  const off = db.watch('sessions', token, (v) => { s = v; paint(); });
  const timer = setInterval(paint, 10000); // pembaruan otomatis tiap 10 detik
  stop = () => { off(); clearInterval(timer); };
  $('close').onclick = () => db.patch('sessions', token, { closed: true });
  $('back').onclick = () => (location.hash = '#/dosen');
}

// ---------- Mahasiswa: form NIM ----------
async function absen(token) {
  let s = await db.get('sessions', token);
  let done = false;
  const draw = (msg = '') => shell(`<section class="card"><h1>Absensi Kuliah</h1>${s ? `<h3>${esc(s.courseName)}</h3>` : ''}${msg}
    ${!s ? '<div class="alert err">Sesi tidak ditemukan.</div>'
      : done ? ''
      : isActive(s) ? `<label>Masukkan NIM</label><input id="nim" inputmode="numeric" placeholder="contoh: 2201001" autocomplete="off">
          <button id="go" class="btn">Kirim Absensi</button>`
      : `<div class="alert err">${s.closed ? 'Sesi absensi sudah ditutup oleh dosen.' : 'Masa berlaku QR sudah habis.'}</div>`}</section>`, null);
  draw();
  const bind = () => {
    if (!$('go')) return;
    const send = async () => {
      const nim = $('nim').value.trim();
      const st = nim && (await db.get('students', nim));
      s = await db.get('sessions', token);
      if (!isActive(s)) { draw(); return bind(); }
      if (!st) { draw(`<div class="alert err">NIM ${esc(nim) || 'kosong'} tidak terdaftar.</div>`); return bind(); }
      if (s.records?.[nim]) { draw(`<div class="alert err">${esc(st.nama)} sudah absen pada sesi ini.</div>`); return bind(); }
      const t = now();
      const status = t - s.openedAt > LATE_MIN * 60000 ? 'Terlambat' : 'Hadir';
      await db.patch('sessions', token, { [`records.${nim}`]: { time: t, status } });
      done = true;
      draw(`<div class="alert ok">Berhasil! ${esc(st.nama)} tercatat ${status} pukul ${hhmm(t)}.</div>`);
    };
    $('go').onclick = send;
    $('nim').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  };
  bind();
}

// ---------- Admin ----------
async function admin() {
  const [courses, studs, sess] = await Promise.all([db.list('courses'), db.list('students'), db.list('sessions')]);
  studs.sort((a, b) => a.nim.localeCompare(b.nim));
  sess.sort((a, b) => b.openedAt - a.openedAt);
  shell(`<p class="tabs"><a href="#/dosen">Buka Panel Dosen →</a></p>
    <section class="card"><h1>Mata Kuliah</h1><table>${courses.map((c) => `<tr><td>${esc(c.kode)}</td><td>${esc(c.nama)}</td>
      <td><button class="btn sm red" data-dc="${esc(c.id)}">Hapus</button></td></tr>`).join('')}</table>
      <div class="row"><div><label>Kode</label><input id="ck"></div><div><label>Nama</label><input id="cn"></div><button id="ac" class="btn">Tambah</button></div></section>
    <section class="card"><h1>Mahasiswa</h1><table>${studs.map((m) => `<tr><td>${esc(m.nim)}</td><td>${esc(m.nama)}</td>
      <td><button class="btn sm red" data-ds="${esc(m.nim)}">Hapus</button></td></tr>`).join('')}</table>
      <div class="row"><div><label>NIM</label><input id="sn"></div><div><label>Nama</label><input id="sm"></div><button id="as" class="btn">Tambah</button></div></section>
    <section class="card"><h1>Riwayat Sesi</h1>${sess.length ? `<table>${sess.map((x) => `<tr><td>${esc(x.courseName)}</td>
      <td>${new Date(x.openedAt).toLocaleString('id-ID')}</td><td>${Object.keys(x.records || {}).length} hadir</td>
      <td><a href="#/sesi/${x.token}">Lihat</a></td></tr>`).join('')}</table>` : '<p>Belum ada sesi.</p>'}</section>`);
  const act = (fn) => async () => { await fn(); admin(); };
  document.querySelectorAll('[data-dc]').forEach((b) => (b.onclick = act(() => db.del('courses', b.dataset.dc))));
  document.querySelectorAll('[data-ds]').forEach((b) => (b.onclick = act(() => db.del('students', b.dataset.ds))));
  $('ac').onclick = act(async () => {
    const kode = $('ck').value.trim().replace(/[^\w-]/g, ''), nama = $('cn').value.trim();
    if (kode && nama) await db.set('courses', kode, { id: kode, kode, nama });
  });
  $('as').onclick = act(async () => {
    const nim = $('sn').value.trim().replace(/[^\w-]/g, ''), nama = $('sm').value.trim();
    if (nim && nama) await db.set('students', nim, { nim, nama });
  });
}

// ---------- Router ----------
function route() {
  stop(); stop = () => {};
  const [, page, arg] = location.hash.split('/');
  const u = user();
  if (page === 'absen') return absen(arg);
  if (!u) return login();
  if (page === 'dosen') return dosen();
  if (page === 'sesi') return sesi(arg);
  if (page === 'admin' && u.role === 'Admin') return admin();
  location.hash = u.role === 'Admin' ? '#/admin' : '#/dosen';
}
initDb().then((d) => { db = d; addEventListener('hashchange', route); route(); });
