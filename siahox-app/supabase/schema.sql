-- SI AHOX: skema basis data (jalankan sekali di Supabase > SQL Editor)

create sequence if not exists klarifikasi_no;

create table if not exists klarifikasi (
  id text primary key default ('K-' || lpad(nextval('klarifikasi_no')::text, 4, '0')),
  kategori text not null,
  hoaks text not null,          -- kabar yang beredar
  fakta text not null,          -- klarifikasi resmi
  sumber_url text,              -- tautan rilis resmi, bila ada
  terbit boolean not null default true,
  dibuat_oleh text,
  dibuat timestamptz not null default now()
);

create table if not exists aduan (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('foto','link','wa')),
  isi text,                     -- teks kiriman, nomor telepon sudah disamarkan
  url text,
  berkas text,                  -- nama berkas di bucket "kiriman"
  kategori text,
  skor int,
  label text,
  keyakinan text,
  hasil jsonb,                  -- jawaban lengkap AI + rincian skor
  rujukan jsonb,                -- sumber web dari pencarian AI
  penyedia text,                -- gemini / claude
  klarifikasi_id text references klarifikasi(id) on delete set null,
  status text not null default 'otomatis'
    check (status in ('otomatis','perlu_ditinjau','disahkan','dikoreksi')),
  label_petugas text,
  catatan_petugas text,
  ditinjau_oleh text,
  ditinjau_pada timestamptz,
  dibuat timestamptz not null default now()
);

create index if not exists aduan_dibuat on aduan (dibuat desc);
create index if not exists aduan_status on aduan (status, dibuat desc);

-- Aturan akses.
-- Warga TIDAK mengakses basis data langsung: semua lewat server SI AHOX (kunci rahasia).
-- Petugas masuk dengan akun Supabase dan boleh membaca serta mengubah.
-- PENTING: matikan pendaftaran publik di Authentication, karena setiap akun yang
-- berhasil masuk dianggap petugas.
alter table klarifikasi enable row level security;
alter table aduan enable row level security;

drop policy if exists "petugas kelola klarifikasi" on klarifikasi;
create policy "petugas kelola klarifikasi" on klarifikasi
  for all to authenticated using (true) with check (true);

drop policy if exists "petugas baca aduan" on aduan;
create policy "petugas baca aduan" on aduan
  for select to authenticated using (true);

drop policy if exists "petugas ubah aduan" on aduan;
create policy "petugas ubah aduan" on aduan
  for update to authenticated using (true) with check (true);

-- Penyimpanan foto kiriman (privat).
insert into storage.buckets (id, name, public)
values ('kiriman', 'kiriman', false)
on conflict (id) do nothing;

drop policy if exists "petugas lihat kiriman" on storage.objects;
create policy "petugas lihat kiriman" on storage.objects
  for select to authenticated using (bucket_id = 'kiriman');
