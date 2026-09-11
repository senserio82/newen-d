create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_signup_bonus integer := 5000;
begin
  insert into public.profiles (id, email, company_name, points)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    v_signup_bonus
  );

  insert into public.point_transactions (user_id, delta, reason)
  values (new.id, v_signup_bonus, 'signup_bonus');

  return new;
end;
$$ language plpgsql security definer;
