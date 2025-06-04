# **App Name**: QUẢN LÝ KHO - THU CHI

## Core Features:

- Financial Overview: Dashboard with graphical income/expense summary.
- Income Tracking: Tracking income by category (salary, sales, etc.).
- Expense Recording: Expense recording with optional notes/receipt image uploads.
- Inventory Tracking: Product inventory tracking (name, price, quantity):

  ## Chức năng Quản lý Kho (Theo dõi Xuất - Nhập - Tồn) inventory

  Chức năng này giúp bạn nắm bắt chính xác số lượng mỗi mặt hàng bạn có, đã nhập bao nhiêu và đã xuất bao nhiêu.
  1. **Định nghĩa và Quản lý Sản phẩm/Mặt hàng:**

     - **Thêm mới sản phẩm:**
       - **Tên sản phẩm:** Rõ ràng, dễ nhận biết (ví dụ: "Sách Kỹ Năng A", "Nguyên liệu B", "Thành phẩm C").
       - **(Tùy chọn) Mã sản phẩm/SKU:** Một mã duy nhất để dễ dàng tra cứu (ví dụ: "SP001").
       - **Đơn vị tính:** (ví dụ: cái, cuốn, kg, lít, bộ).
       - **(Tùy chọn) Giá vốn/Giá nhập:** Giá bạn mua sản phẩm (hữu ích để tính toán lợi nhuận sau này).
       - **(Tùy chọn) Giá bán:** Giá bạn bán sản phẩm.
       - **(Tùy chọn) Mức tồn kho tối thiểu:** Số lượng cảnh báo khi hàng sắp hết.
       - **Tồn kho ban đầu:** Số lượng sản phẩm hiện có khi bạn bắt đầu sử dụng ứng dụng hoặc khi thêm mới một sản phẩm đã có sẵn.
     - **Xem danh sách sản phẩm:** Hiển thị tất cả sản phẩm với các thông tin cốt lõi như tên, mã, đơn vị tính, và quan trọng nhất là **số lượng tồn kho hiện tại**.
     - **Chỉnh sửa/Xóa sản phẩm:** Cho phép cập nhật thông tin sản phẩm hoặc xóa (nếu chưa có giao dịch liên quan hoặc có cơ chế xử lý phù hợp).

  2. **Ghi nhận Giao dịch Nhập kho (Hàng vào):** ➕

     - Khi bạn mua thêm hàng, nhận hàng mới hoặc sản xuất thêm sản phẩm.
     - Tạo một "Phiếu nhập kho" (hoặc một giao dịch nhập đơn giản) với các thông tin:
       - **Chọn sản phẩm:** Từ danh sách sản phẩm đã định nghĩa.
       - **Số lượng nhập:** Số lượng thực tế nhận được.
       - **Ngày nhập:** Ngày hàng hóa được nhập vào kho.
       - **(Tùy chọn) Nhà cung cấp/Nguồn gốc.**
       - **(Tùy chọn) Ghi chú:** Thông tin thêm như số hóa đơn, lô hàng,...
     - **Tác động:** Sau khi lưu giao dịch nhập, số lượng tồn kho của sản phẩm tương ứng sẽ **tự động tăng lên**.

  3. **Ghi nhận Giao dịch Xuất kho (Hàng ra):** ➖

     - Khi bạn bán hàng, sử dụng nguyên vật liệu để sản xuất, hoặc xuất hàng vì lý do khác.
     - Tạo một "Phiếu xuất kho" (hoặc một giao dịch xuất đơn giản) với các thông tin:
       - **Chọn sản phẩm:** Từ danh sách sản phẩm đã định nghĩa.
       - **Số lượng xuất:** Số lượng thực tế xuất ra.
       - **Ngày xuất:** Ngày hàng hóa được xuất khỏi kho.
       - **(Tùy chọn) Khách hàng/Mục đích sử dụng.**
       - **(Tùy chọn) Ghi chú:** Thông tin thêm như số đơn hàng,...
     - **Tác động:** Sau khi lưu giao dịch xuất, số lượng tồn kho của sản phẩm tương ứng sẽ **tự động giảm xuống**.
     - **Kiểm tra tồn kho:** Ứng dụng nên có cảnh báo nếu người dùng cố gắng xuất số lượng lớn hơn số lượng đang có trong kho.

  4. **Theo dõi Số lượng Tồn kho Hiện tại:** 🔢

     - Đây là trái tim của quản lý kho.
     - Với mỗi sản phẩm, ứng dụng sẽ luôn hiển thị số lượng tồn kho thực tế.
     - Công thức cơ bản: **Tồn kho hiện tại = Tồn kho ban đầu + Tổng số lượng đã nhập - Tổng số lượng đã xuất.**
     - Thông tin này được cập nhật tự động và ngay lập tức sau mỗi giao dịch nhập hoặc xuất.
- Stock Level Reporting: Basic report showing stock levels. Report generated without using a database.
- Revenue vs. Expenses Reporting: Visualization of total revenue vs total expenses
- AI Forecasting Tool: AI tool that provides forecast recommendations based on past trends, assisting in financial planning.

## Style Guidelines:

- Teal (#4db6ac) to convey trustworthiness.
- Light gray (#f0f4c4) provides a clean base for data presentation.
- Orange (#ffb74d) to highlight important financial data or call-to-action buttons.
- 'Inter', a sans-serif font known for its legibility and modern appearance, for a clear presentation of data and reports.
- Use simple, outlined icons from a consistent set to represent income, expenses, inventory, and reports.
- Dashboard layout prioritizing financial overview graphs and key metrics.
- Subtle transitions and animations to confirm user actions.