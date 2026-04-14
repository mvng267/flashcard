# Reports Architecture (v2)

## Mục tiêu

- Tách báo cáo thành nhiều màn rõ ràng.
- Màn `Báo cáo` chính chỉ làm landing + điều hướng.
- Cho phép user xem lại chi tiết từng bài tập: đã chọn gì, đáp án đúng là gì, đúng/sai từng câu.

---

## Cấu trúc màn hình mới

## 1) `/reports` (Report Center)
- Vai trò: màn điều hướng trung tâm.
- Link đến:
  - `/reports/overview`
  - `/reports/exercises`
  - `/streak`
  - `/retention`

## 2) `/reports/overview`
- Tổng quan hiệu suất 30 ngày:
  - Accuracy tổng
  - Lượt ôn tập
  - Phiên học
  - Bài tập đã làm
  - Điểm bài tập trung bình
- Biểu đồ:
  - Tần suất ôn tập theo ngày
  - Phân bố Again/Hard/Good/Easy
- Bảng:
  - Hiệu suất theo deck
  - Thẻ yếu (hay sai)

## 3) `/reports/exercises`
- Danh sách attempt bên trái (lọc theo từ khóa).
- Pane chi tiết bên phải:
  - Điểm tổng / số câu đúng
  - Danh sách từng câu:
    - loại câu (multiple_choice / hard_fill)
    - câu hỏi
    - user_answer
    - correct_answer
    - đúng/sai

## 4) `/streak`
- Chuỗi học (streak)
- Tách rõ:
  - số phiên học hôm nay (`today_study_sessions`)
  - số thẻ review hôm nay (`today_review_count`)
- Daily goal progress

## 5) `/retention`
- Biểu đồ retention theo tuần
- Bảng weekly retention

---

## API bổ sung

## GET `/reports/exercise-attempts`
Danh sách attempt cho user hiện tại.

Query:
- `limit` (default 50)
- `deck_id` (optional)

Response item:
- attempt_id
- deck_id
- deck_title
- score_percent
- correct_answers
- total_questions
- created_at

## GET `/reports/exercise-attempts/{attempt_id}`
Chi tiết 1 attempt.

Response:
- thông tin attempt
- `answers[]` gồm:
  - user_card_id
  - question_type
  - question_text
  - prompt_text
  - correct_answer
  - user_answer
  - is_correct

---

## Frontend files

- `desktop/src/pages/Reports.tsx` (landing)
- `desktop/src/pages/ReportsOverview.tsx`
- `desktop/src/pages/ReportsExercises.tsx`
- Route update: `desktop/src/App.tsx`
- API client update: `desktop/src/lib/api.ts`

## Backend files

- `api/app/routers/reports.py`
- `api/app/schemas.py`

---

## Ghi chú UX

- Reports landing giữ vai trò điều hướng, tránh nhồi tất cả vào 1 màn.
- Màn exercises ưu tiên “traceability”: user thấy rõ mình chọn gì, sai ở đâu.
- Có thể mở rộng thêm filter theo deck/date range ở bước sau.
