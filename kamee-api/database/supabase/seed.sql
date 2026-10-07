-- =============================================================================
-- Kamee Coffee API — data awal TANPA data demo (KAMEE_SEED_DEMO=false)
-- Dihasilkan oleh database/supabase/build.sh pada 2026-10-07 07:57 UTC. Jangan edit manual.
-- Isi: outlet, 2 akun admin (sandi: password — SEGERA GANTI), menu, opsi, promo, banner, blog, tier loyalitas, pembukuan awal.
-- =============================================================================

BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (1, 'Ngopi Hemat 20%', 'Pakai kode KAMEEHEMAT untuk semua menu', '/images/banners/banner-1.avif', '/images/banners/banner-1.avif', '/promo', 'home', 0, '2026-09-07 14:57:30', '2026-12-07 14:57:30', true);
INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (2, 'Kame Manucano', 'Iced Americano dengan Manuka Honey — favorit pelanggan', '/images/banners/banner-2.avif', '/images/banners/banner-2.avif', '/menu/kame-manucano', 'home', 1, '2026-09-07 14:57:30', '2026-12-07 14:57:30', true);
INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (3, 'Gratis Ongkir sekitar Taman Cibodas', 'Minimal belanja Rp50.000 dengan kode GRATISONGKIR', '/images/banners/banner-3.avif', '/images/banners/banner-3.avif', '/promo', 'home', 2, '2026-09-07 14:57:30', '2026-12-07 14:57:30', true);


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blog_categories (id, name, slug) VALUES (1, 'Tips Kopi', 'tips-kopi');
INSERT INTO public.blog_categories (id, name, slug) VALUES (2, 'Cerita Kamee', 'cerita-kamee');
INSERT INTO public.blog_categories (id, name, slug) VALUES (3, 'Promo & Event', 'promo-event');


--
-- Data for Name: outlets; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.outlets (id, name, slug, address, city, lat, lng, phone_wa, open_time, close_time, is_open, delivery_radius_km, created_at, updated_at) VALUES (1, 'Kamee Coffee Taman Cibodas', 'kamee-taman-cibodas', 'Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Sangiang Jaya, Kec. Periuk', 'Kota Tangerang', -6.1819389, 106.5971757, '6281280871630', '10:00:00', '17:00:00', true, 5.00, '2026-10-07 14:57:29', '2026-10-07 14:57:29');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, password, role, outlet_id, is_active, last_login_at, remember_token, created_at, updated_at) VALUES (1, 'Super Admin Kamee', 'superadmin@kamee.id', '$2y$12$n/2KciVCebEV37P0slmfeuF7QOWaFqEr2XD9hllnVWsOZqtuf5njm', 'super_admin', NULL, true, NULL, NULL, '2026-10-07 14:57:29', '2026-10-07 14:57:29');
INSERT INTO public.users (id, name, email, password, role, outlet_id, is_active, last_login_at, remember_token, created_at, updated_at) VALUES (2, 'Admin Kamee Taman Cibodas', 'admin.cibodas@kamee.id', '$2y$12$taC3Fz16SKlCrxnHRaKIoOY3djr8O0Nry0hZaIOjkJEhOnEIW2AdG', 'outlet_admin', 1, true, NULL, NULL, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: blogs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (1, 1, 1, 'Cara Membuat Kopi Susu Aren di Rumah', 'cara-membuat-kopi-susu-aren-di-rumah', 'Cara Membuat Kopi Susu Aren di Rumah — simak selengkapnya di blog Kamee Coffee.', '<p>Cara Membuat Kopi Susu Aren di Rumah.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-1.avif', NULL, NULL, 'published', '2026-08-28 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (2, 1, 1, 'Mengenal Perbedaan Arabika dan Robusta', 'mengenal-perbedaan-arabika-dan-robusta', 'Mengenal Perbedaan Arabika dan Robusta — simak selengkapnya di blog Kamee Coffee.', '<p>Mengenal Perbedaan Arabika dan Robusta.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-2.avif', NULL, NULL, 'published', '2026-09-03 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (3, 1, 1, '5 Tips Menyimpan Biji Kopi agar Tetap Segar', '5-tips-menyimpan-biji-kopi-agar-tetap-segar', '5 Tips Menyimpan Biji Kopi agar Tetap Segar — simak selengkapnya di blog Kamee Coffee.', '<p>5 Tips Menyimpan Biji Kopi agar Tetap Segar.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-3.avif', NULL, NULL, 'published', '2026-09-09 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (4, 1, 1, 'Natural, Washed, atau Honey? Mengenal Proses Biji Kopi', 'natural-washed-atau-honey-mengenal-proses-biji-kopi', 'Natural, Washed, atau Honey? Mengenal Proses Biji Kopi — simak selengkapnya di blog Kamee Coffee.', '<p>Natural, Washed, atau Honey? Mengenal Proses Biji Kopi.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-4.avif', NULL, NULL, 'published', '2026-09-15 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (5, 2, 1, 'Cerita di Balik Kame Manucano', 'cerita-di-balik-kame-manucano', 'Cerita di Balik Kame Manucano — simak selengkapnya di blog Kamee Coffee.', '<p>Cerita di Balik Kame Manucano.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-5.avif', NULL, NULL, 'published', '2026-09-21 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (6, 3, 1, 'Menu Akhir Pekan: Mont Blanc dan Cold Brew', 'menu-akhir-pekan-mont-blanc-dan-cold-brew', 'Menu Akhir Pekan: Mont Blanc dan Cold Brew — simak selengkapnya di blog Kamee Coffee.', '<p>Menu Akhir Pekan: Mont Blanc dan Cold Brew.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-6.avif', NULL, NULL, 'published', '2026-09-27 14:57:30', 0, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: stock_purchases; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stock_purchases (id, outlet_id, date, supplier, method, bank, note, total, created_by, created_at, updated_at) VALUES (1, 1, '2026-09-20', 'Belanja 10 hari pertama', 'cash', NULL, 'Dari buku catatan; metode bayar belum tercatat', 2321000, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: cash_entries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (1, 1, '2026-09-20', 'expense', 'bahan_baku', 'Belanja: Susu Rich Milk Diamond ×22, Kopi Klasik (blend) ×3, Kopi Americano ×1, Sirup Gula Aren ×4, Creamer ×4, Sirup Butterscotch ×1, Cup 12 oz + tutup ×110, Botol 1 L + stiker ×20, Plastik ×1', 2321000, 'cash', NULL, 'Belanja 10 hari pertama', 'Dari buku catatan; metode bayar belum tercatat', 'stock_purchase', 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (2, 1, '2026-09-20', 'expense', 'bahan_baku', 'Es batu', 25000, 'cash', NULL, NULL, 'Belanja 20/9 (dari buku catatan); tidak masuk stok/HPP', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (3, 1, '2026-09-20', 'expense', 'bahan_baku', 'Belanja (Az)', 304150, 'cash', NULL, 'Az', 'Tanggal & metode belum tercatat di buku', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (4, 1, '2026-09-20', 'expense', 'ongkir', 'Ongkir', 22000, 'cash', NULL, NULL, 'Tanggal & metode belum tercatat di buku', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (5, 1, '2026-09-20', 'expense', 'lainnya', 'Kekurangan bayar (Adi)', 6000, 'cash', NULL, 'Adi', 'Tanggal & metode belum tercatat di buku. Tertulis ''Adi kurang (6.000)''', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (6, 1, '2026-09-20', 'expense', 'ongkir', 'Ongkir Sukma', 22000, 'cash', NULL, 'Sukma', 'Tanggal & metode belum tercatat di buku. (Umi)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (7, 1, '2026-09-20', 'expense', 'lainnya', 'Ifa & Ikbal', 34000, 'cash', NULL, 'Ifa & Ikbal', 'Tanggal & metode belum tercatat di buku. (Umi) — mohon cek keterangan', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (8, 1, '2026-09-21', 'expense', 'bahan_baku', 'Madu Manuka beli Tiptop', 63000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (9, 1, '2026-09-21', 'expense', 'bahan_baku', 'Strawberry jam beli Alfamart', 20900, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (10, 1, '2026-09-21', 'expense', 'bahan_baku', 'Es Batu Kristal', 5000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (11, 1, '2026-09-21', 'expense', 'bahan_baku', 'Susu Kental Manis Sachet beli Enci', 10000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (12, 1, '2026-09-21', 'expense', 'bahan_baku', 'Parkir tiptop', 2000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (13, 1, '2026-09-22', 'expense', 'bahan_baku', 'Es Batu', 10000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (14, 1, '2026-09-25', 'expense', 'bahan_baku', 'Susu Diamond Rich Milk beli Tiptop 12kotak', 276300, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (15, 1, '2026-09-25', 'expense', 'bahan_baku', 'Whipped cream', 27850, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (16, 1, '2026-09-25', 'expense', 'bahan_baku', 'Biji Kopi Vottrro arabica mandailing 1kg', 228445, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (17, 1, '2026-09-25', 'expense', 'bahan_baku', 'Whipping Cream Rich Gold 500gr', 39200, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (18, 1, '2026-09-25', 'expense', 'bahan_baku', 'Es Batu', 5000, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (19, 1, '2026-10-01', 'expense', 'bahan_baku', 'Gula Aren', 288825, 'cash', NULL, NULL, 'Dari Kasir Kamee (Excel); metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (20, 1, '2026-09-20', 'income', 'penjualan', 'Penjualan 13:24 — Tante Ike: Caramel Latte Kame x1; Spanish Latte Kame x1; Aren Kame x11', 221000, 'bank_transfer', 'BJB', 'Tante Ike', 'Dari Kasir Kamee (Excel). Take Away; Catatan: 8000 gojek; cocok dgn buku tulis (Mike)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (21, 1, '2026-09-20', 'income', 'penjualan', 'Penjualan 13:26 — Tante Unnun: Aren Kame x2; Americano x2; Butterscotch Sea Salt Latte x1; Caramel Latte Kame x1', 104000, 'cash', NULL, 'Tante Unnun', 'Dari Kasir Kamee (Excel). Dine In; cocok dgn buku tulis (Unun)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (22, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan 11:57 — Guru Sukma: Aren Kame x2; Kame Orangecano x1; Iced Matche Latte x1', 73000, 'cash', NULL, 'Guru Sukma', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (23, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan 13:20 — Bu Tini: Aren Kame x6; Iced Strawberry Choco x1', 125000, 'cash', NULL, 'Bu Tini', 'Dari Kasir Kamee (Excel). Online; Ket: SD Neglasari 1; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (24, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan 13:21 — Mimih Nur: Aden Kame 1ltr x1; Kame Manucano x1', 91000, 'bank_transfer', 'BCA', 'Mimih Nur', 'Dari Kasir Kamee (Excel). Dine In; Ket: SD Sukma; cocok dgn buku tulis (Nur)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (25, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan 13:48 — Siska, Delia, Amira: Aren Kame x3', 51000, 'bank_transfer', 'BCA', 'Siska, Delia, Amira', 'Dari Kasir Kamee (Excel). Take Away; cocok dgn buku tulis (Abi)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (26, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan 13:53 — Guru taman: Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame x1', 57000, 'cash', NULL, 'Guru taman', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (27, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan 14:02 — Pesanan By Abi: Dark Chocolate 1L x1; Spanis Latte Kame 1L x1', 175000, 'bank_transfer', 'BCA', 'Pesanan By Abi', 'Dari Kasir Kamee (Excel). Take Away; cocok dgn buku tulis (Rumi)', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (28, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan 14:03 — Pesanan By Abi: Butterscotch Sea Salt Latte x1', 23000, 'cash', NULL, 'Pesanan By Abi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (29, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan 14:04 — Pesanan By Umi: Aren Kame 1L x1', 75000, 'cash', NULL, 'Pesanan By Umi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (30, 1, '2026-09-23', 'income', 'penjualan', 'Penjualan 14:44 — Pesanan Abi: Butterscotch Sea Salt Latte x2; Aren Kame x1', 63000, 'cash', NULL, 'Pesanan Abi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (31, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan 14:45 — Pesanan by Umi: Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1', 108000, 'cash', NULL, 'Pesanan by Umi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (32, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan 14:47 — Aa Robi: Aren Kame 1L x1', 75000, 'cash', NULL, 'Aa Robi', 'Dari Kasir Kamee (Excel). Online; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (33, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan 14:48 — Kak Wiwi Pramuka: Kame Manucano x1; Strawberry Matcha Latte x1', 41000, 'cash', NULL, 'Kak Wiwi Pramuka', 'Dari Kasir Kamee (Excel). Online; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (34, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan 18:30 — Mamah Lia: Aren Kame x2', 34000, 'cash', NULL, 'Mamah Lia', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (35, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan 22:56 — Pesanan By Umi: Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1', 108000, 'cash', NULL, 'Pesanan By Umi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (36, 1, '2026-09-25', 'income', 'penjualan', 'Penjualan 18:19 — Guru delta: Aren Kame 1L x1; Caramel Latte Kame x1; Aren Kame x2; Butterscotch Sea Salt Latte x1; Kame Manucano x1; Pandan Latte Kame x1', 182000, 'cash', NULL, 'Guru delta', 'Dari Kasir Kamee (Excel). Online; Catatan: +gojek 17k; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (37, 1, '2026-09-25', 'income', 'penjualan', 'Penjualan 18:20 — Bang Opick: Americano 1L x1; Pandan Latte Kame x1; Spanish Latte Kame x1', 94000, 'cash', NULL, 'Bang Opick', 'Dari Kasir Kamee (Excel). Online; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (38, 1, '2026-09-25', 'income', 'penjualan', 'Penjualan 18:21 — Sa’id: Aren Kame x2; Kame Manucano x1', 50000, 'cash', NULL, 'Sa’id', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (39, 1, '2026-09-25', 'income', 'penjualan', 'Penjualan 18:21 — Pesanan by Umi: Iced Matche Latte x1; Aren Kame x1', 40000, 'cash', NULL, 'Pesanan by Umi', 'Dari Kasir Kamee (Excel). Online; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (40, 1, '2026-09-26', 'income', 'penjualan', 'Penjualan 21:45 — guru sd taman: Aren Kame x3; Butterscotch Sea Salt Latte x1; Dari Chocolate x1; Pandan Latte Kame x1', 116000, 'cash', NULL, 'guru sd taman', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (41, 1, '2026-09-26', 'income', 'penjualan', 'Penjualan 21:47 — Arisan Teh Indah dan Uwa Ita: Aren Kame x2', 34000, 'cash', NULL, 'Arisan Teh Indah dan Uwa Ita', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (42, 1, '2026-09-26', 'income', 'penjualan', 'Penjualan 21:47 — A Ucu: Aren Kame x1; Butterscotch Sea Salt Latte x1', 40000, 'cash', NULL, 'A Ucu', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (43, 1, '2026-09-26', 'income', 'penjualan', 'Penjualan 21:48 — Umi: Aren Kame x2', 34000, 'cash', NULL, 'Umi', 'Dari Kasir Kamee (Excel). Dine In; Catatan: +ongkir 17k; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (44, 1, '2026-09-28', 'income', 'penjualan', 'Penjualan 18:20 — Fauzan: Aren Kame 1L x1', 75000, 'cash', NULL, 'Fauzan', 'Dari Kasir Kamee (Excel). Online; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (45, 1, '2026-09-29', 'income', 'penjualan', 'Penjualan 11:05 — Teteh Lia: Caramel Latte 1lt x1', 80000, 'cash', NULL, 'Teteh Lia', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (46, 1, '2026-09-29', 'income', 'penjualan', 'Penjualan 21:51 — Pak Camat dan Pak Sidik Sukma: Aren Kame 1L x2; Aren Kame x1', 167000, 'cash', NULL, 'Pak Camat dan Pak Sidik Sukma', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (47, 1, '2026-09-30', 'income', 'penjualan', 'Penjualan 10:51 — Pesanan Abi: Butterscotch Sea Salt Latte x2; Aren Kame x1', 63000, 'cash', NULL, 'Pesanan Abi', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (48, 1, '2026-10-01', 'income', 'penjualan', 'Penjualan 10:52 — Pesanan Umi: Aren Kame x1; Iced Matche Latte x1', 40000, 'cash', NULL, 'Pesanan Umi', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (49, 1, '2026-10-01', 'income', 'penjualan', 'Penjualan 10:55 — Nitya: Kame Orangecano x1; Iced Matche Latte x1; Butterscotch Sea Salt Latte x1; Aren Kame x1; Caramel Latte Kame x1', 96000, 'cash', NULL, 'Nitya', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (50, 1, '2026-10-01', 'income', 'penjualan', 'Penjualan 22:58 — Kak Shanty: Aren Kame 1L x1; Cokelat Reguler 1Lt x1', 165000, 'cash', NULL, 'Kak Shanty', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (51, 1, '2026-10-02', 'income', 'penjualan', 'Penjualan 11:02 — Pesanan Guru Delta: Iced Strawberry Choco x1; Aren Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame 1L x2; Kame Manucano x1', 241000, 'cash', NULL, 'Pesanan Guru Delta', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (52, 1, '2026-10-02', 'income', 'penjualan', 'Penjualan 11:02 — Bunda Adia: Aren Kame 1L x1; Aren Kame x1', 97000, 'cash', NULL, 'Bunda Adia', 'Dari Kasir Kamee (Excel). Dine In; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (53, 1, '2026-10-02', 'income', 'penjualan', 'Penjualan 11:03 — Pesanan Guru Taman: Iced Matche Latte x1; Butterscotch Sea Salt Latte x5; Pandan Latte Kame x1', 155000, 'cash', NULL, 'Pesanan Guru Taman', 'Dari Kasir Kamee (Excel). Take Away; metode bayar belum tercatat', 'manual', NULL, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories (id, name, slug, icon, sort_order, is_active) VALUES (1, 'Based Coffee', 'based-coffee', 'coffee', 1, true);
INSERT INTO public.categories (id, name, slug, icon, sort_order, is_active) VALUES (2, 'Manual Brew', 'manual-brew', 'filter', 2, true);
INSERT INTO public.categories (id, name, slug, icon, sort_order, is_active) VALUES (3, 'Non Coffee', 'non-coffee', 'cup-soda', 3, true);


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: loyalty_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.loyalty_tiers (id, name, min_spend, point_multiplier, perks) VALUES (1, 'Bronze', 0, 1.00, '["1 poin setiap belanja Rp10.000"]');
INSERT INTO public.loyalty_tiers (id, name, min_spend, point_multiplier, perks) VALUES (2, 'Silver', 1000000, 1.25, '["Poin 1,25x","Voucher ulang tahun Rp15.000"]');
INSERT INTO public.loyalty_tiers (id, name, min_spend, point_multiplier, perks) VALUES (3, 'Gold', 5000000, 1.50, '["Poin 1,5x","Gratis upsize setiap Jumat","Voucher ulang tahun Rp30.000"]');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (1, 1, 'Americano', 'americano', 'Espresso dan air — bersih, ringan, tanpa susu.', 'Espresso dan air — bersih, ringan, tanpa susu.', NULL, NULL, 16000, '/images/products/americano-foto.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (2, 1, 'Kame Orangecano', 'kame-orangecano', 'Americano dengan sentuhan jeruk yang segar.', 'Americano dengan sentuhan jeruk yang segar.', NULL, NULL, 18000, '/images/products/kame-orangecano.avif', 0.0, 0, 0, true, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (3, 1, 'Kame Manucano', 'kame-manucano', 'Iced Americano with Manuka Honey.', 'Iced Americano with Manuka Honey.', NULL, NULL, 20000, '/images/products/kame-manucano.avif', 0.0, 0, 0, true, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (4, 1, 'Caramel Latte Kame', 'caramel-latte-kame', 'Latte susu dengan karamel.', 'Latte susu dengan karamel.', NULL, NULL, 18000, '/images/products/caramel-latte-kame.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (5, 1, 'Aren Kame Reguler', 'aren-kame', 'Kopi susu gula aren — with 50% Arabica + 50% Robusta.', 'Kopi susu gula aren — with 50% Arabica + 50% Robusta.', NULL, NULL, 18000, '/images/products/aren-kame-foto.avif', 0.0, 0, 0, true, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (6, 1, 'Pandan Latte Kame', 'pandan-latte-kame', 'Latte dengan aroma pandan.', 'Latte dengan aroma pandan.', NULL, NULL, 18000, '/images/products/pandan-latte-kame.avif', 0.0, 0, 0, true, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (7, 1, 'Spanish Latte Kame', 'spanish-latte-kame', 'Latte manis dengan susu kental.', 'Latte manis dengan susu kental.', NULL, NULL, 18000, '/images/products/spanish-latte-kame.avif', 0.0, 0, 0, true, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (8, 1, 'Butterscotch Sea Salt Latte', 'butterscotch-sea-salt-latte', 'Latte butterscotch dengan sea salt.', 'Latte butterscotch dengan sea salt.', NULL, NULL, 26000, '/images/products/butterscotch-sea-salt-latte-foto.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (9, 1, 'Mont Blanc', 'mont-blanc', 'Menu spesial — hanya tersedia akhir pekan (Sabtu–Minggu).', 'Menu spesial — hanya tersedia akhir pekan (Sabtu–Minggu).', NULL, NULL, 35000, '/images/products/mont-blanc-foto.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (10, 2, 'Local Beans', 'local-beans', 'Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey.', 'Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey.', NULL, NULL, 26000, '/images/products/local-beans.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (11, 2, 'Cold Brew', 'cold-brew', 'Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya akhir pekan.', 'Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya akhir pekan. Hanya tersedia akhir pekan (Sabtu–Minggu).', NULL, NULL, 30000, '/images/products/cold-brew.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (12, 3, 'Iced Matcha Latte', 'iced-matcha-latte', 'Matcha dengan susu dingin.', 'Matcha dengan susu dingin.', NULL, NULL, 23000, '/images/products/iced-matcha-latte.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (13, 3, 'Iced Strawberry Matcha Latte', 'iced-strawberry-matcha-latte', 'Matcha latte dengan stroberi.', 'Matcha latte dengan stroberi.', NULL, NULL, 26000, '/images/products/iced-strawberry-matcha-latte.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (14, 3, 'Iced Matcha Sea Salt Cloud', 'iced-matcha-sea-salt-cloud', 'Matcha dengan lapisan sea salt cream.', 'Matcha dengan lapisan sea salt cream.', NULL, NULL, 25000, '/images/products/iced-matcha-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (15, 3, 'Reguler Chocolate', 'regular-chocolate', 'Cokelat susu klasik. Tersedia juga ukuran 1 L.', 'Cokelat susu klasik. Tersedia juga ukuran 1 L.', NULL, NULL, 18000, '/images/products/regular-chocolate.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (16, 3, 'Premium Dark Chocolate', 'premium-dark-chocolate', 'Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.', 'Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.', NULL, NULL, 25000, '/images/products/premium-dark-chocolate.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (17, 3, 'Iced Chocolate Sea Salt Cloud', 'iced-chocolate-sea-salt-cloud', 'Cokelat dingin dengan lapisan sea salt cream.', 'Cokelat dingin dengan lapisan sea salt cream.', NULL, NULL, 25000, '/images/products/iced-chocolate-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (18, 3, 'Iced Strawberry Choco', 'iced-strawberry-choco', 'Cokelat dingin dengan stroberi.', 'Cokelat dingin dengan stroberi.', NULL, NULL, 23000, '/images/products/iced-strawberry-choco.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (19, 3, 'Iced Strawberry Choco Sea Salt Cloud', 'iced-strawberry-choco-sea-salt-cloud', 'Strawberry choco dengan lapisan sea salt cream.', 'Strawberry choco dengan lapisan sea salt cream.', NULL, NULL, 26000, '/images/products/iced-strawberry-choco-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (20, 1, 'Americano Specialty Blend', 'americano-specialty-blend', 'Blend Arabica Colombia & Arabica Brazil Santos.', 'Blend Arabica Colombia & Arabica Brazil Santos.', NULL, NULL, 26000, '/images/products/americano-specialty-blend.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (21, 1, 'Aren Kame Premium', 'aren-kame-premium', 'Kopi susu gula aren — with 100% Arabica Mandhailing.', 'Kopi susu gula aren — with 100% Arabica Mandhailing.', NULL, NULL, 22000, '/images/products/aren-kame-premium.avif', 0.0, 0, 0, false, true, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (22, 1, 'Aren Sea Salt Kame', 'aren-sea-salt-kame', 'Kopi susu gula aren dengan lapisan sea salt cream.', 'Kopi susu gula aren dengan lapisan sea salt cream.', NULL, NULL, 22000, '/images/products/aren-sea-salt-kame.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (23, 1, 'Butterscotch Latte Kame', 'butterscotch-latte-kame', 'Latte susu dengan butterscotch.', 'Latte susu dengan butterscotch.', NULL, NULL, 18000, '/images/products/butterscotch-latte-kame.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (24, 3, 'Iced Matcha Oatmilk', 'iced-matcha-oatmilk', 'Matcha dengan oat milk dingin.', 'Matcha dengan oat milk dingin.', NULL, NULL, 25000, '/images/products/iced-matcha-oatmilk.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (25, 3, 'Iced Caramel Matcha Latte', 'iced-caramel-matcha-latte', 'Matcha latte dengan karamel.', 'Matcha latte dengan karamel.', NULL, NULL, 25000, '/images/products/iced-caramel-matcha-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (26, 3, 'Iced Aren Matcha Latte', 'iced-aren-matcha-latte', 'Matcha latte dengan gula aren.', 'Matcha latte dengan gula aren.', NULL, NULL, 25000, '/images/products/iced-aren-matcha-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (27, 3, 'Iced Espresso Matcha Latte', 'iced-espresso-matcha-latte', 'Matcha latte dengan shot espresso.', 'Matcha latte dengan shot espresso.', NULL, NULL, 25000, '/images/products/iced-espresso-matcha-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (7, 1, 'Matcha', 'bahan', 'gram', '100 gram (harga belum diisi)', 100.000, 0, 0.000, NULL, 'Harga belum diisi', true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (10, 1, 'Botol 250 ml', 'kemasan', 'pcs', '1 botol (harga belum diisi)', 1.000, 0, 0.000, NULL, 'Harga belum diisi', true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (1, 1, 'Susu Rich Milk Diamond', 'bahan', 'ml', '1 kotak (1 liter)', 1000.000, 23500, 22000.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (2, 1, 'Kopi Klasik (blend)', 'bahan', 'gram', '1 kg', 1000.000, 288000, 3000.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (3, 1, 'Kopi Americano', 'bahan', 'gram', '1/2 kg', 500.000, 220000, 500.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (4, 1, 'Sirup Gula Aren', 'bahan', 'gram', '1 liter (±1.000 gr – cek)', 1000.000, 60000, 4000.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (5, 1, 'Creamer', 'bahan', 'gram', '1 kg', 1000.000, 60000, 4000.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (6, 1, 'Sirup Butterscotch', 'bahan', 'ml', '1 botol (750 ml – cek)', 750.000, 45000, 750.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (8, 1, 'Cup 12 oz + tutup', 'kemasan', 'pcs', '1 pcs', 1.000, 1000, 110.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (9, 1, 'Botol 1 L + stiker', 'kemasan', 'pcs', '1 botol', 1.000, 3500, 20.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (11, 1, 'Plastik', 'kemasan', 'pcs', '1 pak isi 65', 65.000, 15000, 65.000, NULL, NULL, true, '2026-10-07 14:57:30', '2026-10-07 14:57:30', NULL);


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: option_groups; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.option_groups (id, name, type, is_required) VALUES (1, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (2, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (3, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (4, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (5, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (6, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (7, 'Penyajian', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (8, 'Proses Biji', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (9, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (10, 'Ukuran', 'single', true);
INSERT INTO public.option_groups (id, name, type, is_required) VALUES (11, 'Ukuran', 'single', true);


--
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (1, 1, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (2, 1, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (3, 1, 'Bottle 1 L', 59000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (4, 2, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (5, 2, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (6, 2, 'Bottle 1 L', 67000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (7, 3, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (8, 3, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (9, 3, 'Bottle 1 L', 70000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (10, 4, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (11, 4, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (12, 4, 'Bottle 1 L', 67000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (13, 5, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (14, 5, 'Bottle 1 L', 67000, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (15, 6, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (16, 6, 'Bottle 1 L', 95000, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (17, 7, 'Hot', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (18, 7, 'Japanese (iced)', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (19, 8, 'Natural', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (20, 8, 'Washed', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (21, 8, 'Honey', 0, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (22, 9, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (23, 9, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (24, 9, 'Bottle 1 L', 99000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (25, 10, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (26, 10, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (27, 10, 'Bottle 1 L', 78000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (28, 11, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (29, 11, 'Bottle 250 ml', 0, 1);


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: order_item_options; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: order_status_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: outlet_product; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (1, 1, '/images/products/americano-foto.avif', 'Americano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (2, 1, '/images/products/americano-foto-2.avif', 'Americano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (3, 1, '/images/products/americano-foto-3.avif', 'Americano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (4, 2, '/images/products/kame-orangecano.avif', 'Kame Orangecano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (5, 2, '/images/products/kame-orangecano-2.avif', 'Kame Orangecano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (6, 2, '/images/products/kame-orangecano-3.avif', 'Kame Orangecano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (7, 3, '/images/products/kame-manucano.avif', 'Kame Manucano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (8, 3, '/images/products/kame-manucano-2.avif', 'Kame Manucano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (9, 3, '/images/products/kame-manucano-3.avif', 'Kame Manucano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (10, 4, '/images/products/caramel-latte-kame.avif', 'Caramel Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (11, 4, '/images/products/caramel-latte-kame-2.avif', 'Caramel Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (12, 4, '/images/products/caramel-latte-kame-3.avif', 'Caramel Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (13, 5, '/images/products/aren-kame-foto.avif', 'Aren Kame Reguler — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (14, 5, '/images/products/aren-kame-foto-2.avif', 'Aren Kame Reguler — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (15, 5, '/images/products/aren-kame-foto-3.avif', 'Aren Kame Reguler — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (16, 6, '/images/products/pandan-latte-kame.avif', 'Pandan Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (17, 6, '/images/products/pandan-latte-kame-2.avif', 'Pandan Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (18, 6, '/images/products/pandan-latte-kame-3.avif', 'Pandan Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (19, 7, '/images/products/spanish-latte-kame.avif', 'Spanish Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (20, 7, '/images/products/spanish-latte-kame-2.avif', 'Spanish Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (21, 7, '/images/products/spanish-latte-kame-3.avif', 'Spanish Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (22, 8, '/images/products/butterscotch-sea-salt-latte-foto.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (23, 8, '/images/products/butterscotch-sea-salt-latte-foto-2.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (24, 8, '/images/products/butterscotch-sea-salt-latte-foto-3.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (25, 9, '/images/products/mont-blanc-foto.avif', 'Mont Blanc — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (26, 9, '/images/products/mont-blanc-foto-2.avif', 'Mont Blanc — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (27, 9, '/images/products/mont-blanc-foto-3.avif', 'Mont Blanc — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (28, 10, '/images/products/local-beans.avif', 'Local Beans — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (29, 10, '/images/products/local-beans-2.avif', 'Local Beans — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (30, 10, '/images/products/local-beans-3.avif', 'Local Beans — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (31, 11, '/images/products/cold-brew.avif', 'Cold Brew — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (32, 11, '/images/products/cold-brew-2.avif', 'Cold Brew — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (33, 11, '/images/products/cold-brew-3.avif', 'Cold Brew — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (34, 12, '/images/products/iced-matcha-latte.avif', 'Iced Matcha Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (35, 12, '/images/products/iced-matcha-latte-2.avif', 'Iced Matcha Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (36, 12, '/images/products/iced-matcha-latte-3.avif', 'Iced Matcha Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (37, 13, '/images/products/iced-strawberry-matcha-latte.avif', 'Iced Strawberry Matcha Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (38, 13, '/images/products/iced-strawberry-matcha-latte-2.avif', 'Iced Strawberry Matcha Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (39, 13, '/images/products/iced-strawberry-matcha-latte-3.avif', 'Iced Strawberry Matcha Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (40, 14, '/images/products/iced-matcha-sea-salt-cloud.avif', 'Iced Matcha Sea Salt Cloud — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (41, 14, '/images/products/iced-matcha-sea-salt-cloud-2.avif', 'Iced Matcha Sea Salt Cloud — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (42, 14, '/images/products/iced-matcha-sea-salt-cloud-3.avif', 'Iced Matcha Sea Salt Cloud — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (43, 15, '/images/products/regular-chocolate.avif', 'Reguler Chocolate — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (44, 15, '/images/products/regular-chocolate-2.avif', 'Reguler Chocolate — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (45, 15, '/images/products/regular-chocolate-3.avif', 'Reguler Chocolate — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (46, 16, '/images/products/premium-dark-chocolate.avif', 'Premium Dark Chocolate — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (47, 16, '/images/products/premium-dark-chocolate-2.avif', 'Premium Dark Chocolate — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (48, 16, '/images/products/premium-dark-chocolate-3.avif', 'Premium Dark Chocolate — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (49, 17, '/images/products/iced-chocolate-sea-salt-cloud.avif', 'Iced Chocolate Sea Salt Cloud — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (50, 17, '/images/products/iced-chocolate-sea-salt-cloud-2.avif', 'Iced Chocolate Sea Salt Cloud — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (51, 17, '/images/products/iced-chocolate-sea-salt-cloud-3.avif', 'Iced Chocolate Sea Salt Cloud — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (52, 18, '/images/products/iced-strawberry-choco.avif', 'Iced Strawberry Choco — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (53, 18, '/images/products/iced-strawberry-choco-2.avif', 'Iced Strawberry Choco — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (54, 18, '/images/products/iced-strawberry-choco-3.avif', 'Iced Strawberry Choco — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (55, 19, '/images/products/iced-strawberry-choco-sea-salt-cloud.avif', 'Iced Strawberry Choco Sea Salt Cloud — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (56, 19, '/images/products/iced-strawberry-choco-sea-salt-cloud-2.avif', 'Iced Strawberry Choco Sea Salt Cloud — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (57, 19, '/images/products/iced-strawberry-choco-sea-salt-cloud-3.avif', 'Iced Strawberry Choco Sea Salt Cloud — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (58, 20, '/images/products/americano-specialty-blend.avif', 'Americano Specialty Blend — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (59, 20, '/images/products/americano-specialty-blend-2.avif', 'Americano Specialty Blend — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (60, 20, '/images/products/americano-specialty-blend-3.avif', 'Americano Specialty Blend — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (61, 21, '/images/products/aren-kame-premium.avif', 'Aren Kame Premium — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (62, 21, '/images/products/aren-kame-premium-2.avif', 'Aren Kame Premium — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (63, 21, '/images/products/aren-kame-premium-3.avif', 'Aren Kame Premium — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (64, 22, '/images/products/aren-sea-salt-kame.avif', 'Aren Sea Salt Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (65, 22, '/images/products/aren-sea-salt-kame-2.avif', 'Aren Sea Salt Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (66, 22, '/images/products/aren-sea-salt-kame-3.avif', 'Aren Sea Salt Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (67, 23, '/images/products/butterscotch-latte-kame.avif', 'Butterscotch Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (68, 23, '/images/products/butterscotch-latte-kame-2.avif', 'Butterscotch Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (69, 23, '/images/products/butterscotch-latte-kame-3.avif', 'Butterscotch Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (70, 24, '/images/products/iced-matcha-oatmilk.avif', 'Iced Matcha Oatmilk — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (71, 24, '/images/products/iced-matcha-oatmilk-2.avif', 'Iced Matcha Oatmilk — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (72, 24, '/images/products/iced-matcha-oatmilk-3.avif', 'Iced Matcha Oatmilk — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (73, 25, '/images/products/iced-caramel-matcha-latte.avif', 'Iced Caramel Matcha Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (74, 25, '/images/products/iced-caramel-matcha-latte-2.avif', 'Iced Caramel Matcha Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (75, 25, '/images/products/iced-caramel-matcha-latte-3.avif', 'Iced Caramel Matcha Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (76, 26, '/images/products/iced-aren-matcha-latte.avif', 'Iced Aren Matcha Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (77, 26, '/images/products/iced-aren-matcha-latte-2.avif', 'Iced Aren Matcha Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (78, 26, '/images/products/iced-aren-matcha-latte-3.avif', 'Iced Aren Matcha Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (79, 27, '/images/products/iced-espresso-matcha-latte.avif', 'Iced Espresso Matcha Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (80, 27, '/images/products/iced-espresso-matcha-latte-2.avif', 'Iced Espresso Matcha Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (81, 27, '/images/products/iced-espresso-matcha-latte-3.avif', 'Iced Espresso Matcha Latte — Kamee Coffee', 3);


--
-- Data for Name: product_option_group; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (1, 1, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (2, 2, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (3, 3, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (4, 4, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (5, 4, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (6, 4, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (7, 4, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (10, 7, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (10, 8, 1);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (15, 5, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (16, 6, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (20, 9, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (21, 10, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (22, 11, 0);
INSERT INTO public.product_option_group (product_id, option_group_id, sort_order) VALUES (23, 4, 0);


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (1, 'KAMEEHEMAT', 'Hemat 20% (maks Rp15.000)', 'percent', 20, 40000, 15000, 500, 3, '2026-07-09 14:57:30', '2026-12-06 14:57:30', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (2, 'GRATISONGKIR', 'Gratis ongkir min. belanja Rp50.000', 'free_delivery', 0, 50000, 15000, NULL, 5, '2026-07-09 14:57:30', '2026-12-06 14:57:30', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (3, 'BELI1GRATIS1', 'Beli 1 Gratis 1 (minuman yang sama)', 'bogo', 0, 0, 35000, 100, 1, '2026-07-09 14:57:30', '2026-12-06 14:57:30', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (4, 'NGOPI10K', 'Potongan Rp10.000 min. belanja Rp75.000', 'fixed', 10000, 75000, NULL, NULL, 2, '2026-07-09 14:57:30', '2026-12-06 14:57:30', NULL, true);


--
-- Data for Name: promotion_usages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (1, 1, 5, false, 'Resep asli pemilik. Aren, creamer, dan susu dishake/frother sampai tercampur rata, tuang lewat saringan, tambah es batu 100 gr (cup), lalu masukkan espresso. Kopi dalam gram biji: espresso 40 ml ≈ 20 gr (asumsi ekstraksi 1:2). Es batu tidak masuk HPP (dicatat sebagai pengeluaran).', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (2, 1, 1, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (3, 1, 2, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (4, 1, 3, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (5, 1, 4, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (6, 1, 6, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (7, 1, 7, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (8, 1, 8, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (9, 1, 9, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (10, 1, 10, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (11, 1, 11, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (12, 1, 12, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (13, 1, 13, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (14, 1, 14, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (15, 1, 15, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (16, 1, 16, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (17, 1, 17, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (18, 1, 18, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (19, 1, 19, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (20, 1, 20, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (21, 1, 21, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (22, 1, 22, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (23, 1, 23, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (24, 1, 24, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (25, 1, 25, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (26, 1, 26, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (27, 1, 27, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: recipe_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (1, 1, 'Cup', 4, 30.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (2, 1, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (3, 1, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (4, 1, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (5, 1, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (6, 1, 'Bottle 250 ml', 4, 38.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (7, 1, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (8, 1, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (9, 1, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (10, 1, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (11, 1, 'Bottle 1 L', 4, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (12, 1, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (13, 1, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (14, 1, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (15, 1, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (16, 2, 'Cup', 3, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (17, 2, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (18, 2, 'Bottle 250 ml', 3, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (19, 2, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (20, 2, 'Bottle 1 L', 3, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (21, 2, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (22, 3, 'Cup', 3, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (23, 3, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (24, 3, 'Bottle 250 ml', 3, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (25, 3, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (26, 3, 'Bottle 1 L', 3, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (27, 3, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (28, 4, 'Cup', 3, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (29, 4, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (30, 4, 'Bottle 250 ml', 3, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (31, 4, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (32, 4, 'Bottle 1 L', 3, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (33, 4, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (34, 5, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (35, 5, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (36, 5, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (37, 5, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (38, 5, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (39, 5, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (40, 5, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (41, 5, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (42, 5, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (43, 5, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (44, 5, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (45, 5, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (46, 6, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (47, 6, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (48, 6, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (49, 6, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (50, 6, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (51, 6, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (52, 6, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (53, 6, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (54, 6, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (55, 6, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (56, 6, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (57, 6, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (58, 7, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (59, 7, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (60, 7, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (61, 7, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (62, 7, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (63, 7, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (64, 7, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (65, 7, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (66, 7, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (67, 7, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (68, 7, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (69, 7, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (70, 8, NULL, 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (71, 8, NULL, 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (72, 8, NULL, 6, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (73, 8, NULL, 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (74, 8, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (75, 9, NULL, 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (76, 9, NULL, 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (77, 9, NULL, 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (78, 9, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (79, 10, NULL, 2, 15.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (80, 10, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (81, 11, NULL, 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (82, 11, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (83, 12, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (84, 12, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (85, 12, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (86, 13, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (87, 13, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (88, 13, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (89, 14, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (90, 14, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (91, 14, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (92, 15, 'Cup', 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (93, 15, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (94, 15, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (95, 15, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (96, 15, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (97, 15, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (98, 16, 'Cup', 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (99, 16, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (100, 16, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (101, 16, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (102, 16, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (103, 16, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (104, 17, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (105, 17, NULL, 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (106, 17, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (107, 18, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (108, 18, NULL, 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (109, 18, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (110, 19, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (111, 19, NULL, 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (112, 19, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (113, 20, 'Cup', 3, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (114, 20, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (115, 20, 'Bottle 250 ml', 3, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (116, 20, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (117, 20, 'Bottle 1 L', 3, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (118, 20, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (119, 21, 'Cup', 4, 30.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (120, 21, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (121, 21, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (122, 21, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (123, 21, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (124, 21, 'Bottle 250 ml', 4, 38.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (125, 21, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (126, 21, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (127, 21, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (128, 21, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (129, 21, 'Bottle 1 L', 4, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (130, 21, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (131, 21, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (132, 21, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (133, 21, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (134, 22, 'Cup', 4, 30.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (135, 22, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (136, 22, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (137, 22, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (138, 22, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (139, 22, 'Bottle 250 ml', 4, 38.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (140, 22, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (141, 22, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (142, 22, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (143, 22, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (144, 23, 'Cup', 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (145, 23, 'Cup', 1, 120.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (146, 23, 'Cup', 5, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (147, 23, 'Cup', 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (148, 23, 'Cup', 6, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (149, 23, 'Bottle 250 ml', 2, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (150, 23, 'Bottle 250 ml', 1, 181.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (151, 23, 'Bottle 250 ml', 5, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (152, 23, 'Bottle 250 ml', 10, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (153, 23, 'Bottle 250 ml', 6, 25.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (154, 23, 'Bottle 1 L', 2, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (155, 23, 'Bottle 1 L', 1, 725.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (156, 23, 'Bottle 1 L', 5, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (157, 23, 'Bottle 1 L', 9, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (158, 23, 'Bottle 1 L', 6, 100.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (159, 24, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (160, 24, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (161, 24, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (162, 25, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (163, 25, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (164, 25, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (165, 26, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (166, 26, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (167, 26, NULL, 4, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (168, 26, NULL, 8, 1.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (169, 27, NULL, 7, 5.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (170, 27, NULL, 1, 150.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (171, 27, NULL, 2, 20.000);
INSERT INTO public.recipe_items (id, recipe_id, option_name, ingredient_id, qty) VALUES (172, 27, NULL, 8, 1.000);


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (1, 1, 'purchase', 22000.000, 23.5000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (2, 2, 'purchase', 3000.000, 288.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (3, 3, 'purchase', 500.000, 440.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (4, 4, 'purchase', 4000.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (5, 5, 'purchase', 4000.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (6, 6, 'purchase', 750.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (7, 8, 'purchase', 110.000, 1000.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (8, 9, 'purchase', 20.000, 3500.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (9, 11, 'purchase', 65.000, 230.7692, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-07 14:57:30', '2026-10-07 14:57:30');


--
-- Data for Name: stock_purchase_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (1, 1, 1, 22.000, 23500, 1000.000, 22000.000, 517000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (2, 1, 2, 3.000, 288000, 1000.000, 3000.000, 864000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (3, 1, 3, 1.000, 220000, 500.000, 500.000, 220000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (4, 1, 4, 4.000, 60000, 1000.000, 4000.000, 240000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (5, 1, 5, 4.000, 60000, 1000.000, 4000.000, 240000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (6, 1, 6, 1.000, 45000, 750.000, 750.000, 45000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (7, 1, 8, 110.000, 1000, 1.000, 110.000, 110000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (8, 1, 9, 20.000, 3500, 1.000, 20.000, 70000);
INSERT INTO public.stock_purchase_items (id, stock_purchase_id, ingredient_id, packs, pack_price, pack_size, qty, subtotal) VALUES (9, 1, 11, 1.000, 15000, 65.000, 65.000, 15000);


--
-- Name: banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.banners_id_seq', 3, true);


--
-- Name: blog_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blog_categories_id_seq', 3, true);


--
-- Name: blogs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blogs_id_seq', 6, true);


--
-- Name: cash_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_entries_id_seq', 53, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 4, false);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- Name: customer_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_addresses_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, false);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ingredients_id_seq', 11, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: loyalty_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loyalty_tiers_id_seq', 3, true);


--
-- Name: loyalty_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loyalty_transactions_id_seq', 1, false);


--
--



--
-- Name: option_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.option_groups_id_seq', 12, false);


--
-- Name: options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.options_id_seq', 29, true);


--
-- Name: order_item_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_item_options_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: order_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_status_logs_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: otp_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.otp_codes_id_seq', 1, false);


--
-- Name: outlets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.outlets_id_seq', 2, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personal_access_tokens_id_seq', 1, false);


--
-- Name: product_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_images_id_seq', 81, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 28, false);


--
-- Name: promotion_usages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promotion_usages_id_seq', 1, false);


--
-- Name: promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promotions_id_seq', 4, true);


--
-- Name: recipe_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipe_items_id_seq', 172, true);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipes_id_seq', 27, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, false);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 9, true);


--
-- Name: stock_purchase_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_purchase_items_id_seq', 9, true);


--
-- Name: stock_purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_purchases_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--


COMMIT;
