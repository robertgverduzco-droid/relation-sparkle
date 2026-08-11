REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.admin_audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.security_kill_switches FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES ON public.member_consents FROM authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT SELECT ON public.security_kill_switches TO authenticated;
GRANT SELECT, INSERT ON public.member_consents TO authenticated;