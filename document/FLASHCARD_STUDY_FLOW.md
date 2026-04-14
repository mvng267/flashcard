# Flashcard Study Flow (Chi tiết)

Tài liệu này mô tả **đầy đủ luồng học flashcard hiện tại** trong app, cách tính toán tiến độ, streak, và bài tập.

---

## 1) Tổng quan kiến trúc học

Trong app hiện tại, mỗi user có thể cài nhiều deck từ thư viện. Khi cài, hệ thống tạo bản sao dữ liệu vào bảng user:

- `library_decks` / `library_cards`: dữ liệu mẫu gốc
- `user_decks` / `user_cards`: dữ liệu học thật của từng user

=> Vì là dữ liệu riêng theo user, cùng một deck thư viện nhưng mỗi người có lịch học / mức độ nhớ riêng.

---

## 2) 1 deck có học lại nhiều lần được không?

**Có.**

Một deck có thể được học lại vô hạn lần qua 2 cơ chế:

1. **Due mode**: học các thẻ đến hạn (`due_at <= now`)
2. **Practice mode**: học ngẫu nhiên lại bộ thẻ, kể cả không đến hạn

Ngoài ra còn có:

3. **Exercise mode**: làm bài tập sau phiên học (quiz), không thay thế review SRS nhưng có tính điểm, lịch sử, streak.

---

## 3) Luồng học thực tế theo màn hình

## 3.1 Dashboard

Deck được chia 2 nhóm:

- **Chưa làm hôm nay**: thường còn thẻ đến hạn
- **Đã làm hôm nay**: đã xử lý trong ngày

Nút hành động:

- `Học`:
  - nếu deck chưa làm -> mở study `mode=due`
  - nếu deck đã làm -> mở study `mode=practice`
- `Bài tập`:
  - chỉ bật khi deck đã hoàn tất phiên học trong ngày

---

## 3.2 Bắt đầu phiên Study (`POST /study/session/start`)

Input:

- `deck_id`
- `limit` (mặc định 20)
- `mode`: `mixed | due | practice`

Logic chọn thẻ:

- `due`: lấy thẻ đến hạn sớm nhất
- `practice`: random từ toàn bộ thẻ deck
- `mixed`:
  - nếu có due => chạy như `due`
  - nếu không có due => fallback sang `practice`

Mỗi lần start session sẽ log vào `study_session_logs`:

- user_id
- user_deck_id
- mode thực tế (`due` hoặc `practice`)
- số thẻ trong phiên

---

## 3.3 Chấm từng thẻ SRS (`POST /study/review`)

Mỗi lần user bấm 1 trong 4 nút:

- Again
- Hard
- Good
- Easy

hệ thống sẽ tính lại:

- `due_at` (lần ôn tiếp theo)
- `interval_days`
- `repetitions`
- `ease_factor`
- `lapses` (tăng khi Again)

và ghi `review_logs`.

### Công thức hiện tại (đang dùng)

### Again

- repetitions = 0
- interval_days = 0
- ease_factor giảm 0.2 (không thấp hơn 1.3)
- due_at = now + 10 phút
- was_correct = false

### Hard

- repetitions +1
- nếu repetition đầu: interval = 1 ngày
- các lần sau: interval *= 1.2
- ease_factor giảm 0.15 (min 1.3)
- due_at = now + interval ngày
- was_correct = true

### Good

- repetitions +1
- rep 1 => 1 ngày
- rep 2 => 3 ngày
- rep >=3 => interval *= ease_factor
- due_at = now + interval ngày
- was_correct = true

### Easy

- repetitions +1
- rep 1 => 4 ngày
- rep 2 => 7 ngày
- rep >=3 => interval *= ease_factor * 1.3
- ease_factor tăng +0.1
- due_at = now + interval ngày
- was_correct = true

=> Đây là SRS kiểu custom (gần Anki nhưng đơn giản hơn).

---

## 3.4 Kết thúc session và chuyển sang Exercise

Trong UI hiện tại:

- Học hết cards của session => tự chuyển sang tạo bài tập (`/study/exercise/start`)

Điều kiện tạo bài tập:

- Nếu còn due card > 0 trong deck -> API trả lỗi 409 (bắt học flashcard trước)
- Deck phải có >=4 card để tạo đủ câu hỏi

---

## 3.5 Exercise (Quiz)

Hệ thống sinh câu hỏi ngẫu nhiên:

- `multiple_choice` (chọn nghĩa đúng)
- `hard_fill` (điền từ tiếng Anh)

API liên quan:

- `/study/exercise/start`
- `/study/exercise/check` (check từng câu)
- `/study/exercise/submit` (nộp cả bài)
- `/study/exercise/history/{deck_id}`

Khi submit:

- ghi `exercise_attempts`
- ghi chi tiết từng câu vào `exercise_answers`
- tính `score_percent`, `correct_answers`, `total_questions`

---

## 4) Streak được tính thế nào?

Route hiện tại: `GET /reports/streak`

Streak dựa trên **ngày có hoạt động học**:

- Có `review_logs` trong ngày **hoặc**
- Có `exercise_attempts` trong ngày

`current_streak_days`:

- nếu hôm nay có học -> tính từ hôm nay lùi về trước liên tục
- nếu hôm nay không học nhưng hôm qua có -> streak vẫn giữ đến hôm qua
- đứt chuỗi khi gặp ngày trống

### Chỉ số hôm nay

- `today_study_sessions`: số phiên mở session
- `today_review_count`: số lượt chấm thẻ
- `today_exercise_attempts`: số bài tập nộp
- `today_total_lessons`: currently = `today_study_sessions + today_exercise_attempts`

Lưu ý: “bài đã học hôm nay” trong màn streak đang dùng khái niệm lesson-level (session + exercise), không phải số card.

---

## 5) Báo cáo tổng hợp (Reports)

### `/reports/overview`

- tổng lượt review
- độ chính xác review
- streak days
- số thẻ due/tổng thẻ
- số session
- số bài tập + điểm trung bình

### `/reports/detailed`

- breakdown theo deck
- phân bố rating (again/hard/good/easy)
- phân loại câu bài tập
- lịch sử bài tập gần đây
- top thẻ sai nhiều

---

## 6) Trả lời câu hỏi quan trọng: “Mỗi deck học lại được nhiều lần đúng không?”

**Đúng.**

- Deck được học lại vô hạn.
- Mỗi card có lịch `due_at` riêng và cập nhật sau mỗi lần review.
- Khi hết due card vẫn có thể luyện lại bằng practice mode.
- Làm bài tập nhiều lần được, và hệ thống có lưu lịch sử từng lần.

---

## 7) Tài khoản và đăng nhập (liên quan study flow)

Hiện đã hỗ trợ:

- Email/password (`/auth/login`, `/auth/register`)
- Google token login (`/auth/google`) – đang ở chế độ tích hợp token thủ công, chờ OAuth flow chính thức
- Cập nhật profile (`/auth/me` PATCH)
- Đổi mật khẩu (`/auth/change-password`)

Thông tin profile có thể ảnh hưởng trải nghiệm cá nhân nhưng không thay đổi thuật toán SRS.

---

## 8) Gợi ý cải tiến (nếu muốn nâng cấp sau)

1. Tách “bài đã học hôm nay” thành 2 nhãn rõ ràng:
   - số phiên học
   - số thẻ đã review
2. Thêm daily goal (ví dụ 20 review/ngày)
3. Thêm reset deck progress (có confirm)
4. Thêm biểu đồ retention theo tuần
5. Chuẩn hóa OAuth Google chính thức (popup + callback + PKCE)

---

## 9) File liên quan trong source

- Backend
  - `api/app/routers/study.py`
  - `api/app/routers/reports.py`
  - `api/app/models.py`
  - `api/app/schemas.py`

- Frontend
  - `desktop/src/pages/Study.tsx`
  - `desktop/src/pages/Dashboard.tsx`
  - `desktop/src/pages/Reports.tsx`
  - `desktop/src/pages/Streak.tsx`

---

Nếu cần, tao có thể viết thêm 1 tài liệu nữa theo kiểu **Sequence Diagram từng API call** để dev mới vào là nắm flow trong 5 phút.


---

## 10) Cập nhật hệ thống báo cáo (v2)

Đã tách báo cáo thành nhiều màn riêng:

- `/reports`: màn trung tâm chỉ để điều hướng
- `/reports/overview`: tổng quan hiệu suất học
- `/reports/exercises`: xem chi tiết từng attempt bài tập (user chọn gì, đáp án đúng là gì)
- `/streak`: streak + daily goal
- `/retention`: retention theo tuần

### API mới cho báo cáo bài tập

- `GET /reports/exercise-attempts`
- `GET /reports/exercise-attempts/{attempt_id}`

=> Cho phép truy vết chi tiết từng câu trong 1 attempt.

Xem thêm: `document/REPORTS_ARCHITECTURE.md`
