import { supabase } from "@/lib/supabase/client";
import { Conversation, Message } from "@/types";

export async function getConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_conversations");
    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData.map((c: any): Conversation => ({
        id: c.id,
        participantId: c.participant_id || "",
        participantName: c.participant_name || "User",
        participantAvatar: c.participant_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.participant_name || "User")}&background=F6C945&color=1E1E1E`,
        lastMessage: c.last_message || "No messages yet",
        lastMessageTime: c.last_message_time
          ? new Date(c.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        unreadCount: c.unread_count || 0,
        online: true,
      }));
    }
  } catch (err) {
    console.warn("RPC get_my_conversations failed, falling back to direct query:", err);
  }

  const { data: participations, error } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id,
      last_read_at,
      conversation:conversation_id (
        id,
        updated_at,
        participants:conversation_participants (
          user_id,
          profile:user_id (id, full_name, avatar_url)
        )
      )
    `);

  if (error || !participations) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  // Get last messages for each conversation
  const convList: Conversation[] = [];
  for (const p of participations) {
    const conv = p.conversation as any;
    if (!conv) continue;

    // Find the other participant
    const other = conv.participants?.find((part: any) => part.user_id !== user?.id) || conv.participants?.[0];
    const otherProfile = other?.profile;

    // Fetch the latest message
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMsg = lastMsgs?.[0];

    convList.push({
      id: conv.id,
      participantId: otherProfile?.id || other?.user_id || "",
      participantName: otherProfile?.full_name || "Support",
      participantAvatar: otherProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherProfile?.full_name || "User")}&background=F6C945&color=1E1E1E`,
      lastMessage: lastMsg?.content || "No messages yet",
      lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      unreadCount: 0,
      online: true,
    });
  }

  return convList;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data: rpcMsgs, error: rpcErr } = await supabase.rpc("get_conversation_messages", {
      p_conv_id: conversationId,
    });

    if (!rpcErr && Array.isArray(rpcMsgs)) {
      return rpcMsgs.map((m: any): Message => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: m.sender_name || "User",
        content: m.content,
        timestamp: m.created_at,
        read: Boolean(m.read),
        type: m.type || "text",
      }));
    }
  } catch (err) {
    console.warn("RPC get_conversation_messages failed, falling back:", err);
  }

  const { data, error } = await supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      read_at,
      type
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data.map((m: any): Message => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderName: "User",
    content: m.content,
    timestamp: m.created_at,
    read: Boolean(m.read_at),
    type: m.type || "text",
  }));
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to send a message");

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("send_chat_message", {
      p_conversation_id: conversationId,
      p_content: content,
    });

    if (!rpcErr && rpcData) {
      const row = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: row.sender_name || user.user_metadata?.full_name || "You",
        content: row.content,
        timestamp: row.created_at,
        read: Boolean(row.read),
        type: (row.type as any) || "text",
      };
    }
    if (rpcErr) {
      console.warn("RPC send_chat_message error, trying direct insert:", rpcErr);
    }
  } catch (err) {
    console.warn("RPC send_chat_message failed:", err);
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type: "text",
    })
    .select("id, conversation_id, sender_id, content, type, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderName: user.user_metadata?.full_name || "You",
    content: data.content,
    timestamp: data.created_at,
    read: false,
    type: data.type || "text",
  };
}

export function subscribeToConversation(conversationId: string, onNewMessage: (msg: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const newMsg = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", newMsg.sender_id)
          .single();

        onNewMessage({
          id: newMsg.id,
          conversationId: newMsg.conversation_id,
          senderId: newMsg.sender_id,
          senderName: profile?.full_name || "User",
          content: newMsg.content,
          timestamp: newMsg.created_at,
          read: Boolean(newMsg.read_at),
          type: newMsg.type || "text",
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getOrCreateConversationWithUser(targetUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to chat");

  try {
    const { data: rpcConvId, error: rpcErr } = await supabase.rpc("get_or_create_conversation", {
      p_target_id: targetUserId,
    });
    if (!rpcErr && rpcConvId) {
      return rpcConvId;
    }
    if (rpcErr) {
      console.warn("RPC get_or_create_conversation failed, trying direct method:", rpcErr);
    }
  } catch (err) {
    console.warn("RPC get_or_create_conversation error:", err);
  }

  // Check if a conversation between user and targetUserId already exists
  const { data: myConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (myConvs && myConvs.length > 0) {
    const convIds = myConvs.map((c) => c.conversation_id);
    const { data: match } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("user_id", targetUserId)
      .limit(1);

    if (match && match.length > 0) {
      return match[0].conversation_id;
    }
  }

  // Fallback: Create new conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convErr) throw convErr;

  // Add participants
  await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: targetUserId },
  ]);

  return conv.id;
}

export async function getUnreadMessagesCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  try {
    const { data, error } = await supabase.rpc("get_unread_messages_count");
    if (!error && typeof data === "number") {
      return data;
    }
  } catch (err) {
    console.warn("Failed to get unread count via RPC:", err);
  }

  return 0;
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  try {
    await supabase.rpc("mark_messages_read", { p_conv_id: conversationId });
  } catch (err) {
    console.warn("Failed to mark conversation read:", err);
  }
}

