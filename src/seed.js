// Akun uji coba (autentikasi demo sisi-klien) + data awal.
export const USERS = [
  { username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' },
  { username: 'dosen', password: 'dosen123', name: 'Dosen Pengampu', role: 'Dosen' },
];
export const seed = {
  courses: {
    IF201: { id: 'IF201', kode: 'IF201', nama: 'Pemrograman Berorientasi Objek' },
    IF202: { id: 'IF202', kode: 'IF202', nama: 'Basis Data' },
    IF203: { id: 'IF203', kode: 'IF203', nama: 'Jaringan Komputer' },
  },
  students: Object.fromEntries(
    [['2201001', 'Andi Pratama'], ['2201002', 'Bunga Lestari'], ['2201003', 'Citra Dewi'],
     ['2201004', 'Doni Saputra'], ['2201005', 'Eka Wulandari']].map(([nim, nama]) => [nim, { nim, nama }])
  ),
  sessions: {},
};
