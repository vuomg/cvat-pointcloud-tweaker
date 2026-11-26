# CVAT Point Cloud Tweaker

Extension Chrome nhỏ giúp nhìn point cloud rõ hơn trong CVAT 3D: chỉnh **kích thước điểm**, **độ sáng**, **tương phản**, **màu điểm**.
Chỉ đổi cách hiển thị trong trình duyệt của bạn. Không sửa dữ liệu annotation và không click hay vẽ thay bạn.

## Cài đặt
1. Mở `chrome://extensions`.
2. Bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked** rồi chọn thư mục `V:\cvat-pointcloud-tweaker`.
4. Mở lại (F5) trang job CVAT 3D.

Cần Chrome 111 trở lên (extension dùng `"world": "MAIN"`).

## Sử dụng
- Bấm nút tròn **PC** ở góc dưới trái trang, hoặc nhấn **Alt+Shift+P**, để mở bảng chỉnh.
- **Kích thước điểm:** nhân hệ số vào kích thước điểm (×0.3 đến ×6).
- **Độ sáng / Tương phản:** áp lên các canvas WebGL (3D view, Top, Side, Front). Ảnh camera không bị ảnh hưởng.
- **Đổi màu điểm:** tích ô rồi chọn màu. Nếu point cloud của bạn tô màu theo từng điểm thì có thể không đổi.
- **Đặt lại:** về giá trị mặc định. Thiết lập được lưu trong trình duyệt.

## Domain
Mặc định chạy trên `https://cvat.edufun.ai/*` và `https://app.cvat.ai/*`.
Muốn thêm domain khác thì sửa `matches` trong `manifest.json`, rồi bấm nút reload của extension.

## Nếu kích thước hoặc màu không đổi
Độ sáng và tương phản dùng CSS nên luôn chạy. Kích thước và màu phụ thuộc tên uniform trong shader của CVAT (`size`, `diffuse`).
1. Mở Console (F12), bấm nút **Log uniform** trong bảng.
2. Gửi lại danh sách tên uniform in ra, tôi sẽ chỉnh script cho khớp.

## Lưu ý
- Chưa được thử trên bản CVAT của trường, nên hãy kiểm tra lần đầu.
- Extension chỉ hook việc vẽ điểm của WebGL, nên không ảnh hưởng đến thao tác vẽ cuboid hay dữ liệu lưu.
