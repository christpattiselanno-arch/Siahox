// GET /api/config : alamat proyek dan kunci PUBLIK Supabase untuk halaman petugas.
// Kunci rahasia tidak pernah dikirim ke browser.
export default function handler(req, res) {
  return res.status(200).json({
    supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
    supabaseKey: process.env.SUPABASE_ANON_KEY || "",
  });
}
