import React, { useState } from "react";
import { ArrowLeft, Key, Mail, Save, Target, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { api, getApiError } from "../lib/api";
import { avatarStyleOptions, encodeAvatarSeed, getAvatarUrl, parseAvatarSeed, type AvatarStyle } from "../lib/avatar";

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [email, setEmail] = useState(user?.email || "");
  const [dailyGoal, setDailyGoal] = useState(user?.daily_goal_reviews || 20);
  const parsedAvatar = parseAvatarSeed(user?.avatar_seed || user?.username || "user");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(parsedAvatar.style);
  const [avatarSeedInput, setAvatarSeedInput] = useState(parsedAvatar.seed);

  React.useEffect(() => {
    setFullName(user?.full_name || "");
    setUsername(user?.username || "");
    setBio(user?.bio || "");
    setEmail(user?.email || "");
    setDailyGoal(user?.daily_goal_reviews || 20);
    const next = parseAvatarSeed(user?.avatar_seed || user?.username || "user");
    setAvatarStyle(next.style);
    setAvatarSeedInput(next.seed);
  }, [user?.full_name, user?.username, user?.bio, user?.email, user?.daily_goal_reviews, user?.avatar_seed]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        full_name: fullName,
        username: username,
        bio: bio,
        email,
        avatar_seed: encodeAvatarSeed(avatarSeedInput || username || "user", avatarStyle),
        daily_goal_reviews: Number(dailyGoal),
      });
      setSuccess("Cập nhật thông tin thành công!");
    } catch (err) {
      setError(getApiError(err, "Cập nhật thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassError("Mật khẩu xác nhận không khớp");
      return;
    }

    setPassLoading(true);
    setPassError(null);
    setPassSuccess(null);

    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPassSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPassError(getApiError(err, "Đổi mật khẩu thất bại"));
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="app-page max-w-4xl mx-auto">
      <header className="flex items-center gap-4">
        <Link to="/" className="app-btn-secondary p-2 text-slate-400 hover:text-slate-100">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="app-title">Hồ sơ cá nhân</h1>
          <p className="app-subtitle">Quản lý thông tin tài khoản và bảo mật.</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Thông tin cá nhân */}
        <section className="app-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <UserIcon size={20} />
            </div>
            <h2 className="text-lg font-semibold">Thông tin cơ bản</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Username</span>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="app-input pl-10 focus:border-sky-500"
                  placeholder="vinh_nguyen"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Họ và tên</span>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="app-input pl-10 focus:border-sky-500"
                  placeholder="Vinh Nguyễn"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Tiểu sử (Bio)</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="app-input px-3 focus:border-sky-500"
                placeholder="Học để thành tài..."
              />
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
              <span className="block text-xs font-medium uppercase tracking-wider text-slate-500">Avatar (nguồn mở DiceBear, không upload file)</span>

              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(encodeAvatarSeed(avatarSeedInput || username || "user", avatarStyle), username || "user")}
                  alt="avatar preview"
                  className="h-14 w-14 rounded-full border border-slate-700 bg-slate-900"
                />
                <div className="text-xs text-slate-500">Preview avatar theo style + seed hiện tại.</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">Style</span>
                  <select
                    value={avatarStyle}
                    onChange={(e) => setAvatarStyle(e.target.value as AvatarStyle)}
                    className="app-input px-3 focus:border-sky-500"
                  >
                    {avatarStyleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">Seed</span>
                  <input
                    value={avatarSeedInput}
                    onChange={(e) => setAvatarSeedInput(e.target.value)}
                    className="app-input px-3 focus:border-sky-500"
                    placeholder="vinh-avatar"
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input pl-10 focus:border-sky-500"
                  placeholder="vinh@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Mục tiêu ôn tập hàng ngày (Số thẻ)</span>
              <div className="relative">
                <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="number"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="app-input pl-10 focus:border-sky-500"
                />
              </div>
            </label>

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>

          <div className="pt-4 mt-6 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Trạng thái tài khoản</p>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-300 capitalize">{user?.auth_provider === "local" ? "Mật khẩu hệ thống" : user?.auth_provider}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Ngày tham gia: {user?.created_at && new Date(user.created_at).toLocaleDateString("vi-VN")}</p>
          </div>
        </section>

        {/* Đổi mật khẩu */}
        <section className="app-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Key size={20} />
            </div>
            <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
          </div>

          {user?.auth_provider.includes("google") && !user?.auth_provider.includes("local") ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <div className="p-4 rounded-full bg-slate-800/50 text-slate-400">
                <Mail size={32} />
              </div>
              <p className="text-sm text-slate-400 max-w-[240px]">
                Tài khoản của bạn đăng nhập qua Google nên không có mật khẩu riêng.
              </p>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Mật khẩu hiện tại</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="app-input px-3 focus:border-violet-500"
                  placeholder="••••••••"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Mật khẩu mới</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="app-input px-3 focus:border-violet-500"
                  placeholder="••••••••"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Xác nhận mật khẩu mới</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="app-input px-3 focus:border-violet-500"
                  placeholder="••••••••"
                />
              </label>

              {passError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{passError}</div>}
              {passSuccess && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{passSuccess}</div>}

              <button
                type="submit"
                disabled={passLoading}
                className="app-btn w-full bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <Key size={16} />
                {passLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
