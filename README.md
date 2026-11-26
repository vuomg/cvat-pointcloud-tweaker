# CVAT Point Cloud Tweaker

Extension Chrome nhỏ giúp nhìn point cloud rõ hơn trong **CVAT 3D**: chỉnh **kích thước điểm**, **độ sáng**, **tương phản** và **màu điểm**.

Extension chỉ đổi cách hiển thị trong trình duyệt của bạn. Nó **không** sửa dữ liệu annotation, không click hay vẽ thay bạn, và không gọi công cụ auto-label.

## Tính năng

| Tham số | Cách hoạt động |
|---|---|
| Kích thước điểm | Nhân hệ số (×0.3 đến ×8) vào uniform `size` khi vẽ point cloud |
| Độ sáng, tương phản | CSS filter trên các canvas WebGL (3D, Top, Side, Front). Ảnh camera không bị đổi |
| Gamma | SVG filter. Gamma nhỏ hơn 1 làm sáng vùng tối, hợp với điểm thưa |
| Bão hòa, hue, thang xám | CSS filter |
| Đảo màu | Đảo màu toàn bộ canvas WebGL để có nền trắng. Preset "Nền trắng" kèm xoay hue 180° để giữ lại màu |
| Màu theo độ cao | Chèn mã vào vertex shader để tô màu theo trục z (xanh dương thấp, đỏ cao). Chọn khoảng độ cao bằng hai thanh trượt. Tắt khi shader không có vertex color |
| Màu điểm | Ghi đè uniform `diffuse` khi vẽ point cloud (tùy chọn) |
| Màu nền | Ghi đè `clearColor` của WebGL (tùy chọn) |
| Preset | Có sẵn: Mặc định, Rõ nét, Điểm thưa (LiDAR 32 tia), Nền trắng. Có thêm một slot **Lưu của tôi / Tải của tôi** |
| Lưu cấu hình | Lưu trong `localStorage` của trình duyệt |

## Yêu cầu
- Chrome 111 trở lên (manifest dùng `"world": "MAIN"`).
- Một trang CVAT 3D thuộc domain được cấu hình (xem [Domain](#domain)).

## Cài đặt
1. Mở `chrome://extensions`.
2. Bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked** rồi chọn thư mục repo này.
4. Tải lại (F5) trang job CVAT 3D.

## Sử dụng
- Bấm nút tròn **PC** ở góc dưới trái trang, hoặc nhấn **Alt+Shift+P**, để mở bảng chỉnh.
- Kéo các thanh trượt, tích **Đổi màu điểm** để chọn màu.
- **Đặt lại** đưa mọi tham số về mặc định.
- **Log uniform** in tên các uniform shader đã thấy ra Console, dùng khi cần debug (xem [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)).

## Domain
Mặc định extension chạy trên:
- `https://cvat.edufun.ai/*`
- `https://app.cvat.ai/*`
- `http://localhost/*` và `http://127.0.0.1/*` (CVAT chạy local)

Muốn thêm domain khác, sửa mảng `matches` trong [manifest.json](manifest.json) rồi bấm nút reload của extension ở `chrome://extensions`.

## Cấu trúc repo
```
cvat-pointcloud-tweaker/
├── manifest.json        # Cấu hình extension (MV3)
├── tweak.js             # Hook WebGL + bảng điều khiển
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── docs/
    └── TROUBLESHOOTING.md
```

## Giới hạn đã biết
- Kích thước và màu điểm phụ thuộc tên uniform `size` và `diffuse` trong shader của CVAT. Chưa kiểm chứng trên mọi phiên bản CVAT.
- Nếu point cloud tô màu riêng cho từng điểm, đổi màu có thể không thấy khác.
- Độ sáng và tương phản dùng CSS nên luôn chạy.

## Giấy phép
Chưa chọn giấy phép. Thêm file `LICENSE` trước khi công khai repo.
