# Xử lý sự cố

## Không thấy nút **PC**
- Kiểm tra extension đang bật ở `chrome://extensions`.
- Kiểm tra domain của trang có nằm trong `matches` của [manifest.json](../manifest.json) không.
- Tải lại trang (F5) sau khi cài hoặc reload extension.
- Chrome phải từ phiên bản 111 trở lên.

## Độ sáng và tương phản không đổi
- Extension chỉ áp filter lên canvas WebGL. Nếu CVAT của bạn vẽ point cloud bằng canvas 2D, filter sẽ không áp.
- Mở Console, gõ `document.querySelectorAll('canvas[data-pct]').length`. Kết quả 0 nghĩa là chưa có canvas WebGL nào được đánh dấu. Hãy tải lại trang.

## Kích thước điểm không đổi
Kích thước phụ thuộc uniform tên `size`.
1. Mở Console (F12).
2. Bấm **Log uniform** trong bảng.
3. Xem danh sách tên uniform. Nếu không có `size`, shader của CVAT dùng tên khác, cần sửa trong `tweak.js` (hàm `getUniformLocation` và chỗ kiểm tra `'size'`).
4. Nếu có `size` mà vẫn không đổi, thử kéo thanh trượt rồi xoay nhẹ view 3D để buộc CVAT vẽ lại.

## Màu điểm không đổi
- Màu dựa trên uniform `diffuse`. Nếu point cloud mang màu theo từng điểm (vertex color), màu riêng sẽ che màu ghi đè.
- Kiểm tra bằng **Log uniform** xem `diffuse` có trong danh sách không.

## Tô màu theo độ cao không hoạt động
- Cạnh ô tích hiện **(chưa hỗ trợ)** nghĩa là extension không tìm thấy shader point cloud phù hợp (không có `vColor` hoặc cấu trúc khác). Tải lại trang sau khi bật extension, vì shader chỉ được chèn lúc nạp.
- Nếu toàn bộ điểm cùng một màu, chỉnh lại hai thanh **Độ cao thấp nhất / cao nhất**. Mặc định -2 m đến 4 m, mặt đường của LiDAR gắn trên nóc xe thường nằm quanh -1,7 m.
- Tính năng giả định trục z hướng lên. Nếu dữ liệu của bạn dùng trục khác, màu sẽ không theo độ cao thật.
- Khi bật màu theo độ cao, tùy chọn **Đổi màu điểm** bị bỏ qua.

## Phím tắt của CVAT bị kích hoạt khi gõ trong bảng
Bảng đã chặn sự kiện phím bên trong nó. Nếu vẫn bị, hãy báo kèm phiên bản CVAT.

## Gỡ extension
Vào `chrome://extensions`, bấm **Remove**. Cấu hình chỉ nằm trong `localStorage` của trang CVAT, có thể xóa bằng cách xóa dữ liệu trang (khóa `cvatPcTweak.v1`).
