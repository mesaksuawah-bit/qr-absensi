import { seed } from './seed.js';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const isCloud = Boolean(cfg.projectId && cfg.apiKey);

// Jam acuan bersama: di mode cloud memakai jam server Firebase agar HP & laptop
// yang jamnya berbeda tetap konsisten. Di mode lokal = jam perangkat.
let offset = 0;
export const now = () => Date.now() + offset;

// ---------- Adapter lokal (localStorage) ----------
const K = 'qr-absensi-v1';
const read = () => {
  let d = JSON.parse(localStorage.getItem(K) || 'null');
  if (!d) { d = structuredClone(seed); localStorage.setItem(K, JSON.stringify(d)); }
  return d;
};
const write = (d) => localStorage.setItem(K, JSON.stringify(d));
const local = {
  async list(c) { return Object.values(read()[c]); },
  async get(c, id) { return read()[c][id] || null; },
  async set(c, id, v) { const d = read(); d[c][id] = v; write(d); },
  async del(c, id) { const d = read(); delete d[c][id]; write(d); },
  async patch(c, id, fields) {
    const d = read(); const doc = d[c][id];
    for (const [path, val] of Object.entries(fields)) {
      const keys = path.split('.'); const last = keys.pop();
      keys.reduce((o, k) => (o[k] ??= {}), doc)[last] = val;
    }
    write(d);
  },
  watch(c, id, cb) {
    const f = () => local.get(c, id).then(cb);
    f(); const t = setInterval(f, 3000);
    addEventListener('storage', f);
    return () => { clearInterval(t); removeEventListener('storage', f); };
  },
};

// ---------- Adapter Firebase Firestore ----------
async function cloud() {
  const { initializeApp } = await import('firebase/app');
  const F = await import('firebase/firestore');
  const fs = F.getFirestore(initializeApp(cfg));
  const a = {
    async list(c) { return (await F.getDocs(F.collection(fs, c))).docs.map((d) => d.data()); },
    async get(c, id) { const s = await F.getDoc(F.doc(fs, c, id)); return s.exists() ? s.data() : null; },
    set: (c, id, v) => F.setDoc(F.doc(fs, c, id), v),
    del: (c, id) => F.deleteDoc(F.doc(fs, c, id)),
    patch: (c, id, fields) => F.updateDoc(F.doc(fs, c, id), fields),
    watch: (c, id, cb) => F.onSnapshot(F.doc(fs, c, id), (s) => cb(s.exists() ? s.data() : null)),
  };
  try {
    const ref = F.doc(fs, 'meta', 'clock');
    const t0 = Date.now();
    await F.setDoc(ref, { t: F.serverTimestamp() });
    const snap = await F.getDoc(ref);
    offset = snap.data().t.toMillis() - (t0 + Date.now()) / 2;
  } catch { /* tetap pakai jam perangkat */ }
  if (!(await a.list('courses')).length) {
    for (const [k, v] of Object.entries(seed.courses)) await a.set('courses', k, v);
    for (const [k, v] of Object.entries(seed.students)) await a.set('students', k, v);
  }
  return a;
}

export const initDb = () => (isCloud ? cloud() : Promise.resolve(local));
