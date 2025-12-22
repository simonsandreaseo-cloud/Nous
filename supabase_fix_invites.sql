
-- Policy: Allow users to view invites they sent or received
create policy "View project invites" on project_invites
  for select using (
    auth.uid() = invited_by or 
    email = (select email from auth.users where id = auth.uid()) or
    exists (select 1 from projects where id = project_invites.project_id and owner_id = auth.uid())
  );

-- Policy: Allow project owners/admins to insert invites
create policy "Insert project invites" on project_invites
  for insert with check (
    exists (select 1 from projects where id = project_invites.project_id and owner_id = auth.uid()) or
    exists (select 1 from project_members where project_id = project_invites.project_id and user_id = auth.uid() and role = 'admin')
  );

-- Policy: Allow project owners/admins to delete invites
create policy "Delete project invites" on project_invites
  for delete using (
    exists (select 1 from projects where id = project_invites.project_id and owner_id = auth.uid()) or
    exists (select 1 from project_members where project_id = project_invites.project_id and user_id = auth.uid() and role = 'admin')
  );
