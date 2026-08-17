DELETE FROM public.user_roles
WHERE user_id = '201674a4-934a-404a-b11b-5a9dc9cc6854'
  AND role = 'moderator';

INSERT INTO public.admin_audit_log (actor_role, action, data_class, metadata, purpose)
VALUES ('system', 'founder.role.moderator_revoked', 0,
  '{"roles_after": ["founder"], "admin_granted": false, "subject": "redacted"}'::jsonb,
  'Founder account retains founder governance only; moderator authority revoked per founder directive.');