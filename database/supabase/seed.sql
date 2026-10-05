-- =============================================================================
-- Kamee Coffee API — data awal TANPA data demo (KAMEE_SEED_DEMO=false)
-- Dihasilkan oleh database/supabase/build.sh pada 2026-10-05 03:31 UTC. Jangan edit manual.
-- Isi: outlet, 2 akun admin (sandi: password — SEGERA GANTI), menu, opsi, promo, banner, blog, tier loyalitas, pembukuan awal.
-- =============================================================================

BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

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

INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (1, 'Ngopi Hemat 20%', 'Pakai kode KAMEEHEMAT untuk semua menu', '/images/banners/banner-1.avif', '/images/banners/banner-1.avif', '/promo', 'home', 0, '2026-09-05 10:31:52', '2026-12-05 10:31:52', true);
INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (2, 'Kame Manucano', 'Iced Americano dengan Manuka Honey — favorit pelanggan', '/images/banners/banner-2.avif', '/images/banners/banner-2.avif', '/menu/kame-manucano', 'home', 1, '2026-09-05 10:31:52', '2026-12-05 10:31:52', true);
INSERT INTO public.banners (id, title, subtitle, image_desktop, image_mobile, link_url, placement, sort_order, starts_at, ends_at, is_active) VALUES (3, 'Gratis Ongkir sekitar Taman Cibodas', 'Minimal belanja Rp50.000 dengan kode GRATISONGKIR', '/images/banners/banner-3.avif', '/images/banners/banner-3.avif', '/promo', 'home', 2, '2026-09-05 10:31:52', '2026-12-05 10:31:52', true);


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blog_categories (id, name, slug) VALUES (1, 'Tips Kopi', 'tips-kopi');
INSERT INTO public.blog_categories (id, name, slug) VALUES (2, 'Cerita Kamee', 'cerita-kamee');
INSERT INTO public.blog_categories (id, name, slug) VALUES (3, 'Promo & Event', 'promo-event');


--
-- Data for Name: outlets; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.outlets (id, name, slug, address, city, lat, lng, phone_wa, open_time, close_time, is_open, delivery_radius_km, created_at, updated_at) VALUES (1, 'Kamee Coffee Taman Cibodas', 'kamee-taman-cibodas', 'Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Sangiang Jaya, Kec. Periuk', 'Kota Tangerang', -6.1819389, 106.5971757, '6281280871630', '10:00:00', '17:00:00', true, 5.00, '2026-10-05 10:31:51', '2026-10-05 10:31:51');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, password, role, outlet_id, is_active, last_login_at, remember_token, created_at, updated_at) VALUES (1, 'Super Admin Kamee', 'superadmin@kamee.id', '$2y$12$1b3Is0WpdLZeALTl.79z4unyX/dc73jBvn6TxvzhUbYi4JROHj8Me', 'super_admin', NULL, true, NULL, NULL, '2026-10-05 10:31:51', '2026-10-05 10:31:51');
INSERT INTO public.users (id, name, email, password, role, outlet_id, is_active, last_login_at, remember_token, created_at, updated_at) VALUES (2, 'Admin Kamee Taman Cibodas', 'admin.cibodas@kamee.id', '$2y$12$1g3Uj5bG7k5gGqMoeTaQku3ndSeymqahSQMfvImLvWrXYnQZiqPRO', 'outlet_admin', 1, true, NULL, NULL, '2026-10-05 10:31:51', '2026-10-05 10:31:51');


--
-- Data for Name: blogs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (1, 1, 1, 'Cara Membuat Kopi Susu Aren di Rumah', 'cara-membuat-kopi-susu-aren-di-rumah', 'Cara Membuat Kopi Susu Aren di Rumah — simak selengkapnya di blog Kamee Coffee.', '<p>Cara Membuat Kopi Susu Aren di Rumah.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-1.avif', NULL, NULL, 'published', '2026-08-26 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (2, 1, 1, 'Mengenal Perbedaan Arabika dan Robusta', 'mengenal-perbedaan-arabika-dan-robusta', 'Mengenal Perbedaan Arabika dan Robusta — simak selengkapnya di blog Kamee Coffee.', '<p>Mengenal Perbedaan Arabika dan Robusta.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-2.avif', NULL, NULL, 'published', '2026-09-01 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (3, 1, 1, '5 Tips Menyimpan Biji Kopi agar Tetap Segar', '5-tips-menyimpan-biji-kopi-agar-tetap-segar', '5 Tips Menyimpan Biji Kopi agar Tetap Segar — simak selengkapnya di blog Kamee Coffee.', '<p>5 Tips Menyimpan Biji Kopi agar Tetap Segar.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-3.avif', NULL, NULL, 'published', '2026-09-07 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (4, 1, 1, 'Natural, Washed, atau Honey? Mengenal Proses Biji Kopi', 'natural-washed-atau-honey-mengenal-proses-biji-kopi', 'Natural, Washed, atau Honey? Mengenal Proses Biji Kopi — simak selengkapnya di blog Kamee Coffee.', '<p>Natural, Washed, atau Honey? Mengenal Proses Biji Kopi.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-4.avif', NULL, NULL, 'published', '2026-09-13 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (5, 2, 1, 'Cerita di Balik Kame Manucano', 'cerita-di-balik-kame-manucano', 'Cerita di Balik Kame Manucano — simak selengkapnya di blog Kamee Coffee.', '<p>Cerita di Balik Kame Manucano.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-5.avif', NULL, NULL, 'published', '2026-09-19 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.blogs (id, blog_category_id, author_id, title, slug, excerpt, content, cover, meta_title, meta_description, status, published_at, views, created_at, updated_at) VALUES (6, 3, 1, 'Menu Akhir Pekan: Mont Blanc dan Cold Brew', 'menu-akhir-pekan-mont-blanc-dan-cold-brew', 'Menu Akhir Pekan: Mont Blanc dan Cold Brew — simak selengkapnya di blog Kamee Coffee.', '<p>Menu Akhir Pekan: Mont Blanc dan Cold Brew.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>', '/images/blog/blog-6.avif', NULL, NULL, 'published', '2026-09-25 10:31:52', 0, '2026-10-05 10:31:52', '2026-10-05 10:31:52');


--
-- Data for Name: stock_purchases; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stock_purchases (id, outlet_id, date, supplier, method, bank, note, total, created_by, created_at, updated_at) VALUES (1, 1, '2026-09-20', 'Belanja 10 hari pertama', 'cash', NULL, 'Dari buku catatan; metode bayar belum tercatat', 2321000, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');


--
-- Data for Name: cash_entries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (1, 1, '2026-09-20', 'expense', 'bahan_baku', 'Belanja: Susu Rich Milk Diamond ×22, Kopi Klasik (blend) ×3, Kopi Americano ×1, Sirup Gula Aren ×4, Creamer ×4, Sirup Butterscotch ×1, Cup 12 oz + tutup ×110, Botol 1 L + stiker ×20, Plastik ×1', 2321000, 'cash', NULL, 'Belanja 10 hari pertama', 'Dari buku catatan; metode bayar belum tercatat', 'stock_purchase', 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (2, 1, '2026-09-20', 'expense', 'bahan_baku', 'Es batu', 25000, 'cash', NULL, NULL, 'Belanja 20/9 (dari buku catatan); tidak masuk stok/HPP', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (3, 1, '2026-09-20', 'expense', 'bahan_baku', 'Belanja (Az)', 304150, 'cash', NULL, 'Az', 'Tanggal & metode belum tercatat di buku', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (4, 1, '2026-09-20', 'expense', 'ongkir', 'Ongkir', 22000, 'cash', NULL, NULL, 'Tanggal & metode belum tercatat di buku', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (5, 1, '2026-09-20', 'expense', 'lainnya', 'Kekurangan bayar (Adi)', 6000, 'cash', NULL, 'Adi', 'Tanggal & metode belum tercatat di buku. Tertulis ''Adi kurang (6.000)''', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (6, 1, '2026-09-20', 'expense', 'ongkir', 'Ongkir Sukma', 22000, 'cash', NULL, 'Sukma', 'Tanggal & metode belum tercatat di buku. (Umi)', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (7, 1, '2026-09-20', 'expense', 'lainnya', 'Ifa & Ikbal', 34000, 'cash', NULL, 'Ifa & Ikbal', 'Tanggal & metode belum tercatat di buku. (Umi) — mohon cek keterangan', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (8, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan — Nur', 91000, 'bank_transfer', 'BCA', 'Nur', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (9, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan — Arum', 17000, 'bank_transfer', 'BCA', 'Arum', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (10, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan — Abi', 51000, 'bank_transfer', 'BCA', 'Abi', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (11, 1, '2026-09-22', 'income', 'penjualan', 'Penjualan — Rumi', 175000, 'bank_transfer', 'BCA', 'Rumi', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (12, 1, '2026-09-23', 'income', 'penjualan', 'Penjualan — Aa', 61000, 'bank_transfer', 'BCA', 'Aa', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (13, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan — Aa', 17000, 'bank_transfer', 'BCA', 'Aa', 'Bacaan tulisan tangan, mohon cek', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (14, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan — Az', 61000, 'bank_transfer', 'BCA', 'Az', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (15, 1, '2026-09-24', 'income', 'penjualan', 'Penjualan — AG', 80000, 'bank_transfer', 'BJB', 'AG', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (16, 1, '2026-09-20', 'income', 'penjualan', 'Penjualan — Mike', 221000, 'bank_transfer', 'BJB', 'Mike', 'Bacaan tulisan tangan, mohon cek', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (17, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan — Rifqo', 23000, 'bank_transfer', 'BJB', 'Rifqo', 'Bacaan tulisan tangan, mohon cek', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (18, 1, '2026-09-21', 'income', 'penjualan', 'Penjualan — Mudi Rafi', 33000, 'bank_transfer', 'BJB', 'Mudi Rafi', 'Bacaan tulisan tangan, mohon cek', 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (19, 1, '2026-09-20', 'income', 'penjualan', 'Penjualan — Unun', 104000, 'cash', NULL, 'Unun', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.cash_entries (id, outlet_id, date, type, category, description, amount, method, bank, counterparty, note, source, stock_purchase_id, created_by, created_at, updated_at) VALUES (20, 1, '2026-09-20', 'income', 'penjualan', 'Penjualan — Camat', 177000, 'cash', NULL, 'Camat', NULL, 'manual', NULL, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');


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

INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (1, 1, 'Americano', 'americano', 'Espresso dan air — bersih, ringan, tanpa susu.', 'Espresso dan air — bersih, ringan, tanpa susu.', NULL, NULL, 15000, '/images/products/americano.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (2, 1, 'Kame Orangecano', 'kame-orangecano', 'Americano dengan sentuhan jeruk yang segar.', 'Americano dengan sentuhan jeruk yang segar.', NULL, NULL, 16000, '/images/products/kame-orangecano.avif', 0.0, 0, 0, true, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (3, 1, 'Kame Manucano', 'kame-manucano', 'Iced Americano with Manuka Honey.', 'Iced Americano with Manuka Honey.', NULL, NULL, 18000, '/images/products/kame-manucano.avif', 0.0, 0, 0, true, true, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (4, 1, 'Caramel Latte Kame', 'caramel-latte-kame', 'Latte susu dengan karamel.', 'Latte susu dengan karamel.', NULL, NULL, 17000, '/images/products/caramel-latte-kame.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (5, 1, 'Aren Kame', 'aren-kame', 'Kopi susu dengan gula aren.', 'Kopi susu dengan gula aren.', NULL, NULL, 17000, '/images/products/aren-kame.avif', 0.0, 0, 0, true, true, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (6, 1, 'Pandan Latte Kame', 'pandan-latte-kame', 'Latte dengan aroma pandan.', 'Latte dengan aroma pandan.', NULL, NULL, 17000, '/images/products/pandan-latte-kame.avif', 0.0, 0, 0, true, true, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (7, 1, 'Spanish Latte Kame', 'spanish-latte-kame', 'Latte manis dengan susu kental.', 'Latte manis dengan susu kental.', NULL, NULL, 17000, '/images/products/spanish-latte-kame.avif', 0.0, 0, 0, true, true, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (8, 1, 'Butterscotch Sea Salt Latte', 'butterscotch-sea-salt-latte', 'Latte butterscotch dengan sea salt.', 'Latte butterscotch dengan sea salt.', NULL, NULL, 23000, '/images/products/butterscotch-sea-salt-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (9, 1, 'Mont Blanc', 'mont-blanc', 'Menu spesial — hanya tersedia akhir pekan (Sabtu–Minggu).', 'Menu spesial — hanya tersedia akhir pekan (Sabtu–Minggu).', NULL, NULL, 35000, '/images/products/mont-blanc.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (10, 2, 'Local Beans', 'local-beans', 'Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey.', 'Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey.', NULL, NULL, 26000, '/images/products/local-beans.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (11, 2, 'Cold Brew', 'cold-brew', 'Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya akhir pekan.', 'Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya akhir pekan. Hanya tersedia akhir pekan (Sabtu–Minggu).', NULL, NULL, 28000, '/images/products/cold-brew.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (12, 3, 'Iced Matcha Latte', 'iced-matcha-latte', 'Matcha dengan susu dingin.', 'Matcha dengan susu dingin.', NULL, NULL, 23000, '/images/products/iced-matcha-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (13, 3, 'Iced Strawberry Matcha Latte', 'iced-strawberry-matcha-latte', 'Matcha latte dengan stroberi.', 'Matcha latte dengan stroberi.', NULL, NULL, 25000, '/images/products/iced-strawberry-matcha-latte.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (14, 3, 'Iced Matcha Sea Salt Cloud', 'iced-matcha-sea-salt-cloud', 'Matcha dengan lapisan sea salt cream.', 'Matcha dengan lapisan sea salt cream.', NULL, NULL, 25000, '/images/products/iced-matcha-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (15, 3, 'Regular Chocolate', 'regular-chocolate', 'Cokelat susu klasik. Tersedia juga ukuran 1 L.', 'Cokelat susu klasik. Tersedia juga ukuran 1 L.', NULL, NULL, 18000, '/images/products/regular-chocolate.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (16, 3, 'Premium Dark Chocolate', 'premium-dark-chocolate', 'Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.', 'Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.', NULL, NULL, 25000, '/images/products/premium-dark-chocolate.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (17, 3, 'Iced Chocolate Sea Salt Cloud', 'iced-chocolate-sea-salt-cloud', 'Cokelat dingin dengan lapisan sea salt cream.', 'Cokelat dingin dengan lapisan sea salt cream.', NULL, NULL, 25000, '/images/products/iced-chocolate-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (18, 3, 'Iced Strawberry Choco', 'iced-strawberry-choco', 'Cokelat dingin dengan stroberi.', 'Cokelat dingin dengan stroberi.', NULL, NULL, 23000, '/images/products/iced-strawberry-choco.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.products (id, category_id, name, slug, short_description, description, composition, calories, base_price, image, rating_avg, review_count, sold_count, is_featured, is_best_seller, is_active, created_at, updated_at, deleted_at) VALUES (19, 3, 'Iced Strawberry Choco Sea Salt Cloud', 'iced-strawberry-choco-sea-salt-cloud', 'Strawberry choco dengan lapisan sea salt cream.', 'Strawberry choco dengan lapisan sea salt cream.', NULL, NULL, 26000, '/images/products/iced-strawberry-choco-sea-salt-cloud.avif', 0.0, 0, 0, false, false, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (7, 1, 'Matcha', 'bahan', 'gram', '100 gram (harga belum diisi)', 100.000, 0, 0.000, NULL, 'Harga belum diisi', true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (10, 1, 'Botol 250 ml', 'kemasan', 'pcs', '1 botol (harga belum diisi)', 1.000, 0, 0.000, NULL, 'Harga belum diisi', true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (1, 1, 'Susu Rich Milk Diamond', 'bahan', 'ml', '1 kotak (1 liter)', 1000.000, 23500, 22000.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (2, 1, 'Kopi Klasik (blend)', 'bahan', 'gram', '1 kg', 1000.000, 288000, 3000.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (3, 1, 'Kopi Americano', 'bahan', 'gram', '1/2 kg', 500.000, 220000, 500.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (4, 1, 'Sirup Gula Aren', 'bahan', 'gram', '1 liter (±1.000 gr – cek)', 1000.000, 60000, 4000.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (5, 1, 'Creamer', 'bahan', 'gram', '1 kg', 1000.000, 60000, 4000.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (6, 1, 'Sirup Butterscotch', 'bahan', 'ml', '1 botol (750 ml – cek)', 750.000, 45000, 750.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (8, 1, 'Cup 12 oz + tutup', 'kemasan', 'pcs', '1 pcs', 1.000, 1000, 110.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (9, 1, 'Botol 1 L + stiker', 'kemasan', 'pcs', '1 botol', 1.000, 3500, 20.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);
INSERT INTO public.ingredients (id, outlet_id, name, kind, unit, pack_label, pack_size, pack_price, stock_qty, min_stock, note, is_active, created_at, updated_at, deleted_at) VALUES (11, 1, 'Plastik', 'kemasan', 'pcs', '1 pak isi 65', 65.000, 15000, 65.000, NULL, NULL, true, '2026-10-05 10:31:52', '2026-10-05 10:31:52', NULL);


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


--
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (1, 1, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (2, 1, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (3, 1, 'Bottle 1 L', 50000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (4, 2, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (5, 2, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (6, 2, 'Bottle 1 L', 59000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (7, 3, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (8, 3, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (9, 3, 'Bottle 1 L', 67000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (10, 4, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (11, 4, 'Bottle 250 ml', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (12, 4, 'Bottle 1 L', 63000, 2);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (13, 5, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (14, 5, 'Bottle 1 L', 67000, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (15, 6, 'Cup', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (16, 6, 'Bottle 1 L', 95000, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (17, 7, 'Hot', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (18, 7, 'Japanese (iced)', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (19, 8, 'Natural', 0, 0);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (20, 8, 'Washed', 0, 1);
INSERT INTO public.options (id, option_group_id, name, price_delta, sort_order) VALUES (21, 8, 'Honey', 0, 2);


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

INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (1, 1, '/images/products/americano.avif', 'Americano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (2, 1, '/images/products/americano-2.avif', 'Americano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (3, 1, '/images/products/americano-3.avif', 'Americano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (4, 2, '/images/products/kame-orangecano.avif', 'Kame Orangecano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (5, 2, '/images/products/kame-orangecano-2.avif', 'Kame Orangecano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (6, 2, '/images/products/kame-orangecano-3.avif', 'Kame Orangecano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (7, 3, '/images/products/kame-manucano.avif', 'Kame Manucano — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (8, 3, '/images/products/kame-manucano-2.avif', 'Kame Manucano — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (9, 3, '/images/products/kame-manucano-3.avif', 'Kame Manucano — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (10, 4, '/images/products/caramel-latte-kame.avif', 'Caramel Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (11, 4, '/images/products/caramel-latte-kame-2.avif', 'Caramel Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (12, 4, '/images/products/caramel-latte-kame-3.avif', 'Caramel Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (13, 5, '/images/products/aren-kame.avif', 'Aren Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (14, 5, '/images/products/aren-kame-2.avif', 'Aren Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (15, 5, '/images/products/aren-kame-3.avif', 'Aren Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (16, 6, '/images/products/pandan-latte-kame.avif', 'Pandan Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (17, 6, '/images/products/pandan-latte-kame-2.avif', 'Pandan Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (18, 6, '/images/products/pandan-latte-kame-3.avif', 'Pandan Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (19, 7, '/images/products/spanish-latte-kame.avif', 'Spanish Latte Kame — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (20, 7, '/images/products/spanish-latte-kame-2.avif', 'Spanish Latte Kame — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (21, 7, '/images/products/spanish-latte-kame-3.avif', 'Spanish Latte Kame — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (22, 8, '/images/products/butterscotch-sea-salt-latte.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (23, 8, '/images/products/butterscotch-sea-salt-latte-2.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (24, 8, '/images/products/butterscotch-sea-salt-latte-3.avif', 'Butterscotch Sea Salt Latte — Kamee Coffee', 3);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (25, 9, '/images/products/mont-blanc.avif', 'Mont Blanc — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (26, 9, '/images/products/mont-blanc-2.avif', 'Mont Blanc — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (27, 9, '/images/products/mont-blanc-3.avif', 'Mont Blanc — Kamee Coffee', 3);
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
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (43, 15, '/images/products/regular-chocolate.avif', 'Regular Chocolate — Kamee Coffee', 1);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (44, 15, '/images/products/regular-chocolate-2.avif', 'Regular Chocolate — Kamee Coffee', 2);
INSERT INTO public.product_images (id, product_id, path, alt, sort_order) VALUES (45, 15, '/images/products/regular-chocolate-3.avif', 'Regular Chocolate — Kamee Coffee', 3);
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


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (1, 'KAMEEHEMAT', 'Hemat 20% (maks Rp15.000)', 'percent', 20, 40000, 15000, 500, 3, '2026-07-07 10:31:52', '2026-12-04 10:31:52', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (2, 'GRATISONGKIR', 'Gratis ongkir min. belanja Rp50.000', 'free_delivery', 0, 50000, 15000, NULL, 5, '2026-07-07 10:31:52', '2026-12-04 10:31:52', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (3, 'BELI1GRATIS1', 'Beli 1 Gratis 1 (minuman yang sama)', 'bogo', 0, 0, 35000, 100, 1, '2026-07-07 10:31:52', '2026-12-04 10:31:52', NULL, true);
INSERT INTO public.promotions (id, code, name, type, value, min_spend, max_discount, quota, per_customer_limit, starts_at, ends_at, outlet_id, is_active) VALUES (4, 'NGOPI10K', 'Potongan Rp10.000 min. belanja Rp75.000', 'fixed', 10000, 75000, NULL, NULL, 2, '2026-07-07 10:31:52', '2026-12-04 10:31:52', NULL, true);


--
-- Data for Name: promotion_usages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (1, 1, 5, false, 'Resep asli pemilik. Aren, creamer, dan susu dishake/frother sampai tercampur rata, tuang lewat saringan, tambah es batu 100 gr (cup), lalu masukkan espresso. Kopi dalam gram biji: espresso 40 ml ≈ 20 gr (asumsi ekstraksi 1:2). Es batu tidak masuk HPP (dicatat sebagai pengeluaran).', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (2, 1, 1, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (3, 1, 2, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (4, 1, 3, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (5, 1, 4, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (6, 1, 6, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (7, 1, 7, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (8, 1, 8, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (9, 1, 9, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (10, 1, 10, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (11, 1, 11, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (12, 1, 12, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (13, 1, 13, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (14, 1, 14, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (15, 1, 15, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (16, 1, 16, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (17, 1, 17, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (18, 1, 18, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.recipes (id, outlet_id, product_id, is_sample, note, updated_by, created_at, updated_at) VALUES (19, 1, 19, true, 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.', 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');


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


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (1, 1, 'purchase', 22000.000, 23.5000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (2, 2, 'purchase', 3000.000, 288.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (3, 3, 'purchase', 500.000, 440.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (4, 4, 'purchase', 4000.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (5, 5, 'purchase', 4000.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (6, 6, 'purchase', 750.000, 60.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (7, 8, 'purchase', 110.000, 1000.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (8, 9, 'purchase', 20.000, 3500.0000, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');
INSERT INTO public.stock_movements (id, ingredient_id, type, qty, unit_cost, reference, note, order_id, stock_purchase_id, created_by, created_at, updated_at) VALUES (9, 11, 'purchase', 65.000, 230.7692, 'Belanja #1', 'Belanja 10 hari pertama', NULL, 1, 1, '2026-10-05 10:31:52', '2026-10-05 10:31:52');


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

SELECT pg_catalog.setval('public.cash_entries_id_seq', 20, true);


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

SELECT pg_catalog.setval('public.option_groups_id_seq', 9, false);


--
-- Name: options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.options_id_seq', 21, true);


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

SELECT pg_catalog.setval('public.product_images_id_seq', 57, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 20, false);


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

SELECT pg_catalog.setval('public.recipe_items_id_seq', 112, true);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipes_id_seq', 19, true);


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
