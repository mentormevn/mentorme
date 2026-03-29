# Mentor Approval QA Checklist

## 1. Phạm vi kiểm thử

Checklist này dùng để test toàn bộ luồng:

- mentor apply
- admin approve
- mentor xuất hiện trên search
- mentor activate tài khoản
- mentor cập nhật hồ sơ công khai
- admin duyệt cập nhật hồ sơ

## 2. Môi trường test

- Server chạy ổn định
- Kết nối Supabase hoạt động
- Có ít nhất 1 tài khoản admin
- Có dữ liệu test riêng cho demo
- Dùng email test có thể lặp lại nhiều lần nếu cần

## 3. Dữ liệu test đề xuất

Sử dụng một mentor demo cố định:

- Họ tên: Mentor Demo Approval
- Email: mentor.demo.approval@example.com
- Số điện thoại: 0901234567
- Chuyên môn: IELTS và kỹ năng speaking
- Kinh nghiệm: 3 năm mentoring 1-1
- Động lực: Muốn đồng hành cùng học sinh luyện speaking

## 4. Test case chi tiết

### TC01 - Mentor nộp hồ sơ ứng tuyển thành công

- Bước test:
  - Mở form đăng ký mentor
  - Nhập đầy đủ thông tin hợp lệ
  - Bấm gửi
- Kết quả mong đợi:
  - Hệ thống báo gửi thành công
  - Dữ liệu xuất hiện trong danh sách `mentor_applications`
  - Trạng thái ban đầu là `pending`

### TC02 - Admin xem được hồ sơ ứng tuyển

- Bước test:
  - Đăng nhập admin
  - Mở màn quản trị hồ sơ mentor
- Kết quả mong đợi:
  - Hồ sơ vừa tạo xuất hiện trong danh sách
  - Thông tin hiển thị đúng
  - Có thể thay đổi trạng thái

### TC03 - Admin duyệt hồ sơ sang approved

- Bước test:
  - Trong admin, đổi trạng thái hồ sơ từ `pending` sang `approved`
  - Lưu thay đổi
- Kết quả mong đợi:
  - Hệ thống báo cập nhật thành công
  - Hồ sơ application chuyển sang `approved`
  - Có mã kích hoạt nếu luồng đang dùng activation code
  - `mentor_profiles` được tạo hoặc cập nhật ở trạng thái public

### TC04 - Mentor đã approved xuất hiện trên search

- Bước test:
  - Mở `search.html`
  - Tìm theo tên mentor
  - Tìm theo từ khóa chuyên môn
- Kết quả mong đợi:
  - Mentor xuất hiện trên danh sách
  - Card mentor hiển thị được
  - Có thể click vào trang chi tiết

### TC05 - Mentor detail load đúng dữ liệu public

- Bước test:
  - Từ search, mở trang chi tiết mentor
- Kết quả mong đợi:
  - Không báo lỗi 404
  - Tên mentor đúng
  - Headline/focus/bio hiển thị hợp lệ
  - Dữ liệu lấy từ hồ sơ public, không phải dữ liệu seed lỗi thời

### TC06 - Mentor kích hoạt tài khoản thành công

- Bước test:
  - Mở màn kích hoạt mentor
  - Nhập email, mã kích hoạt, họ tên, mật khẩu
  - Hoàn tất kích hoạt
- Kết quả mong đợi:
  - Tài khoản được tạo hoặc cập nhật thành công
  - Mentor đăng nhập được
  - `profiles.role = mentor`
  - `profiles.mentor_id` được gắn đúng

### TC07 - Sau activate, mentor không bị biến mất khỏi search

- Bước test:
  - Sau khi kích hoạt xong, quay lại search
  - Tìm lại mentor
- Kết quả mong đợi:
  - Mentor vẫn còn trên danh sách
  - Hồ sơ public không bị rơi về `draft`

### TC08 - Mentor cập nhật hồ sơ công khai

- Bước test:
  - Đăng nhập mentor
  - Vào dashboard mentor
  - Cập nhật headline, nơi làm việc, bio, lịch rảnh, dịch vụ
  - Gửi duyệt
- Kết quả mong đợi:
  - Tạo hoặc cập nhật `mentor_profile_updates`
  - Trạng thái là `pending`
  - Admin nhìn thấy yêu cầu cập nhật mới

### TC09 - Admin duyệt cập nhật hồ sơ công khai

- Bước test:
  - Đăng nhập admin
  - Mở khu duyệt `mentor_profile_updates`
  - Chuyển trạng thái sang `approved`
- Kết quả mong đợi:
  - Hệ thống báo cập nhật thành công
  - `mentor_profiles` nhận dữ liệu mới
  - Trang search và trang detail hiển thị thông tin vừa cập nhật

### TC10 - Search lọc theo từ khóa và field hoạt động đúng

- Bước test:
  - Tìm theo tên
  - Tìm theo chuyên môn
  - Lọc theo field
- Kết quả mong đợi:
  - Mentor được match đúng
  - Không bị mất mentor đã approve
  - Kết quả không lệch giữa search list và detail page

## 5. Test case âm

### TC11 - Approve lại hồ sơ đã approved

- Kết quả mong đợi:
  - Không tạo bản ghi public trùng lặp
  - Mentor vẫn có một hồ sơ public hợp lệ

### TC12 - Activate sau khi đã có profile public

- Kết quả mong đợi:
  - Không đổi `visibility` từ `public` về `draft`
  - Không tạo mentor id lệch mới nếu đã có profile hợp lệ

### TC13 - Search khi dữ liệu cũ chưa publish

- Bước test:
  - Dùng hồ sơ approved cũ chưa có public profile
  - Mở search
- Kết quả mong đợi:
  - Cơ chế repair tự đồng bộ
  - Mentor xuất hiện trên search

### TC14 - Duyệt rejected rồi approve lại

- Kết quả mong đợi:
  - Hệ thống cập nhật đúng trạng thái mới
  - Mentor lên search sau khi được approve

## 6. Checklist demo trước lãnh đạo

- Dọn dữ liệu test cũ dễ gây nhiễu
- Chốt sẵn 1 mentor demo
- Chốt sẵn 1 tài khoản admin
- Chuẩn bị sẵn mã kích hoạt nếu cần
- Kiểm tra search load được trước giờ demo
- Kiểm tra chi tiết mentor mở được
- Kiểm tra dashboard mentor đăng nhập được
- Chuẩn bị sẵn 1 kịch bản fallback nếu mạng chậm

## 7. Mẫu ghi nhận kết quả test

| Test Case | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| TC01 | Gửi application thành công |  |  |  |
| TC02 | Admin thấy application |  |  |  |
| TC03 | Approve thành công |  |  |  |
| TC04 | Mentor xuất hiện trên search |  |  |  |
| TC05 | Mentor detail hiển thị đúng |  |  |  |
| TC06 | Activate thành công |  |  |  |
| TC07 | Sau activate vẫn còn trên search |  |  |  |
| TC08 | Mentor gửi cập nhật hồ sơ |  |  |  |
| TC09 | Admin duyệt cập nhật hồ sơ |  |  |  |
| TC10 | Search và filter đúng |  |  |  |

## 8. Tiêu chí pass trước khi demo

Chỉ nên mang đi trình bày khi:

- Tất cả test case chính từ TC01 đến TC10 đều pass
- Không có lỗi chặn luồng demo
- Không có lệch dữ liệu giữa admin, search và mentor dashboard
- Có phương án nói rõ các giới hạn còn lại nếu có
