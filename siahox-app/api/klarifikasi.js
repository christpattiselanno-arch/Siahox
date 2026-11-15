// GET /api/klarifikasi : daftar klarifikasi yang sudah terbit, untuk halaman warga.
import { sb } from "../lib/siahox.js";

export default async function handler(req, res) {
  try {
    const data = await sb("/rest/v1/klarifikasi?select=id,kategori,hoaks,fakta,sumber_url,dibuat&terbit=eq.true&order=dibuat.desc&limit=30");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ klarifikasi: data || [] });
  } catch (e) {
    console.error("klarifikasi gagal:", e.message);
    return res.status(200).json({ klarifikasi: [], galat: "Daftar klarifikasi belum bisa dimuat." });
  }
}
