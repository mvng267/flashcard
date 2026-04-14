import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  api,
  getApiError,
  type FeedCommentOut,
  type FeedPostOut,
  type UserDeck,
  type UserPublicProfile,
} from "../lib/api";
import { getAvatarUrl } from "../lib/avatar";

const Social: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"feed" | "search" | "friends">("feed");

  const [feed, setFeed] = useState<FeedPostOut[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [friends, setFriends] = useState<UserPublicProfile[]>([]);
  const [friendsQuery, setFriendsQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<number | null>(null);

  const [myDecks, setMyDecks] = useState<UserDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

  const [commentsByPost, setCommentsByPost] = useState<Record<number, FeedCommentOut[]>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentInput, setCommentInput] = useState<Record<number, string>>({});

  const [error, setError] = useState<string | null>(null);

  const selectedDeck = useMemo(
    () => myDecks.find((d) => d.id === selectedDeckId) || null,
    [myDecks, selectedDeckId],
  );

  const filteredFriends = useMemo(() => {
    const q = friendsQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => `${f.full_name} ${f.username} ${f.bio ?? ""}`.toLowerCase().includes(q));
  }, [friends, friendsQuery]);

  const loadFeed = async () => {
    try {
      setLoadingFeed(true);
      setError(null);
      const data = await api.getFeed();
      setFeed(data);
    } catch (err) {
      setError(getApiError(err, "Không tải được bản tin"));
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadMyDecks = async () => {
    try {
      const decks = await api.getMyDecks();
      setMyDecks(decks);
      if (decks.length > 0 && !selectedDeckId) {
        setSelectedDeckId(decks[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadFeed();
    void loadMyDecks();

    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share_deck_id");
    if (shareId) {
      setSelectedDeckId(Number(shareId));
      setActiveTab("feed");
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    try {
      setLoadingSearch(true);
      const data = await api.searchUsers(q);
      setSearchResults(data);
    } catch (err) {
      setError(getApiError(err, "Tìm kiếm thất bại"));
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleFriendAction = async (user: UserPublicProfile) => {
    try {
      if (user.requested_me) {
        await api.acceptFriendRequest(user.id);
      } else {
        await api.sendFriendRequest(user.id);
      }
      const refreshed = await api.searchUsers(searchQuery || user.username);
      setSearchResults(refreshed);
    } catch (err) {
      setError(getApiError(err, "Xử lý kết bạn thất bại"));
    }
  };

  const handleCreatePost = async () => {
    if (!selectedDeckId) return;
    try {
      setShareLoading(true);
      await api.createFeedPost({
        user_deck_id: selectedDeckId,
        caption: caption.trim(),
        visibility: "friends",
      });
      setCaption("");
      await loadFeed();
    } catch (err) {
      setError(getApiError(err, "Đăng bài thất bại"));
    } finally {
      setShareLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const rows = await api.getFriends();
      setFriends(rows);
    } catch (err) {
      setError(getApiError(err, "Không tải được danh sách bạn bè"));
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleRemoveFriend = async (friend: UserPublicProfile) => {
    try {
      setRemovingFriendId(friend.id);
      await api.removeFriend(friend.id);
      setFriends((prev) => prev.filter((item) => item.id !== friend.id));
    } catch (err) {
      setError(getApiError(err, "Xóa bạn thất bại"));
    } finally {
      setRemovingFriendId(null);
    }
  };

  const handleMessageFriend = (userId: number) => {
    navigate(`/messages?to=${userId}`);
  };

  const handleTabChange = (tab: "feed" | "search" | "friends") => {
    setActiveTab(tab);
    if (tab === "friends" && friends.length === 0 && !loadingFriends) {
      void loadFriends();
    }
  };

  const handleToggleReaction = async (postId: number) => {
    try {
      const res = await api.togglePostReaction(postId);
      setFeed((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const nextLiked = res.liked;
          const nextCount = nextLiked ? p.reaction_count + 1 : Math.max(0, p.reaction_count - 1);
          return {
            ...p,
            viewer_liked: nextLiked,
            reaction_count: nextCount,
          };
        }),
      );
    } catch (err) {
      setError(getApiError(err, "Like thất bại"));
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const rows = await api.getPostComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: rows }));
    } catch (err) {
      setError(getApiError(err, "Không tải được bình luận"));
    }
  };

  const toggleComments = async (postId: number) => {
    const next = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: next }));
    if (next && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  };

  const createComment = async (postId: number) => {
    const text = (commentInput[postId] || "").trim();
    if (!text) return;

    try {
      const comment = await api.createPostComment(postId, text);
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setFeed((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)),
      );
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
    } catch (err) {
      setError(getApiError(err, "Bình luận thất bại"));
    }
  };

  return (
    <div className="app-page mx-auto max-w-5xl">
      <nav className="sticky top-4 z-20 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-1 backdrop-blur-xl">
        <TabButton active={activeTab === "feed"} onClick={() => handleTabChange("feed")} icon={<Sparkles size={16} />} label="Bản tin" />
        <TabButton active={activeTab === "search"} onClick={() => handleTabChange("search")} icon={<Search size={16} />} label="Tìm bạn" />
        <TabButton active={activeTab === "friends"} onClick={() => handleTabChange("friends")} icon={<Users size={16} />} label="Bạn bè" />
        <button
          onClick={() => navigate("/messages")}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          <MessageCircle size={16} /> Tin nhắn
        </button>
      </nav>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {activeTab === "feed" && (
        <div className="space-y-6">
          <section className="app-card bg-gradient-to-br from-slate-900 to-sky-950/25 p-6 shadow-lg">
            <h2 className="text-xl font-bold">Chia sẻ deck lên feed</h2>
            <p className="mt-1 app-subtitle">Bạn bè sẽ thấy tiến trình học của mày và họ đã từng học deck đó chưa.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedDeckId ?? ""}
                onChange={(e) => setSelectedDeckId(Number(e.target.value))}
                className="app-input px-3 focus:border-sky-500"
              >
                {myDecks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void handleCreatePost()}
                disabled={!selectedDeckId || shareLoading}
                className="app-btn-primary px-5 font-bold disabled:opacity-50"
              >
                <Plus size={16} /> {shareLoading ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder={selectedDeck ? `Viết caption cho deck "${selectedDeck.title}"...` : "Viết caption..."}
              className="app-input mt-3 px-3 focus:border-sky-500"
            />
          </section>

          <section className="space-y-5">
            {loadingFeed && feed.length === 0 ? (
              <div className="py-16 text-center text-slate-500">Đang tải bản tin...</div>
            ) : feed.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 py-16 text-center">
                <Users size={42} className="mx-auto mb-3 text-slate-700" />
                <p className="text-slate-500">Chưa có bài nào. Đăng deck đầu tiên đi.</p>
              </div>
            ) : (
              feed.map((post) => {
                const postComments = commentsByPost[post.id] || [];
                const commentsOpen = !!openComments[post.id];
                const commentText = commentInput[post.id] || "";

                return (
                  <article key={post.id} className="app-card overflow-hidden">
                    <header className="flex items-center gap-3 border-b border-slate-800/60 p-4">
                      <div className="h-10 w-10 rounded-full border border-slate-700 bg-slate-800 overflow-hidden grid place-items-center text-slate-500 font-bold uppercase">
                        <img
                          src={post.author_avatar_url || getAvatarUrl(post.author_avatar_seed, post.author_username)}
                          alt="avatar"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(post.author_username, post.author_username);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${post.author_id}`)}
                        className="flex-1 text-left rounded-lg px-1 py-1 transition hover:bg-slate-800/60"
                      >
                        <p className="font-semibold text-slate-100">{post.author_full_name} <span className="text-xs text-slate-500">@{post.author_username}</span></p>
                        <p className="text-[11px] text-slate-500">{new Date(post.created_at).toLocaleString("vi-VN")}</p>
                      </button>
                      <button
                        onClick={() => navigate(`/messages?to=${post.author_id}`)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-sky-500/10 hover:text-sky-300"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </header>

                    <div className="space-y-4 p-4">
                      {post.caption ? <p className="text-sm text-slate-300">{post.caption}</p> : null}

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-300 grid place-items-center">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-100">{post.deck_title}</h3>
                              <p className="text-xs text-slate-500">Deck được chia sẻ</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-black text-sky-400">{post.author_progress_percent}%</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-600">Tiến trình người đăng</p>
                          </div>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                          <div className="h-full bg-sky-500" style={{ width: `${post.author_progress_percent}%` }} />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Họ đã review <b>{post.author_progress_reviewed}</b>/{post.author_progress_total_cards}
                          </span>

                          {post.viewer_has_started ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 size={13} /> Mày đã học ({post.viewer_reviewed}/{post.viewer_total_cards})
                            </span>
                          ) : (
                            <span className="text-orange-400">Mày chưa học deck này</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <footer className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => void handleToggleReaction(post.id)}
                          className={`inline-flex items-center gap-2 ${post.viewer_liked ? "text-red-400" : "hover:text-red-400"}`}
                        >
                          <Heart size={15} className={post.viewer_liked ? "fill-current" : ""} />
                          {post.reaction_count}
                        </button>
                        <button
                          onClick={() => void toggleComments(post.id)}
                          className="inline-flex items-center gap-2 hover:text-sky-400"
                        >
                          <MessageCircle size={15} /> {post.comment_count}
                        </button>
                        <button className="inline-flex items-center gap-2 hover:text-sky-400"><Share2 size={15} />Lưu về</button>
                      </div>

                      {commentsOpen ? (
                        <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                            {postComments.length === 0 ? (
                              <p className="text-xs text-slate-500">Chưa có bình luận nào.</p>
                            ) : (
                              postComments.map((c) => (
                                <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                                  <div className="mb-1 flex items-center gap-2">
                                    <img
                                      src={c.avatar_url || getAvatarUrl(c.avatar_seed, c.username)}
                                      alt="avatar"
                                      className="h-6 w-6 rounded-full border border-slate-700 object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = getAvatarUrl(c.username, c.username);
                                      }}
                                    />
                                    <span className="text-xs font-semibold text-slate-200">{c.full_name}</span>
                                    <span className="text-[10px] text-slate-500">@{c.username}</span>
                                  </div>
                                  <p className="text-xs text-slate-300">{c.content}</p>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              value={commentText}
                              onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void createComment(post.id);
                                }
                              }}
                              placeholder="Viết bình luận..."
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-sky-500"
                            />
                            <button
                              onClick={() => void createComment(post.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-slate-950"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </footer>
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-5">
          <form onSubmit={handleSearch} className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm username / tên / email..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3.5 pl-11 pr-4 outline-none focus:border-sky-500"
            />
          </form>

          <div className="grid gap-4 md:grid-cols-2">
            {loadingSearch ? (
              <div className="col-span-full py-12 text-center text-slate-500">Đang tìm...</div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="col-span-full py-12 text-center text-slate-500">Không tìm thấy user.</div>
            ) : (
              searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-3 app-card p-4">
                  <div className="h-12 w-12 rounded-full border border-slate-700 bg-slate-800 overflow-hidden grid place-items-center text-slate-500 font-bold uppercase">
                    <img
                      src={u.avatar_url || getAvatarUrl(u.avatar_seed, u.username)}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getAvatarUrl(u.username, u.username);
                      }}
                    />
                  </div>

                  <button
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="min-w-0 flex-1 text-left rounded-lg px-1 py-1 transition hover:bg-slate-800/60"
                  >
                    <p className="truncate font-semibold text-slate-100">{u.full_name}</p>
                    <p className="truncate text-xs text-slate-500">@{u.username}</p>
                    {u.bio ? <p className="mt-0.5 truncate text-xs text-slate-400">{u.bio}</p> : null}
                  </button>

                  {u.is_friend ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      <UserCheck size={13} /> Bạn bè
                    </span>
                  ) : u.requested_by_me ? (
                    <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Đã gửi</span>
                  ) : (
                    <button
                      onClick={() => void handleFriendAction(u)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-300"
                    >
                      <UserPlus size={13} /> {u.requested_me ? "Chấp nhận" : "Kết bạn"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "friends" && (
        <div className="space-y-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={friendsQuery}
              onChange={(e) => setFriendsQuery(e.target.value)}
              placeholder="Tìm trong danh sách bạn bè..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3.5 pl-11 pr-4 outline-none focus:border-sky-500"
            />
          </div>

          {loadingFriends ? (
            <div className="py-12 text-center text-slate-500">Đang tải danh sách bạn bè...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 py-16 text-center">
              <Users size={42} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-500">{friendsQuery.trim() ? "Không có bạn nào khớp tìm kiếm." : "Bạn chưa có bạn bè nào."}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFriends.map((friend) => (
                <div key={friend.id} className="app-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full border border-slate-700 bg-slate-800 overflow-hidden grid place-items-center text-slate-500 font-bold uppercase">
                      <img
                        src={friend.avatar_url || getAvatarUrl(friend.avatar_seed, friend.username)}
                        alt="avatar"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getAvatarUrl(friend.username, friend.username);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => navigate(`/profile/${friend.id}`)}
                      className="min-w-0 flex-1 text-left rounded-lg px-1 py-1 transition hover:bg-slate-800/60"
                    >
                      <p className="truncate font-semibold text-slate-100">{friend.full_name}</p>
                      <p className="truncate text-xs text-slate-500">@{friend.username}</p>
                      {friend.bio ? <p className="mt-0.5 truncate text-xs text-slate-400">{friend.bio}</p> : null}
                    </button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleMessageFriend(friend.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
                    >
                      <MessageCircle size={13} /> Nhắn tin
                    </button>
                    <button
                      onClick={() => void handleRemoveFriend(friend)}
                      disabled={removingFriendId === friend.id}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <UserMinus size={13} /> {removingFriendId === friend.id ? "Đang xóa..." : "Xóa bạn"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
      active ? "bg-slate-800 text-sky-300 font-semibold" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Social;
