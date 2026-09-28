"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Send,
  Search,
  MessageSquare,
  ArrowLeft,
  User,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Clock,
  Sparkles
} from "lucide-react";
import {
  getConversations,
  getMessages,
  sendMessage,
  subscribeToConversation,
  getOrCreateConversationWithUser,
  markConversationAsRead,
} from "@/services/messageService";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Conversation, Message } from "@/types";
import { supabase } from "@/lib/supabase/client";

interface SuggestedContact {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  title: string;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get("to");
  const targetName = searchParams.get("name");
  const targetAvatar = searchParams.get("avatar");
  const targetConvId = searchParams.get("conversationId");

  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>(targetConvId || "");
  const [activeParticipant, setActiveParticipant] = useState<{
    id: string;
    name: string;
    avatar: string;
    title?: string;
  } | null>(null);
  const [messagesList, setMessagesList] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggestedContacts, setSuggestedContacts] = useState<SuggestedContact[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations and resolve target user if provided
  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      const data = await getConversations();
      if (!active) return;
      setConvs(data);

      if (targetUserId) {
        // Immediately set participant so the chat box is open and ready to type
        const initialAvatar =
          targetAvatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName || "User")}&background=F6C945&color=1E1E1E`;

        setActiveParticipant({
          id: targetUserId,
          name: targetName || "User",
          avatar: initialAvatar,
        });

        try {
          const resolvedConvId = await getOrCreateConversationWithUser(targetUserId);
          if (active) {
            setActiveId(resolvedConvId);
            // Refresh conversation list to show new or updated conversation
            const refreshed = await getConversations();
            if (active) setConvs(refreshed);
          }
        } catch (err) {
          console.error("Failed to initialize conversation with user:", err);
        }
      } else if (targetConvId) {
        setActiveId(targetConvId);
        const found = data.find((c) => c.id === targetConvId);
        if (found) {
          setActiveParticipant({
            id: found.participantId,
            name: found.participantName,
            avatar: found.participantAvatar,
          });
        }
      } else if (data.length > 0) {
        // Auto-select the first conversation so the chat box is immediately open
        setActiveId(data[0].id);
        setActiveParticipant({
          id: data[0].participantId,
          name: data[0].participantName,
          avatar: data[0].participantAvatar,
        });
      } else {
        try {
          const { data: workers } = await supabase
            .from("worker_profiles")
            .select(`
              id,
              user_id,
              professional_title,
              profiles:user_id (id, full_name, avatar_url)
            `)
            .limit(6);

          if (workers && active) {
            setSuggestedContacts(
              workers.map((w: any) => {
                const profile = w.profiles;
                const name = profile?.full_name || "Worker";
                const avatar =
                  profile?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F6C945&color=1E1E1E`;
                return {
                  id: w.id,
                  userId: w.user_id,
                  name,
                  avatar,
                  title: w.professional_title || "Verified Worker",
                };
              })
            );
          }
        } catch (err) {
          console.error("Failed to load suggested contacts:", err);
        }
      }

      setLoading(false);
    };

    init();

    return () => {
      active = false;
    };
  }, [targetUserId, targetConvId]);

  // Load messages and subscribe to active conversation + global inbox sync
  useEffect(() => {
    if (!activeId) {
      setMessagesList([]);
      return;
    }

    let active = true;
    markConversationAsRead(activeId);
    getMessages(activeId).then((msgs) => {
      if (active) {
        setMessagesList(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          inputRef.current?.focus();
        }, 80);
      }
    });

    const unsubscribe = subscribeToConversation(activeId, (newMsg) => {
      setMessagesList((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Refresh inbox snippet
      getConversations().then(setConvs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeId]);

  // Global realtime listener and periodic sync for other user's inbox
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`global-chat-sync:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as any;
          // Refresh inbox list immediately when any new message arrives
          getConversations().then(setConvs);

          if (activeId && newMsg.conversation_id === activeId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newMsg.sender_id)
              .single();

            setMessagesList((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  conversationId: newMsg.conversation_id,
                  senderId: newMsg.sender_id,
                  senderName: profile?.full_name || "User",
                  content: newMsg.content,
                  timestamp: newMsg.created_at,
                  read: Boolean(newMsg.read_at),
                  type: newMsg.type || "text",
                },
              ];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
          }
        }
      )
      .subscribe();

    // Fast polling fallback so messages show up in the other person's inbox within seconds
    const interval = setInterval(async () => {
      const refreshedConvs = await getConversations();
      if (refreshedConvs && refreshedConvs.length > 0) {
        setConvs(refreshedConvs);

        // If no conversation was active yet, open the new conversation automatically
        if (!activeId) {
          setActiveId(refreshedConvs[0].id);
          setActiveParticipant({
            id: refreshedConvs[0].participantId,
            name: refreshedConvs[0].participantName,
            avatar: refreshedConvs[0].participantAvatar,
          });
        }
      }

      if (activeId) {
        const msgs = await getMessages(activeId);
        setMessagesList((prev) => {
          const hasChanged =
            msgs.length !== prev.length ||
            (msgs.length > 0 && prev.length > 0 && msgs[msgs.length - 1].id !== prev[prev.length - 1].id);

          if (hasChanged) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
            return msgs;
          }
          return prev;
        });
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, activeId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    if (!user) {
      alert("Please log in to send a message.");
      router.push("/login?redirect=/messages");
      return;
    }

    const currentText = text.trim();
    setText("");
    setSending(true);

    try {
      let currentConvId = activeId;

      // If activeId is not yet resolved but we have target participant, resolve it now
      if (!currentConvId && activeParticipant?.id) {
        currentConvId = await getOrCreateConversationWithUser(activeParticipant.id);
        setActiveId(currentConvId);
      }

      if (!currentConvId) {
        throw new Error("No recipient or conversation selected. Please select a contact to chat with.");
      }

      const sentMsg = await sendMessage(currentConvId, currentText);
      setMessagesList((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      // Update sidebar inbox
      const refreshed = await getConversations();
      setConvs(refreshed);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setText(currentText);
      alert(err?.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const startChatWithContact = async (contact: SuggestedContact) => {
    setActiveParticipant({
      id: contact.userId,
      name: contact.name,
      avatar: contact.avatar,
      title: contact.title,
    });
    setLoading(true);
    try {
      const convId = await getOrCreateConversationWithUser(contact.userId);
      setActiveId(convId);
      const refreshed = await getConversations();
      setConvs(refreshed);
    } catch (err) {
      console.error("Error starting chat:", err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const activeConv = convs.find((c) => c.id === activeId);
  const participantName = activeConv?.participantName || activeParticipant?.name || "Direct Chat";
  const participantAvatar =
    activeConv?.participantAvatar ||
    activeParticipant?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=F6C945&color=1E1E1E`;

  const isChatActive = Boolean(activeId || activeParticipant);

  const filteredConvs = convs.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-3 px-2 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
            <span>Messages</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-ink">
              Live Chat
            </span>
          </h1>
          <p className="text-xs text-ink-secondary">Instant messaging between clients and workers</p>
        </div>
      </div>

      {/* Main Chat Container - Messenger / WhatsApp style */}
      <div
        className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col md:flex-row"
        style={{ height: "calc(100vh - 170px)", minHeight: 520 }}
      >
        {/* Left Column: Inbox Conversations Sidebar */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 bg-white",
            isChatActive ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search Header */}
          <div className="p-3 border-b border-border bg-surface-muted/40">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                placeholder="Search chats or contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-secondary space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="font-semibold text-ink text-sm">No chats yet</p>
                <p className="text-ink-secondary max-w-xs mx-auto">
                  Start a chat by clicking on any worker or selecting a recommended contact below.
                </p>

                {/* Quick start list in sidebar if empty */}
                {suggestedContacts.length > 0 && (
                  <div className="pt-3 text-left space-y-1.5 border-t border-border">
                    <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
                      Available to chat
                    </p>
                    {suggestedContacts.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => startChatWithContact(c)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-muted transition-colors text-left"
                      >
                        <Image
                          src={c.avatar}
                          alt={c.name}
                          width={32}
                          height={32}
                          className="rounded-full w-8 h-8 object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink truncate">{c.name}</p>
                          <p className="text-[10px] text-ink-secondary truncate">{c.title}</p>
                        </div>
                        <span className="text-[10px] font-medium text-primary-700 bg-primary/20 px-2 py-0.5 rounded-lg shrink-0">
                          Chat
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              filteredConvs.map((c) => {
                const isSelected = activeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveId(c.id);
                      setActiveParticipant({
                        id: c.participantId,
                        name: c.participantName,
                        avatar: c.participantAvatar,
                      });
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/60 transition-colors relative",
                      isSelected ? "bg-primary/10 border-l-4 border-l-primary" : ""
                    )}
                  >
                    <div className="relative shrink-0">
                      <Image
                        src={c.participantAvatar}
                        alt=""
                        width={46}
                        height={46}
                        className="rounded-full w-11 h-11 object-cover border border-border"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className={cn("text-sm truncate", isSelected ? "font-bold text-ink" : "font-semibold text-ink")}>
                          {c.participantName}
                        </p>
                        <span className="text-[10px] text-ink-muted shrink-0 ml-1">{c.lastMessageTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-ink-secondary truncate">{c.lastMessage}</p>
                        {c.unreadCount > 0 && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-primary text-ink rounded-full">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active WhatsApp / Messenger Chat Interface */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-[#F8F9FA]",
            !isChatActive ? "hidden md:flex" : "flex"
          )}
        >
          {isChatActive ? (
            <>
              {/* WhatsApp / Messenger Chat Header */}
              <div className="px-4 py-3 border-b border-border bg-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      setActiveId("");
                      setActiveParticipant(null);
                      router.replace("/messages");
                    }}
                    className="md:hidden p-1.5 -ml-1 rounded-xl hover:bg-surface-muted text-ink shrink-0"
                    title="Back to inbox"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="relative shrink-0">
                    <Image
                      src={participantAvatar}
                      alt={participantName}
                      width={42}
                      height={42}
                      className="rounded-full w-10 h-10 object-cover border border-border"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success border-2 border-white rounded-full" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-ink truncate leading-tight">
                      {participantName}
                    </h2>
                    <p className="text-[11px] text-success font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                      Active now
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 text-ink-secondary">
                  <button
                    type="button"
                    onClick={() => alert(`Calling ${participantName} is available once a job is in progress.`)}
                    className="p-2 rounded-xl hover:bg-surface-muted hover:text-ink transition-colors"
                    title="Voice Call"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alert(`Video Call with ${participantName} will start soon.`)}
                    className="p-2 rounded-xl hover:bg-surface-muted hover:text-ink transition-colors"
                    title="Video Call"
                  >
                    <Video size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#F4F6F8]">
                {messagesList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary-700 shadow-soft">
                      <Sparkles size={28} />
                    </div>
                    <div className="max-w-sm">
                      <h3 className="font-bold text-ink text-base">Direct Chat with {participantName}</h3>
                      <p className="text-xs text-ink-secondary mt-1">
                        Discuss task requirements, schedule, budget, and service location. All messages are encrypted and saved.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      <button
                        onClick={() => setText("Hello, are you available for a task?")}
                        className="text-xs bg-white border border-border px-3 py-1.5 rounded-full hover:bg-primary/10 hover:border-primary/40 text-ink transition-colors"
                      >
                        &quot;Hello, are you available?&quot;
                      </button>
                      <button
                        onClick={() => setText("Hi, I want to discuss the details and schedule.")}
                        className="text-xs bg-white border border-border px-3 py-1.5 rounded-full hover:bg-primary/10 hover:border-primary/40 text-ink transition-colors"
                      >
                        &quot;Let&apos;s discuss the details&quot;
                      </button>
                    </div>
                  </div>
                ) : (
                  messagesList.map((m) => {
                    const isMe = user?.id && m.senderId === user.id;
                    const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-xs transition-all",
                            isMe
                              ? "bg-primary text-ink font-medium rounded-br-none shadow-soft"
                              : "bg-white text-ink border border-border/80 rounded-bl-none shadow-xs"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 mt-1 text-[10px]",
                              isMe ? "text-ink/70" : "text-ink-muted"
                            )}
                          >
                            <span>{timeStr}</span>
                            {isMe && <CheckCheck size={12} className="text-ink/80" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Sticky Bottom Input Bar - WhatsApp / Messenger Style */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 border-t border-border bg-white flex items-center gap-2 sm:gap-3"
              >
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Type a message to ${participantName}...`}
                  autoFocus
                  className="flex-1 h-11 px-4 rounded-xl border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-surface-muted/60 transition-all text-ink placeholder:text-ink-muted"
                />

                <Button
                  type="submit"
                  disabled={!text.trim() || sending}
                  loading={sending}
                  className="h-11 px-5 rounded-xl shrink-0 font-semibold shadow-soft"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline ml-1">Send</span>
                </Button>
              </form>
            </>
          ) : (
            /* Fallback State when no chat is selected and 0 conversations exist */
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-[#F8F9FA]">
              <div className="max-w-md w-full space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto text-primary-700 shadow-soft">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-lg sm:text-xl">Welcome to Workly Messenger</h3>
                  <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                    Connect instantly with workers or clients to discuss work proposals, confirm bookings, and manage tasks.
                  </p>
                </div>

                {suggestedContacts.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-border p-4 shadow-soft text-left space-y-3">
                    <p className="text-xs font-bold text-ink">Start a conversation with verified workers:</p>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {suggestedContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => startChatWithContact(contact)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                        >
                          <Image
                            src={contact.avatar}
                            alt=""
                            width={36}
                            height={36}
                            className="rounded-full w-9 h-9 object-cover border border-border shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-ink truncate">{contact.name}</p>
                            <p className="text-[10px] text-ink-secondary truncate">{contact.title}</p>
                          </div>
                          <span className="text-[10px] font-bold text-ink bg-primary px-2 py-1 rounded-lg shrink-0">
                            Chat
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-center gap-3">
                    <Link href="/workers">
                      <Button size="sm">Find Workers to Chat</Button>
                    </Link>
                    <Link href="/bookings">
                      <Button variant="outline" size="sm">My Bookings</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-ink-secondary">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading conversations...</p>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
