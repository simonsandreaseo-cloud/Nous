-- 1. Update handle_new_user to automatically process and activate team invites upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- Process pending team invites - transform them into active team members
  INSERT INTO public.team_members (team_id, user_id, role, status, custom_permissions)
  SELECT team_id, new.id, role, 'active', custom_permissions
  FROM public.team_invites
  WHERE email = new.email
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- Delete processed invites
  DELETE FROM public.team_invites
  WHERE email = new.email;

  -- Also check for project_invites if any (legacy system)
  INSERT INTO public.project_members (project_id, user_id, role)
  SELECT project_id, new.id, role
  FROM public.project_invites
  WHERE email = new.email
  ON CONFLICT (project_id, user_id) DO NOTHING;

  DELETE FROM public.project_invites
  WHERE email = new.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Retroactively activate all currently pending team members
-- The user said: "que no tenga que aceptar nada, que sea parte del equipo de inmediato"
UPDATE public.team_members
SET status = 'active'
WHERE status = 'pending';

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
