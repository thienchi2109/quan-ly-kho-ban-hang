
export type ProductCategory = 'Lương' | 'Bán hàng' | 'Đầu tư' | 'Khác';
export type ExpenseCategory = 'Thực phẩm' | 'Di chuyển' | 'Nhà ở' | 'Giải trí' | 'Giáo dục' | 'Sức khỏe' | 'Nguyên vật liệu' | 'Giá vốn hàng bán' | 'Khác'; // Added 'Giá vốn hàng bán'
export type ProductUnit = 'cái' | 'cuốn' | 'kg' | 'lít' | 'bộ' | 'm' | 'thùng' | 'chai' | 'hộp';
export type SalesOrderStatus = 'Mới' | 'Hoàn thành' | 'Đã hủy';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  unit: ProductUnit;
  costPrice?: number;
  sellingPrice?: number;
  minStockLevel?: number;
  initialStock: number;
  currentStock: number; // This will be calculated
  imageUrl?: string; // Optional image for product
}

export interface ProductFormValues {
  name: string;
  sku?: string;
  unit: ProductUnit;
  costPrice?: number | '';
  sellingPrice?: number | '';
  minStockLevel?: number | '';
  initialStock: number;
  imageUrl?: string;
}


export interface IncomeEntry {
  id: string;
  date: string; 
  amount: number;
  category: ProductCategory;
  description?: string;
  relatedOrderId?: string; // To link income to a sales order
}

export interface ExpenseEntry {
  id: string;
  date: string; 
  amount: number;
  category: ExpenseCategory;
  description?: string;
  receiptImageUrl?: string;
  relatedOrderId?: string; // Added to link COGS expense to sales order
}

export type InventoryTransactionType = 'import' | 'export';

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
  date: string; 
  relatedParty?: string; 
  notes?: string;
  relatedOrderId?: string; // To link transaction to a sales order
}

export interface OrderItem {
  id: string; // Temporary ID for form handling, or actual ID if fetched
  productId: string;
  productName: string; // Denormalized for display
  quantity: number;
  unitPrice: number; // Price at which it was sold
  costPrice: number; // Cost price of the product at the time of sale
  totalPrice: number; // quantity * unitPrice
}

export interface SalesOrder {
  id: string;
  orderNumber: string; // Auto-generated or manual
  customerId?: string; // Optional, can be simple text field for now
  customerName?: string;
  date: string; // ISO string
  items: OrderItem[];
  totalAmount: number;
  totalCost: number; // Sum of (item.costPrice * item.quantity)
  totalProfit: number; // totalAmount - totalCost
  status: SalesOrderStatus;
  notes?: string;
}


export const PRODUCT_CATEGORIES: ProductCategory[] = ['Lương', 'Bán hàng', 'Đầu tư', 'Khác'];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Thực phẩm', 'Di chuyển', 'Nhà ở', 'Giải trí', 'Giáo dục', 'Sức khỏe', 'Nguyên vật liệu', 'Giá vốn hàng bán', 'Khác']; // Added 'Giá vốn hàng bán'
export const PRODUCT_UNITS: ProductUnit[] = ['cái', 'cuốn', 'kg', 'lít', 'bộ', 'm', 'thùng', 'chai', 'hộp'];
export const SALES_ORDER_STATUSES: SalesOrderStatus[] = ['Mới', 'Hoàn thành', 'Đã hủy'];

export const navLinks = [
  { href: "/dashboard", label: "Tổng Quan", icon: "LayoutDashboard" },
  { href: "/income", label: "Thu Nhập", icon: "TrendingUp" },
  { href: "/expenses", label: "Chi Tiêu", icon: "TrendingDown" },
  { href: "/sales/orders", label: "Đơn Hàng Bán", icon: "ShoppingCart" },
  {
    label: "Quản Lý Kho",
    icon: "Warehouse",
    subLinks: [
      { href: "/inventory/products", label: "Sản Phẩm", icon: "Package" },
      { href: "/inventory/imports", label: "Nhập Kho", icon: "PackagePlus" },
      { href: "/inventory/exports", label: "Xuất Kho", icon: "PackageMinus" },
    ],
  },
  {
    label: "Báo Cáo",
    icon: "BarChart3",
    subLinks: [
      { href: "/reports/stock-levels", label: "Tồn Kho", icon: "Boxes" },
      { href: "/reports/revenue-expenses", label: "Doanh Thu - Chi Phí", icon: "LineChart" },
    ],
  },
  { href: "/forecasting", label: "Dự Báo AI", icon: "BrainCircuit" },
];

export type NavLinkIcon = 
  | "LayoutDashboard" 
  | "TrendingUp" 
  | "TrendingDown" 
  | "Warehouse" 
  | "Package" 
  | "PackagePlus" 
  | "PackageMinus" 
  | "BarChart3" 
  | "Boxes" 
  | "LineChart" 
  | "BrainCircuit"
  | "ShoppingCart"; // Added ShoppingCart
    
