import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Send, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { api, getApiError, type ConversationPreview, type MessageOut } from "../lib/api";
import { getAvatarUrl } from "../lib/avatar";

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const toParam = Number(params.get("to") || "0");

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(toParam || null);
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadConversations = async () => {
    try {
      const rows = await api.getConversations();
      setConversations(rows);

      if (!activeUserId && rows.length > 0) {
        setActiveUserId(rows[0].user_id);
      }
    } catch (err) {
      setError(getApiError(err, "Không tải được hội thoại"));
    }
  };

  const loadMessages = async (userId: number) => {
    try {
      setLoading(true);
      const rows = await api.getChatHistory(userId);
      setMessages(rows);
      void loadConversations();
    } catch (err) {
      setError(getApiError(err, "Không tải được tin nhắn"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      void loadMessages(activeUserId);
    }
  }, [activeUserId]);

  const send = async () => {
    if (!activeUserId || !text.trim()) return;
    try {
      const msg = await api.sendMessage(activeUserId, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText("");
      void loadConversations();
    } catch (err) {
      setError(getApiError(err, "Gửi tin nhắn thất bại"));
    }
  };

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => `${c.username} ${c.full_name} ${c.last_message}`.toLowerCase().includes(q));
  }, [conversations, query]);

  const activeConversation = conversations.find((c) => c.user_id === activeUserId) || null;

  return (
    <div className="h-[calc(100vh-100px)] app-card overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="border-r border-slate-800 bg-slate-900/80 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <ArrowLeft size={16} /> Quay lại
            </button>
            <p className="text-sm font-semibold">Tin nhắn</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hội thoại..."
              className="app-input py-2 pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((c) => {
            const active = c.user_id === activeUserId;
            return (
              <button
                key={c.user_id}
                onClick={() => setActiveUserId(c.user_id)}
                className={`w-full text-left rounded-xl p-3 transition border ${
                  active ? "border-sky-500/40 bg-sky-500/10" : "border-transparent hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={c.avatar_url || getAvatarUrl(c.avatar_seed, c.username)}
                    alt="avatar"
                    className="h-8 w-8 rounded-full border border-slate-700 bg-slate-900 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getAvatarUrl(c.username, c.username);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-100 truncate">{c.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">@{c.username}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate mt-1">{c.last_message}</p>
              </button>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">Chưa có hội thoại nào</div>
          )}
        </div>
      </aside>

      <section className="flex flex-col">
        <header className="h-16 border-b border-slate-800 px-4 flex items-center gap-3 bg-slate-950/50">
          <div className="h-9 w-9 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            {activeConversation ? (
              <img
                src={activeConversation.avatar_url || getAvatarUrl(activeConversation.avatar_seed, activeConversation.username)}
                alt="avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(activeConversation.username, activeConversation.username);
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-500">
                <User size={16} />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{activeConversation?.full_name || "Chọn hội thoại"}</p>
            <p className="text-xs text-slate-500">{activeConversation ? `@${activeConversation.username}` : ""}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">{error}</div>}

          {!activeUserId ? (
            <div className="h-full grid place-items-center text-slate-500">
              <div className="text-center">
                <MessageCircle size={36} className="mx-auto mb-2 opacity-40" />
                Chọn 1 người để bắt đầu chat
              </div>
            </div>
          ) : loading ? (
            <div className="text-center text-slate-500 py-10">Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 py-10">Chưa có tin nhắn nào, nhắn câu đầu tiên đi.</div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id !== activeUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p>{m.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-sky-900/70" : "text-slate-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {!mine ? (m.is_read ? " · đã đọc" : " · chưa đọc") : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-slate-800 p-3 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={!activeUserId}
              placeholder={activeUserId ? "Nhập tin nhắn..." : "Chọn người nhận để chat"}
              className="app-input flex-1 px-4 disabled:opacity-50"
            />
            <button
              onClick={() => void send()}
              disabled={!activeUserId || !text.trim()}
              className="app-btn-primary h-10 w-10 p-0 grid place-items-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default Messages;
