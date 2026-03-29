# Mentor Me

## Setup

1. Cài dependencies:
```bash
npm install
```

2. Tạo file `.env` với các biến:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_DASHBOARD_PASSWORD=your_admin_password
```

3. Chạy server:
```bash
npm start
```

## Supabase

Schema gốc nằm ở [supabase/schema.sql](/Users/DoTrang/Downloads/MENTOR%20ME/supabase/schema.sql).

Migration mới để đồng bộ trạng thái admin với dữ liệu mentor public nằm ở:
[2026-03-29_admin_status_sync.sql](/Users/DoTrang/Downloads/MENTOR%20ME/supabase/migrations/2026-03-29_admin_status_sync.sql)

Nếu muốn việc đổi `mentor_profile_updates.status` trong Supabase tự động publish / unpublish sang `mentor_profiles`, chạy thêm:
[2026-03-29_auto_publish_mentor_profile_updates.sql](/Users/DoTrang/Downloads/MENTOR%20ME/supabase/migrations/2026-03-29_auto_publish_mentor_profile_updates.sql)

Sau khi pull code mới, cần chạy migration này trên Supabase SQL Editor để đảm bảo:

- `mentor_profiles.visibility = public` chỉ xuất hiện khi admin đã duyệt hồ sơ công khai
- trạng thái `pending / approved / rejected` giữa admin review và dữ liệu public không bị lệch
- dữ liệu cũ được chuẩn hóa trước khi áp `check constraint`
- trigger tự đồng bộ từ `mentor_profile_updates` sang `mentor_profiles` khi bạn thao tác trực tiếp bằng SQL

## Luồng mentor

1. Mentor nộp đơn ở `mentor-apply.html`
2. Admin duyệt ứng tuyển ở `admin-consultations.html` bước 1
3. Mentor kích hoạt tài khoản và cập nhật hồ sơ ở `mentor-dashboard.html`
4. Admin duyệt hồ sơ công khai ở `admin-consultations.html` bước 2
5. Chỉ sau bước 4 mentor mới hiển thị ở `search.html`
