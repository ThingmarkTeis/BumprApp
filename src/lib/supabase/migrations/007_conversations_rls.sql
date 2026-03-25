-- RLS policies for conversations and messages
-- Allows renters and owners to create, read, and participate in conversations

-- Conversations: participants can read their own conversations
CREATE POLICY "Participants can read own conversations"
  ON conversations FOR SELECT
  USING (renter_id = auth.uid() OR owner_id = auth.uid());

-- Conversations: renters can create conversations for their bookings
CREATE POLICY "Renters can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    renter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.renter_id = auth.uid()
    )
  );

-- Messages: participants can read messages in their conversations
CREATE POLICY "Participants can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- Messages: participants can send messages in their conversations
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- Messages: sender can update own messages (for read_at)
CREATE POLICY "Participants can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );
