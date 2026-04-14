# Social Features - Flashcard App

Tài liệu mô tả module mạng xã hội kiểu TikTok cho app flashcard:

- Feed chia sẻ deck
- Kết bạn + tìm kiếm tài khoản
- Username chỉnh sửa được
- Hiển thị tiến độ người đăng và trạng thái người xem đã học chưa
- Nhắn tin trực tiếp (DM)

---

## 1) Mục tiêu sản phẩm

Module social giúp người học không chỉ học cá nhân mà còn:

- Chia sẻ deck đang học lên feed cá nhân
- Theo dõi tiến trình bạn bè
- Kết bạn qua username/name/email
- Nhắn tin trao đổi bài học

---

## 2) Data model (Backend)

## User mở rộng

`users` thêm field:

- `username` (unique, editable)
- `bio` (optional)
- các field auth/progress hiện có vẫn giữ

## Friendship

`friendships`:

- `requester_id`
- `addressee_id`
- `status`: pending / accepted
- `created_at`, `responded_at`

## FeedPost

`feed_posts`:

- `author_id`
- `user_deck_id`
- `caption`
- `visibility`: friends/public
- `created_at`

## DirectMessage

`direct_messages`:

- `sender_id`
- `receiver_id`
- `content`
- `created_at`

---

## 3) API - Social

Prefix: `/social`

### User + bạn bè

- `GET /social/users/search?q=`
  - tìm user theo username/full_name/email
- `GET /social/friends`
  - danh sách bạn bè accepted
- `POST /social/friends/request`
  - gửi lời mời kết bạn
- `POST /social/friends/accept`
  - chấp nhận lời mời
- `POST /social/friends/remove`
  - hủy bạn / xoá quan hệ

### Feed

- `POST /social/feed/posts`
  - đăng bài share deck của chính user
- `GET /social/feed`
  - lấy feed hiển thị:
    - bài public
    - bài của bạn bè accepted
    - bài của bản thân

Mỗi post trả thêm:

- tiến trình người đăng (`author_progress_*`)
- trạng thái người xem (`viewer_has_started`, `viewer_reviewed`, `viewer_total_cards`)

---

## 4) API - Messages

Prefix: `/messages`

- `GET /messages/conversations`
  - danh sách hội thoại gần nhất
- `GET /messages/{user_id}`
  - lịch sử chat giữa current user và user_id
- `POST /messages/send`
  - gửi tin nhắn

---

## 5) UI Pages

## Social page (`/social`)

Tab 1 - Feed:

- tạo bài chia sẻ từ deck đã cài
- xem bài của bạn bè
- thấy tiến độ người đăng
- thấy "mình đã học deck này chưa"
- quick action nhắn tin cho người đăng

Tab 2 - Search:

- tìm user
- gửi/chấp nhận kết bạn
- badge trạng thái: bạn bè / đã gửi / chấp nhận

## Messages page (`/messages`)

- cột trái: conversations
- cột phải: lịch sử chat
- input gửi tin nhắn trực tiếp

---

## 6) Username flow

### Tạo tài khoản

- Register thường: tự generate username từ email prefix
- Google login: generate từ email/preferred_username
- Có xử lý collision bằng suffix `_n` hoặc `_id`

### Cập nhật profile

`PATCH /auth/me` cho phép sửa:

- `username`
- `full_name`
- `bio`
- `email`
- `daily_goal_reviews`

Validation:

- username min 3, unique toàn hệ thống

---

## 7) Feed Progress Logic

Mỗi post có 2 loại progress:

## A. Progress người đăng

- `author_progress_reviewed`: số card distinct đã từng review
- `author_progress_total_cards`: tổng thẻ trong deck
- `author_progress_percent` = reviewed / total * 100

## B. Progress người xem

- map theo `source_library_deck_id`
- nếu người xem đã cài deck cùng source:
  - tính `viewer_reviewed / viewer_total_cards`
  - `viewer_has_started = viewer_reviewed > 0`
- nếu chưa cài/chưa học:
  - `viewer_has_started = false`

---

## 8) Bảo mật / quyền

- Tất cả API social/messages yêu cầu auth token
- Không cho kết bạn với chính mình
- Không cho nhắn tin với user không tồn tại
- Feed chỉ hiển thị bài theo visibility + quan hệ bạn bè

---

## 9) Gợi ý nâng cấp tiếp

1. Reaction/like thật (table riêng)
2. Comment dưới post
3. Realtime chat (WebSocket)
4. Message read/unread status
5. Block/report user
6. Notification hệ thống cho request friend và tin nhắn mới
7. Infinite scroll cho feed

---

## 10) File đã liên quan

### Backend

- `api/app/models.py`
- `api/app/schemas.py`
- `api/app/routers/social.py`
- `api/app/routers/messages.py`
- `api/app/routers/auth.py`
- `api/app/main.py`

### Frontend

- `desktop/src/lib/api.ts`
- `desktop/src/pages/Social.tsx`
- `desktop/src/pages/Messages.tsx`
- `desktop/src/pages/Profile.tsx`
- `desktop/src/components/Layout.tsx`
- `desktop/src/App.tsx`

