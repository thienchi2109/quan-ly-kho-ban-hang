export type ProductCategory = 'Lương' | 'Bán hàng' | 'Đầu tư' | 'Khác';
export type ExpenseCategory = 'Thực phẩm' | 'Di chuyển' | 'Nhà ở' | 'Giải trí' | 'Giáo dục' | 'Sức khỏe' | 'Nguyên vật liệu' | 'Khác';
export type ProductUnit = 'cái' | 'cuốn' | 'kg' | 'lít' | 'bộ' | 'm' | 'thùng' | 'chai' | 'hộp';

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

export interface IncomeEntry {
  id: string;
  date: string; // ISO string
  amount: number;
  category: ProductCategory;
  description?: string;
}

export interface ExpenseEntry {
  id: string;
  date: string; // ISO string
  amount: number;
  category: ExpenseCategory;
  description?: string;
  receiptImageUrl?: string;
}

export type InventoryTransactionType = 'import' | 'export';

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: InventoryTransactionType;
  quantity: number;
  date: string; // ISO string
  relatedParty?: string; // Supplier for import, Customer for export
  notes?: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = ['Lương', 'Bán hàng', 'Đầu tư', 'Khác'];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Thực phẩm', 'Di chuyển', 'Nhà ở', 'Giải trí', 'Giáo dục', 'Sức khỏe', 'Nguyên vật liệu', 'Khác'];
export const PRODUCT_UNITS: ProductUnit[] = ['cái', 'cuốn', 'kg', 'lít', 'bộ', 'm', 'thùng', 'chai', 'hộp'];

export const navLinks = [
  { href: "/dashboard", label: "Tổng Quan", icon: "LayoutDashboard" },
  { href: "/income", label: "Thu Nhập", icon: "TrendingUp" },
  { href: "/expenses", label: "Chi Tiêu", icon: "TrendingDown" },
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
  | "BrainCircuit";

