# Đóng góp

Cảm ơn bạn đã quan tâm. Repo này nhỏ, nên quy trình đơn giản.

## Chạy thử cục bộ
1. Làm theo phần **Cài đặt** trong [README.md](README.md) (Load unpacked).
2. Sửa `tweak.js` hoặc `manifest.json`.
3. Vào `chrome://extensions`, bấm nút reload của extension, rồi tải lại trang CVAT.

## Kiểm tra trước khi commit
```powershell
node --check tweak.js
```
- Mở một job CVAT 3D và thử từng thanh trượt (kích thước, độ sáng, tương phản, màu).
- Kiểm tra Console không có lỗi mới.
- Kiểm tra vẽ cuboid, chọn và kéo hộp vẫn hoạt động bình thường.

## Quy ước
- Extension chỉ thay đổi **hiển thị**. Không đọc, sửa hay gửi dữ liệu annotation đi nơi khác.
- Không tự động click, vẽ hay lưu thay người dùng.
- Không thêm quyền (permissions) khi chưa thật sự cần.
- Commit message ngắn gọn, viết ở thể mệnh lệnh, ví dụ `Add contrast slider`.
- Cập nhật [CHANGELOG.md](CHANGELOG.md) trong mục `Unreleased` cho mỗi thay đổi đáng kể.

## Báo lỗi
Khi báo lỗi, vui lòng ghi:
- Phiên bản Chrome và phiên bản CVAT (nếu biết).
- Domain đang dùng.
- Kết quả của nút **Log uniform** (xem [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)).
