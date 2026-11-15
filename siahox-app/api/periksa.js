// POST /api/periksa : menerima kiriman warga, menganalisis, menyimpan, mengembalikan hasil.
import { sb, hitung, samarkan, ambilTautan, susunTugas, analisis } from "../lib/siahox.js";

const MIME = ["image/jpeg", "image/png", "image/webp"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ galat: "Gunakan metode POST." });
  let b;
  try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; }
  catch { return res.status(400).json({ galat: "Kiriman tidak terbaca." }); }

  const jenis = String(b.jenis || "");
  if (!["foto", "link", "wa"].includes(jenis)) return res.status(400).json({ galat: "Jenis kiriman tidak dikenal." });
  if (b.setuju !== true) return res.status(400).json({ galat: "Centang persetujuan lebih dulu." });

  const teks = samarkan(String(b.teks || "").trim().slice(0, 6000));
  const konteks = samarkan(String(b.konteks || "").trim().slice(0, 1000));
  const url = String(b.url || "").trim().slice(0, 600);
  let gambar = null;
  if (b.gambar && b.gambar.data) {
    if (!MIME.includes(b.gambar.mime) || typeof b.gambar.data !== "string" || b.gambar.data.length > 5500000 || !/^[A-Za-z0-9+/=]+$/.test(b.gambar.data))
      return res.status(400).json({ galat: "Gambar tidak didukung atau terlalu besar." });
    gambar = { mime: b.gambar.mime, data: b.gambar.data };
  }
  if (jenis === "foto" && !gambar) return res.status(400).json({ galat: "Pilih foto lebih dulu." });
  if (jenis === "link" && !url && !teks) return res.status(400).json({ galat: "Isi alamat tautan atau tempel isi beritanya." });
  if (jenis === "wa" && !teks && !gambar) return res.status(400).json({ galat: "Tempel isi pesan atau unggah tangkapan layarnya." });

  try {
    // Batas pemakaian per jam, untuk melindungi kuota AI.
    const batas = Number(process.env.BATAS_PER_JAM || 200);
    try {
      const sejak = new Date(Date.now() - 3600000).toISOString();
      const r = await sb(`/rest/v1/aduan?select=id&dibuat=gte.${encodeURIComponent(sejak)}`, { headers: { Prefer: "count=exact", Range: "0-0" }, raw: true });
      const n = Number(((r.headers.get("content-range") || "").split("/")[1]) || 0);
      if (n >= batas) return res.status(429).json({ galat: "Layanan sedang ramai. Coba lagi beberapa saat lagi." });
    } catch (e) { console.warn("hitung batas dilewati:", e.message); }

    let klar = [];
    try {
      klar = (await sb("/rest/v1/klarifikasi?select=id,kategori,hoaks,fakta,sumber_url&terbit=eq.true&order=dibuat.desc&limit=200")) || [];
    } catch (e) { console.warn("klarifikasi tidak terambil:", e.message); }

    const tautan = jenis === "link" && url ? await ambilTautan(url) : null;
    const tugas = susunTugas({ jenis, teks, konteks, url, tautan, adaGambar: !!gambar });
    const { d, rujukan, penyedia } = await analisis({ tugas, klar, gambar });

    // Klarifikasi yang disebut AI harus benar-benar ada di daftar.
    const kc = d.klarifikasi_cocok || {};
    const cocok = klar.find((k) => k.id === kc.id) || null;
    if (!cocok) {
      d.klarifikasi_cocok = { id: null, hubungan: "tidak_ada" };
      if (d.komponen && d.komponen.sumber_resmi) d.komponen.sumber_resmi.skor = null;
    }
    const h = hitung(d, jenis === "foto");

    // Simpan (jika gagal, hasil tetap dikembalikan ke warga).
    let id = null, tersimpan = false;
    try {
      let berkas = null;
      if (gambar) {
        berkas = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${gambar.mime.split("/")[1]}`;
        await sb(`/storage/v1/object/kiriman/${berkas}`, { method: "POST", body: new Uint8Array(Buffer.from(gambar.data, "base64")), headers: { "Content-Type": gambar.mime }, raw: true });
      }
      const baris = await sb("/rest/v1/aduan", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: {
          jenis, isi: [konteks, teks].filter(Boolean).join("\n\n") || null, url: url || null, berkas,
          kategori: String(d.kategori || "lainnya").slice(0, 40), skor: h.total, label: h.label, keyakinan: h.yakin,
          hasil: { d, h }, rujukan, penyedia, klarifikasi_id: cocok ? cocok.id : null,
          status: h.tinjau.length ? "perlu_ditinjau" : "otomatis",
        },
      });
      id = baris && baris[0] ? baris[0].id : null; tersimpan = true;
    } catch (e) { console.error("gagal menyimpan aduan:", e.message); }

    return res.status(200).json({
      id, tersimpan, d, h, klarifikasi: cocok, rujukan,
      tautan: tautan ? { host: tautan.host, terbaca: tautan.terbaca, galat: tautan.galat || null } : null,
    });
  } catch (e) {
    console.error("periksa gagal:", e.message);
    return res.status(502).json({ galat: "Pemeriksaan belum berhasil. Coba lagi sebentar lagi.", rinci: process.env.SIAHOX_DEBUG === "1" ? e.message : undefined });
  }
}
