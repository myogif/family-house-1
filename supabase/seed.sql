-- ============================================================================
-- KeluargaKita Database Seeder with Yogi's Family Account
-- Email: moh.yogi10065@gmail.com | Password: 12345678 | Name: Yogi (Kepala Keluarga)
--
-- Run with: supabase db seed (or supabase db reset)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_yogi_id uuid;
  v_siti_id uuid;
  v_budi_id uuid;
  v_ani_id uuid;
  v_family_id uuid;
  v_encrypted_pw text;

  v_w_bca_id uuid;
  v_w_gopay_id uuid;
  v_w_cash_id uuid;

  v_r_ayam_id uuid;
  v_r_sayur_id uuid;
  v_r_nasgor_id uuid;
  v_r_pisang_id uuid;

  fam_row RECORD;
  v_owner_id uuid;
  v_owner_name text;
  v_spouse_id uuid;
  v_spouse_name text;
  v_child1_id uuid;
  v_child1_name text;
  v_child2_id uuid;
  v_child2_name text;
  v_has_spouse boolean;
  v_has_children boolean;
BEGIN
  -- Hash password '12345678' using standard bcrypt
  v_encrypted_pw := crypt('12345678', gen_salt('bf', 10));

  -- ========================================================================
  -- A. SEED AUTH USERS & IDENTITIES
  -- ========================================================================

  -- 1. Yogi (Kepala Keluarga / Husband)
  SELECT id INTO v_yogi_id FROM auth.users WHERE email = 'moh.yogi10065@gmail.com' LIMIT 1;
  IF v_yogi_id IS NULL THEN
    v_yogi_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_sso_user, is_anonymous
    ) VALUES (
      v_yogi_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'moh.yogi10065@gmail.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Yogi"}'::jsonb,
      now(), now(),
      '', '', '', '',
      '', '', '', '',
      false, false
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_yogi_id, v_yogi_id::text, v_yogi_id,
      jsonb_build_object('sub', v_yogi_id::text, 'email', 'moh.yogi10065@gmail.com'),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = '{"name":"Yogi"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_yogi_id;
  END IF;

  -- 2. Siti (Istri / Wife)
  SELECT id INTO v_siti_id FROM auth.users WHERE email = 'siti@keluargakita.com' LIMIT 1;
  IF v_siti_id IS NULL THEN
    v_siti_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_sso_user, is_anonymous
    ) VALUES (
      v_siti_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'siti@keluargakita.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Siti"}'::jsonb,
      now(), now(),
      '', '', '', '',
      '', '', '', '',
      false, false
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_siti_id, v_siti_id::text, v_siti_id,
      jsonb_build_object('sub', v_siti_id::text, 'email', 'siti@keluargakita.com'),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = '{"name":"Siti"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_siti_id;
  END IF;

  -- 3. Budi (Anak 1 / Child)
  SELECT id INTO v_budi_id FROM auth.users WHERE email = 'budi@keluargakita.com' LIMIT 1;
  IF v_budi_id IS NULL THEN
    v_budi_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_sso_user, is_anonymous
    ) VALUES (
      v_budi_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'budi@keluargakita.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Budi"}'::jsonb,
      now(), now(),
      '', '', '', '',
      '', '', '', '',
      false, false
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_budi_id, v_budi_id::text, v_budi_id,
      jsonb_build_object('sub', v_budi_id::text, 'email', 'budi@keluargakita.com'),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = '{"name":"Budi"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_budi_id;
  END IF;

  -- 4. Ani (Anak 2 / Child)
  SELECT id INTO v_ani_id FROM auth.users WHERE email = 'ani@keluargakita.com' LIMIT 1;
  IF v_ani_id IS NULL THEN
    v_ani_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_sso_user, is_anonymous
    ) VALUES (
      v_ani_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'ani@keluargakita.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Ani"}'::jsonb,
      now(), now(),
      '', '', '', '',
      '', '', '', '',
      false, false
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_ani_id, v_ani_id::text, v_ani_id,
      jsonb_build_object('sub', v_ani_id::text, 'email', 'ani@keluargakita.com'),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = '{"name":"Ani"}'::jsonb,
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        updated_at = now()
    WHERE id = v_ani_id;
  END IF;

  -- Ensure Profiles Exist
  INSERT INTO public.profiles (id, name, updated_at) VALUES
    (v_yogi_id, 'Yogi', now()),
    (v_siti_id, 'Siti', now()),
    (v_budi_id, 'Budi', now()),
    (v_ani_id,  'Ani',  now())
  ON CONFLICT (id) DO UPDATE SET name = excluded.name, updated_at = now();

  -- ========================================================================
  -- B. SEED FAMILY "Keluarga Yogi" & MEMBERSHIP
  -- ========================================================================
  SELECT f.id INTO v_family_id
  FROM public.families f
  WHERE f.owner_id = v_yogi_id
  LIMIT 1;

  IF v_family_id IS NULL THEN
    v_family_id := gen_random_uuid();
    INSERT INTO public.families (id, name, description, owner_id, join_code, created_at, updated_at)
    VALUES (v_family_id, 'Keluarga Yogi', 'Keluarga bahagia Yogi & Siti bersama anak-anak tercinta', v_yogi_id, 'FAM-YOGI26', now(), now());
  ELSE
    UPDATE public.families
    SET name = 'Keluarga Yogi', description = 'Keluarga bahagia Yogi & Siti bersama anak-anak tercinta', updated_at = now()
    WHERE id = v_family_id;
  END IF;

  -- Family Members
  INSERT INTO public.family_members (family_id, user_id, role, status, joined_at)
  VALUES
    (v_family_id, v_yogi_id, 'husband', 'active', now() - interval '60 days'),
    (v_family_id, v_siti_id, 'wife',    'active', now() - interval '60 days'),
    (v_family_id, v_budi_id, 'child',   'active', now() - interval '60 days'),
    (v_family_id, v_ani_id,  'child',   'active', now() - interval '60 days')
  ON CONFLICT (family_id, user_id)
  DO UPDATE SET role = excluded.role, status = 'active';

  -- ========================================================================
  -- C. SEED COMPREHENSIVE DATA FOR KELUARGA YOGI & ALL ACTIVE FAMILIES
  -- ========================================================================
  FOR fam_row IN
    SELECT DISTINCT f.id AS fam_id, f.name AS fam_name
    FROM public.families f
    JOIN public.family_members fm ON fm.family_id = f.id AND fm.status = 'active'
  LOOP
    -- Fetch active roles
    SELECT fm.user_id, p.name INTO v_owner_id, v_owner_name
    FROM public.family_members fm
    JOIN public.profiles p ON p.id = fm.user_id
    WHERE fm.family_id = fam_row.fam_id AND fm.role = 'husband' AND fm.status = 'active'
    LIMIT 1;

    SELECT fm.user_id, p.name INTO v_spouse_id, v_spouse_name
    FROM public.family_members fm
    JOIN public.profiles p ON p.id = fm.user_id
    WHERE fm.family_id = fam_row.fam_id AND fm.role = 'wife' AND fm.status = 'active'
    LIMIT 1;
    v_has_spouse := v_spouse_id IS NOT NULL;

    SELECT fm.user_id, p.name INTO v_child1_id, v_child1_name
    FROM public.family_members fm
    JOIN public.profiles p ON p.id = fm.user_id
    WHERE fm.family_id = fam_row.fam_id AND fm.role = 'child' AND fm.status = 'active'
    ORDER BY fm.joined_at
    LIMIT 1;
    v_has_children := v_child1_id IS NOT NULL;

    SELECT fm.user_id, p.name INTO v_child2_id, v_child2_name
    FROM public.family_members fm
    JOIN public.profiles p ON p.id = fm.user_id
    WHERE fm.family_id = fam_row.fam_id AND fm.role = 'child' AND fm.status = 'active'
    ORDER BY fm.joined_at
    OFFSET 1 LIMIT 1;

    RAISE NOTICE 'Seeding full domain for family: % (Owner: %)', fam_row.fam_name, v_owner_name;

    -- Clean old sub-records to guarantee fresh & consistent state
    DELETE FROM public.transactions WHERE family_id = fam_row.fam_id;
    DELETE FROM public.wallets WHERE family_id = fam_row.fam_id;
    DELETE FROM public.budgets WHERE family_id = fam_row.fam_id;
    DELETE FROM public.goals WHERE family_id = fam_row.fam_id;
    DELETE FROM public.debts WHERE family_id = fam_row.fam_id;
    DELETE FROM public.subscriptions WHERE family_id = fam_row.fam_id;
    DELETE FROM public.assets WHERE family_id = fam_row.fam_id;
    DELETE FROM public.meals WHERE family_id = fam_row.fam_id;
    DELETE FROM public.recipes WHERE family_id = fam_row.fam_id;
    DELETE FROM public.shopping_items WHERE family_id = fam_row.fam_id;
    DELETE FROM public.tasks WHERE family_id = fam_row.fam_id;
    DELETE FROM public.calendar_events WHERE family_id = fam_row.fam_id;
    DELETE FROM public.journal_entries WHERE family_id = fam_row.fam_id;
    DELETE FROM public.activity_logs WHERE family_id = fam_row.fam_id;

    -- 1. WALLETS
    v_w_bca_id := gen_random_uuid();
    v_w_gopay_id := gen_random_uuid();
    v_w_cash_id := gen_random_uuid();

    INSERT INTO public.wallets (id, family_id, name, type, initial_balance, current_balance, account_number, color, icon) VALUES
      (v_w_bca_id, fam_row.fam_id, 'BCA Tabungan Utama', 'bank', 5000000, 7500000, '8720192831', '#1e40af', 'bank'),
      (v_w_gopay_id, fam_row.fam_id, 'GoPay Keluarga', 'ewallet', 500000, 850000, '081234567890', '#059669', 'wallet'),
      (v_w_cash_id, fam_row.fam_id, 'Uang Tunai / Cash', 'cash', 300000, 600000, '', '#d97706', 'coins');

    -- 2. TRANSACTIONS
    INSERT INTO public.transactions (id, family_id, user_id, member_name, description, category, amount, type, date, wallet_id) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Gaji Bulanan',          'Gaji',         8500000, 'income',  now() - interval '2 days', v_w_bca_id),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Bonus Proyek Website',  'Bonus',        1500000, 'income',  now() - interval '10 days', v_w_bca_id),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Tagihan Listrik & Air', 'Tagihan',       620000, 'expense', now() - interval '3 days', v_w_bca_id),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Beli Sepatu Sekolah',   'Belanja',       420000, 'expense', now() - interval '7 days', v_w_gopay_id);

    IF v_has_spouse THEN
      INSERT INTO public.transactions (id, family_id, user_id, member_name, description, category, amount, type, date, wallet_id) VALUES
        (gen_random_uuid(), fam_row.fam_id, v_spouse_id, v_spouse_name, 'Belanja Sayur & Dapur', 'Makanan', 350000, 'expense', now() - interval '1 day', v_w_cash_id),
        (gen_random_uuid(), fam_row.fam_id, v_spouse_id, v_spouse_name, 'Makan Siang Restoran',  'Makanan', 280000, 'expense', now() - interval '5 days', v_w_gopay_id),
        (gen_random_uuid(), fam_row.fam_id, v_spouse_id, v_spouse_name, 'Langganan WiFi Rumah',  'Tagihan', 375000, 'expense', now() - interval '6 days', v_w_bca_id),
        (gen_random_uuid(), fam_row.fam_id, v_spouse_id, v_spouse_name, 'Nonton Bioskop Weekend','Hiburan', 180000, 'expense', now() - interval '8 days', v_w_gopay_id);
    END IF;

    IF v_has_children THEN
      INSERT INTO public.transactions (id, family_id, user_id, member_name, description, category, amount, type, date, wallet_id) VALUES
        (gen_random_uuid(), fam_row.fam_id, v_child1_id, v_child1_name, 'Bensin Motor Sekolah', 'Transportasi', 150000, 'expense', now() - interval '4 days', v_w_cash_id),
        (gen_random_uuid(), fam_row.fam_id, v_child1_id, v_child1_name, 'Buku Pelajaran Sekolah', 'Pendidikan', 250000, 'expense', now() - interval '9 days', v_w_bca_id);
    END IF;

    -- Transfer transaction
    INSERT INTO public.transactions (id, family_id, user_id, member_name, description, category, amount, type, date, wallet_id, destination_wallet_id, transfer_fee) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Top Up Saldo GoPay dari BCA', 'Transfer', 500000, 'transfer', now() - interval '12 hours', v_w_bca_id, v_w_gopay_id, 1000);

    -- 3. BUDGETS
    INSERT INTO public.budgets (id, family_id, category, "limit", period) VALUES
      (gen_random_uuid(), fam_row.fam_id, 'Makanan',       2500000, 'month'),
      (gen_random_uuid(), fam_row.fam_id, 'Tagihan',       1800000, 'month'),
      (gen_random_uuid(), fam_row.fam_id, 'Transportasi',   800000, 'month'),
      (gen_random_uuid(), fam_row.fam_id, 'Belanja',       1000000, 'month'),
      (gen_random_uuid(), fam_row.fam_id, 'Hiburan',        600000, 'month'),
      (gen_random_uuid(), fam_row.fam_id, 'Pendidikan',    1200000, 'month');

    -- 4. GOALS
    INSERT INTO public.goals (id, family_id, name, target_amount, current_amount, target_date) VALUES
      (gen_random_uuid(), fam_row.fam_id, 'Dana Liburan Keluarga ke Bali', 15000000, 6500000, (now() + interval '120 days')::date),
      (gen_random_uuid(), fam_row.fam_id, 'Dana Darurat 6 Bulan',         30000000, 18000000, (now() + interval '300 days')::date);

    -- 5. DEBTS & LOANS
    INSERT INTO public.debts (id, family_id, user_id, type, person_name, total_amount, paid_amount, due_date, status, notes) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'debt', 'Cicilan Elektronik (Mesin Cuci)', 4500000, 1500000, (now() + interval '90 days')::date, 'partial', 'Cicilan 0% 6 bulan'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'loan', 'Budi Santoso (Rekan Kantor)',      1000000,       0, (now() + interval '30 days')::date, 'unpaid',  'Pinjaman darurat bulan lalu');

    -- 6. SUBSCRIPTIONS
    INSERT INTO public.subscriptions (id, family_id, user_id, name, category, amount, billing_cycle, next_billing_date, wallet_id, notes) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'Tagihan Listrik PLN Pascabayar', 'Tagihan', 550000, 'monthly', (now() + interval '15 days')::date, v_w_bca_id, 'Listrik rumah utama'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'WiFi Indihome Fiber 50Mbps',     'Tagihan', 375000, 'monthly', (now() + interval '20 days')::date, v_w_bca_id, 'Internet keluarga'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'Netflix Premium 4K',             'Hiburan', 186000, 'monthly', (now() + interval '10 days')::date, v_w_gopay_id, 'Akun bersama'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'BPJS Kesehatan Mandiri',         'Tagihan', 150000, 'monthly', (now() + interval '5 days')::date,  v_w_bca_id, 'Iuran kesehatan keluarga');

    -- 7. ASSETS & NET WORTH
    INSERT INTO public.assets (id, family_id, user_id, name, category, estimated_value, purchase_price, purchase_date, location, notes) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'Rumah Tinggal Utama',          'property',       450000000, 320000000, '2022-06-15', 'Komplek Permata Hijau', 'SHM atas nama keluarga'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'Sepeda Motor Honda Vario 160', 'vehicle',         18500000,  24000000, '2023-03-10', 'Garasi Rumah',          'Kendaraan operasional harian'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, 'Logam Mulia Emas Antam 10gr',  'precious_metal',  14200000,  10500000, '2021-11-20', 'Brankas Pribadi',       'Investasi tabungan emas');

    -- 8. RECIPES (Buku Resep Master)
    v_r_ayam_id := gen_random_uuid();
    v_r_sayur_id := gen_random_uuid();
    v_r_nasgor_id := gen_random_uuid();
    v_r_pisang_id := gen_random_uuid();

    INSERT INTO public.recipes (id, family_id, user_id, author_name, title, category, meal_type, servings, prep_time, cook_time, ingredients, instructions, video_url) VALUES
      (v_r_ayam_id, fam_row.fam_id, v_owner_id, v_owner_name, 'Ayam Ungkep Bumbu Lengkuas', 'makanan', 'makan_siang', 4, 20, 40,
       ARRAY['1 kg Daging Ayam', '150 gram Lengkuas parut', '4 siung Bawang Putih', '6 siung Bawang Merah', '2 batang Serai', '3 lembar Daun Salam'],
       'Haluskan bumbu kecuali serai dan lengkuas. Balurkan ke ayam bersama parutan lengkuas dan daun salam. Ungkep dengan sedikit air hingga matang dan meresap. Goreng ayam dan bumbu serundeng hingga keemasan.',
       'https://www.youtube.com/results?search_query=resep+ayam+ungkep+lengkuas'),

      (v_r_sayur_id, fam_row.fam_id, COALESCE(v_spouse_id, v_owner_id), COALESCE(v_spouse_name, v_owner_name), 'Sayur Asem Segar Jakarta', 'makanan', 'makan_siang', 4, 15, 25,
       ARRAY['1 ikat Kacang Panjang', '1 buah Jagung Manis', '1 buah Labu Siam', 'Segenggam Melinjo', '3 buah Asam Jawa segar', '2 buah Cabai Merah'],
       'Rebus air bersama bumbu halus (bawang dan cabai), daun salam, lengkuas, dan asam jawa. Masukkan jagung dan melinjo hingga empuk. Masukkan labu siam dan kacang panjang hingga matang segar.',
       'https://www.youtube.com/results?search_query=resep+sayur+asem+segar'),

      (v_r_nasgor_id, fam_row.fam_id, v_owner_id, v_owner_name, 'Nasi Goreng Spesial Keluarga', 'makanan', 'sarapan', 3, 10, 15,
       ARRAY['3 porsi Nasi Dingin', '2 butir Telur Ayam', '5 butir Bakso Sapi', '3 siung Bawang Putih', '2 sdm Kecap Manis', '1 sdm Saus Tiram'],
       'Tumis bawang putih dan bawang merah hingga harum. Orak-arik telur dan masukkan bakso. Masukkan nasi putih, kecap manis, saus tiram, dan bumbu. Aduk dengan api besar hingga bumbu merata dan harum.',
       'https://www.youtube.com/results?search_query=resep+nasi+goreng+spesial'),

      (v_r_pisang_id, fam_row.fam_id, COALESCE(v_spouse_id, v_owner_id), COALESCE(v_spouse_name, v_owner_name), 'Pisang Goreng Crispy Madu', 'cemilan', 'camilan', 4, 10, 15,
       ARRAY['1 sisir Pisang Kepok Matang', '150 gram Tepung Terigu', '50 gram Tepung Beras', '2 sdm Madu', 'Minyak Goreng'],
       'Campurkan tepung terigu, tepung beras, madu, gula, dan air hingga adonan kental. Belah pisang bentuk kipas, celupkan ke adonan tepung. Goreng dalam minyak panas sedang hingga keemasan dan renyah.',
       'https://www.youtube.com/results?search_query=resep+pisang+goreng+crispy');

    -- 9. MEALS PLANNING
    INSERT INTO public.meals (id, family_id, user_id, author_name, title, category, meal_type, date, ingredients, notes, cost, done, video_url, recipe_id) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Nasi Goreng Spesial Keluarga', 'makanan', 'sarapan', now(),
       ARRAY['Nasi putih', 'Telur ayam', 'Bawang merah', 'Kecap manis'], 'Sarapan pagi praktis keluarga', 25000, true, '', v_r_nasgor_id),

      (gen_random_uuid(), fam_row.fam_id, COALESCE(v_spouse_id, v_owner_id), COALESCE(v_spouse_name, v_owner_name), 'Ayam Ungkep Lengkuas & Sayur Asem', 'makanan', 'makan_siang', now(),
       ARRAY['Daging ayam 1kg', 'Lengkuas', 'Kacang panjang', 'Jagung manis'], 'Menu makan siang favorit keluarga', 65000, false, '', v_r_ayam_id),

      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Soto Ayam Lamongan (Beli di luar)', 'makanan', 'makan_malam', now() + interval '1 day',
       ARRAY['Soto ayam', 'Nasi putih', 'Kerupuk', 'Jeruk nipis']::text[], 'Menu santai makan malam luar', 50000, false, '', NULL);

    -- 10. SHOPPING ITEMS
    INSERT INTO public.shopping_items (id, family_id, name, quantity, category, bought) VALUES
      (gen_random_uuid(), fam_row.fam_id, 'Minyak Goreng 2 Liter', 1, 'Bahan Masak', true),
      (gen_random_uuid(), fam_row.fam_id, 'Beras Ramos 5kg',       1, 'Bahan Masak', true),
      (gen_random_uuid(), fam_row.fam_id, 'Deterjen Pakaian',       1, 'Kebersihan',  false),
      (gen_random_uuid(), fam_row.fam_id, 'Susu UHT Cokelat 1L',    2, 'Minuman',     false);

    -- 11. TASKS & CALENDAR EVENTS
    INSERT INTO public.tasks (id, family_id, title, assignee_id, assignee_name, due_date, priority, status) VALUES
      (gen_random_uuid(), fam_row.fam_id, 'Bayar tagihan listrik & WiFi', v_owner_id, v_owner_name, (now() + interval '2 days')::date, 'high',   'todo'),
      (gen_random_uuid(), fam_row.fam_id, 'Belanja bulanan supermarket',  COALESCE(v_spouse_id, v_owner_id), COALESCE(v_spouse_name, v_owner_name), (now() + interval '1 day')::date,  'medium', 'todo'),
      (gen_random_uuid(), fam_row.fam_id, 'Servis berkala motor Honda',   v_owner_id, v_owner_name, (now() + interval '5 days')::date, 'low',    'done');

    INSERT INTO public.calendar_events (id, family_id, title, description, date) VALUES
      (gen_random_uuid(), fam_row.fam_id, 'Ulang Tahun Ani',       'Perayaan kumpul makan bersama di rumah', now() + interval '4 days'),
      (gen_random_uuid(), fam_row.fam_id, 'Rapat Anggaran Bulanan', 'Evaluasi pos pengeluaran & tabungan',   now() + interval '7 days');

    -- 12. JOURNAL ENTRIES
    INSERT INTO public.journal_entries (id, family_id, user_id, author_name, title, content, mood, visibility, date) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Minggu yang Produktif Bersama Keluarga',
       'Hari ini kami membereskan rumah bersama, menyusun menu mingguan dan mengevaluasi anggaran bulan ini.', 'bersemangat', 'family', now() - interval '1 day'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'Rencana Liburan Akhir Tahun',
       'Mulai menyisihkan dana liburan ke Bali dan riset tiket penerbangan.', 'senang', 'family', now() - interval '4 days');

    -- 13. ACTIVITY LOGS
    INSERT INTO public.activity_logs (id, family_id, actor_id, actor_name, action, message) VALUES
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'transaction.created',  'Menambahkan data transaksi gaji bulanan'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'wallet.created',       'Membuat dompet BCA Tabungan Utama'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'recipe.created',       'Menambahkan resep Ayam Ungkep Lengkuas'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'meal.created',         'Menjadwalkan menu makan keluarga'),
      (gen_random_uuid(), fam_row.fam_id, v_owner_id, v_owner_name, 'goal.created',         'Menetapkan target tabungan Liburan Bali');

  END LOOP;
END;
$$;
