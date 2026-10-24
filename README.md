# First Press

Ứng dụng đánh giá sách: React/Vite ở frontend, Node.js/Express REST API ở backend và MongoDB lưu dữ liệu.

## Chạy trên Windows

1. Cài Node.js 20 trở lên và MongoDB Server; khởi động MongoDB.
2. Chép `account.txt` vào thư mục dự án nếu cần giữ các tài khoản hiện có.
3. Chạy `setup_account_and_database.bat` để cài dependencies, tạo/kiểm tra tài khoản và nạp dữ liệu mẫu. Cửa sổ chờ phím sau khi hoàn tất hoặc gặp lỗi.
4. Chạy `run_server.bat`; mở địa chỉ frontend được in ra cửa sổ. Đóng cửa sổ backend và frontend để dừng server.

File `account.txt` chứa mật khẩu.

## Cấu hình

Chỉnh các thiết lập thông thường trong [`app.config.cjs`](./app.config.cjs):

- `frontend.host`, `frontend.port`: địa chỉ giao diện.
- `backend.host`, `backend.port`: địa chỉ REST API.
- `database.uri`: địa chỉ MongoDB và tên database.
- `session.cookieSameSite`: chính sách cookie phiên.
- `demoAccounts`: tên hiển thị, tên đăng nhập, vai trò và thông tin mẫu cho tài khoản khởi tạo. Mật khẩu được tạo ngẫu nhiên, chỉ lưu trong `account.txt`.

Các biến môi trường như `PORT`, `HOST`, `MONGODB_URI`, `FRONTEND_ORIGIN`, `VITE_PROXY_TARGET` có thể ghi đè cấu hình khi cần.
## Tài khoản và dữ liệu

`npm run setup:accounts` khởi tạo một admin, hai độc giả và hai nhà xuất bản trên database trống. Nếu đã khởi tạo, lệnh xác minh tài khoản dựa trên `account.txt` và không ghi đè dữ liệu. `npm run seed:demo` thêm sách, đánh giá, thảo luận và góp ý mẫu; chạy lại an toàn, không tạo trùng.

## Chức năng

| Vai trò | Chức năng chính |
| --- | --- |
| Khách | Tìm sách đã xuất bản, xem chi tiết, đánh giá và thảo luận |
| Độc giả | Đánh giá, thảo luận, gửi góp ý riêng và quản lý tài khoản |
| Nhà xuất bản | Gửi/sửa sách chờ duyệt, theo dõi góp ý cho sách của mình |
| Quản trị viên | Duyệt sách, xem người dùng, góp ý và thống kê |