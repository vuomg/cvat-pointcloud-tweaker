# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [SemVer](https://semver.org/lang/vi/).

## [Unreleased]
### Changed
- Mỗi lần mở trang đều bắt đầu từ **giá trị gốc của CVAT** (mọi hệ số trung tính, mọi tùy chọn tắt). Cấu hình chỉ được khôi phục khi bật **Nhớ cấu hình cho lần mở sau** (mục Nâng cao). Trạng thái đóng/mở bảng vẫn luôn được nhớ.
- Thanh kích thước điểm hiện thêm giá trị tuyệt đối và giá trị gốc CVAT đọc từ shader (ví dụ `×1.0 (= 0.05, gốc 0.05)`).
- Bảng chỉnh gọn hơn: mặc định chỉ hiện Preset, Kích thước, Độ sáng, Tương phản và ô Tô màu theo độ cao. Các tham số còn lại nằm trong mục **Nâng cao** (đóng sẵn, trạng thái mở/đóng được nhớ). Hai thanh độ cao chỉ hiện khi bật Tô màu theo độ cao.

### Added
- **Tô màu theo độ cao** (trục z, mét): xanh dương là thấp, đỏ là cao, kèm hai thanh trượt chọn khoảng độ cao. Cách làm: chèn mã vào vertex shader của point cloud khi shader được nạp. Chưa kiểm chứng trên CVAT thật.
### Fixed
- **Đổi màu điểm** không còn làm đổi màu cuboid. Màu chỉ được ghi đè khi vẽ point cloud (từ 1000 điểm trở lên).

## [0.2.0] - 2026-11-26
### Added
- Gamma, độ bão hòa, xoay sắc độ (hue), thang xám, đảo màu (nền trắng).
- Đổi màu nền của view 3D (ghi đè `clearColor`).
- Preset có sẵn (Rõ nét, Điểm thưa, Nền trắng) và một slot preset của người dùng (Lưu và Tải).
- Dải kích thước điểm mở rộng đến ×8.
- Bảng chỉnh cuộn được khi cao hơn màn hình.
- Cho phép chạy trên `localhost` và `127.0.0.1` (CVAT local).

## [0.1.0] - 2026-11-26
### Added
- Bảng chỉnh nổi (nút **PC**, phím tắt Alt+Shift+P).
- Chỉnh kích thước điểm bằng hook WebGL (`size`).
- Chỉnh độ sáng và tương phản bằng CSS filter trên canvas WebGL.
- Đổi màu điểm bằng cách ghi đè `diffuse` (tùy chọn).
- Lưu cấu hình trong `localStorage`.
- Nút **Log uniform** để debug.
