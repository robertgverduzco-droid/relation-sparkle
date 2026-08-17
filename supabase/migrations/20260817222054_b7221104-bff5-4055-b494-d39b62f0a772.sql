-- P0-2 — Message UPDATE authorization.
-- Previously `messages_sender_update` allowed ANY participant of the conversation
-- to update ANY column of ANY message in it, including another member's body,
-- metadata and flagged_severity. Messages are authored evidence: they are
-- immutable once sent, and the only permitted mutation by a member is the
-- recipient setting read_at.

DROP POLICY IF EXISTS messages_sender_update ON public.messages;

-- Column-level grant: RLS cannot restrict columns, so authority is narrowed here.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

CREATE POLICY messages_recipient_read_receipt
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id IS DISTINCT FROM auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  )
  WITH CHECK (
    sender_id IS DISTINCT FROM auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  );