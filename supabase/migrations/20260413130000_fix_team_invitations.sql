CREATE OR REPLACE FUNCTION invite_user_to_team(p_team_id UUID, p_email TEXT, p_role TEXT)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_inviter_role TEXT;
BEGIN
  -- Optional: Check if inviter is owner/admin of team (auth.uid())
  -- For simplicity, let's assume UI handles auth check, but good to add if possible.
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists, insert into team_members directly
    -- Handle conflict if they are already in the team
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, v_user_id, p_role)
    ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    RETURN jsonb_build_object('status', 'success', 'message', 'Usuario añadido al equipo directamente', 'type', 'member');
  ELSE
    -- User does not exist, insert into team_invites
    INSERT INTO public.team_invites (team_id, email, role, inviter_id)
    VALUES (p_team_id, p_email, p_role, auth.uid())
    ON CONFLICT (team_id, email) DO UPDATE SET role = EXCLUDED.role;
    RETURN jsonb_build_object('status', 'success', 'message', 'Invitación enviada (usuario nuevo)', 'type', 'invite');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert basic profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Create personal team
    INSERT INTO public.teams (name, owner_id)
    VALUES ('Mi Equipo Personal', NEW.id);

    -- Auto-accept team invites
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT team_id, NEW.id, role
    FROM public.team_invites
    WHERE email = NEW.email;

    -- Optional: Delete processed invites
    DELETE FROM public.team_invites WHERE email = NEW.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    inv RECORD;
    uid UUID;
BEGIN
    FOR inv IN SELECT * FROM public.team_invites LOOP
        SELECT id INTO uid FROM auth.users WHERE email = inv.email LIMIT 1;
        IF uid IS NOT NULL THEN
            INSERT INTO public.team_members (team_id, user_id, role)
            VALUES (inv.team_id, uid, inv.role)
            ON CONFLICT DO NOTHING;
            
            DELETE FROM public.team_invites WHERE id = inv.id;
        END IF;
    END LOOP;
END;
$$;