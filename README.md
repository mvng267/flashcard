# Flashcard English App (Electron + FastAPI + PostgreSQL)

Ứng dụng học flashcard tiếng Anh chạy trên macOS với giao diện desktop đẹp, dễ dùng.

## Kiến trúc

- **Desktop App:** Electron + React + TypeScript
- **API:** FastAPI (Python)
- **Database:** PostgreSQL

## Tính năng hiện có (Phase MVP+)

- Đăng ký / đăng nhập (JWT)
- Thư viện flashcard có sẵn (không cần tạo từ đầu)
- Cài bộ thẻ vào tài khoản cá nhân
- Học theo cơ chế SRS (Again / Hard / Good / Easy)
- Phát âm từ vựng với 2 giọng US/UK, chỉnh tốc độ, auto phát khi qua thẻ mới
- Bài tập sau mỗi phiên học flashcard (quiz nhập nghĩa, chấm điểm)
- Lưu lịch sử bài tập theo từng deck
- Báo cáo học tập tổng hợp: tổng lượt học, độ chính xác, streak, thẻ đến hạn, số bài tập và điểm trung bình bài tập

---

## 1) Chạy PostgreSQL

```bash
cd /Users/mvng/.openclaw/workspace/generated/flashcard
docker compose up -d
```

Mặc định:
- DB: `flashcard`
- User: `flashcard`
- Password: `flashcard`
- Port host: `55432` (container vẫn là 5432)

## 2) Chạy API (FastAPI)

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Swagger: <http://127.0.0.1:8000/docs>

## 3) Chạy Desktop (Electron)

```bash
cd ../desktop
cp .env.example .env
npm install
npm run dev
```

## Cấu trúc thư mục

```text
flashcard/
  api/
    app/
      routers/
  desktop/
    electron/
    src/
```

## Dữ liệu mẫu lớn (seed stress-test)

Đã có script tạo dữ liệu mẫu lớn để test giao diện/library/report:

```bash
cd api
source .venv/bin/activate
python scripts/generate_sample_data.py --users 120 --decks-per-user 4 --days 120
```

Tùy chọn:
- `--users`: số user mẫu
- `--decks-per-user`: số deck cài trên mỗi user
- `--days`: độ sâu lịch sử activity
- `--reset-sample-users`: xóa user mẫu cũ trước khi tạo lại

## Gợi ý bước tiếp theo

1. Thêm upload/import bộ flashcard từ CSV
2. Thêm quên mật khẩu qua email
3. Đóng gói app macOS (.dmg) bằng electron-builder
4. Đồng bộ offline cache cho trải nghiệm mượt hơn
