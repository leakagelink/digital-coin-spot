DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@nadex.com';

  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@nadex.com',
      crypt('Divyansh@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin","display_name":"Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', 'admin@nadex.com', 'email_verified', true)::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  ELSE
    v_user_id := v_existing;
    UPDATE auth.users
    SET encrypted_password = crypt('Divyansh@123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (v_user_id, 'admin@nadex.com', 'Admin')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance)
  VALUES (v_user_id, 0)
  ON CONFLICT DO NOTHING;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;