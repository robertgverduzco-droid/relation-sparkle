INSERT INTO public.user_roles (user_id, role)
SELECT id, 'founder'::app_role FROM auth.users WHERE email = 'robertgverduzco@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;