
import { z } from 'zod';
import { PRODUCT_CATEGORIES, EXPENSE_CATEGORIES, PRODUCT_UNITS, SALES_ORDER_STATUSES } from './types';

const requiredString = (fieldName: string) => z.string().min(1, `${fieldName} là bắt buộc`);
const positiveNumber = (fieldName: string) => z.number().min(0.01, `${fieldName} phải lớn hơn 0`);
const nonNegativeNumber = (fieldName: string) => z.number().min(0, `${fieldName} không được âm`);

export const ProductSchema = z.object({
  name: requiredString('Tên sản phẩm'),
  sku: z.string().optional(),
  unit: z.enum(PRODUCT_UNITS, { errorMap: () => ({ message: "Đơn vị tính không hợp lệ" }) }),
  costPrice: z.preprocess(
    (val) => (val === "" ? undefined : parseFloat(String(val))),
    z.number().positive("Giá vốn phải là số dương").optional()
  ),
  sellingPrice: z.preprocess(
    (val) => (val === "" ? undefined : parseFloat(String(val))),
    z.number().positive("Giá bán phải là số dương").optional()
  ),
  minStockLevel: z.preprocess(
    (val) => (val === "" ? undefined : parseInt(String(val), 10)),
    z.number().int().min(0, "Tồn kho tối thiểu không được âm").optional()
  ),
  initialStock: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, "Tồn kho ban đầu không được âm")
  ),
  imageUrl: z.string().url("URL hình ảnh không hợp lệ").optional().or(z.literal('')),
});

export const IncomeEntrySchema = z.object({
  date: requiredString('Ngày'), 
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    positiveNumber('Số tiền')
  ),
  category: z.enum(PRODUCT_CATEGORIES, { errorMap: () => ({ message: "Danh mục thu nhập không hợp lệ" }) }),
  description: z.string().optional(),
  relatedOrderId: z.string().optional(),
});

export const ExpenseEntrySchema = z.object({
  date: requiredString('Ngày'), 
  amount: z.preprocess(
    (val) => parseFloat(String(val)),
    positiveNumber('Số tiền')
  ),
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: "Danh mục chi tiêu không hợp lệ" }) }),
  description: z.string().optional(),
  receiptImageUrl: z.string().url("URL hình ảnh biên lai không hợp lệ").optional().or(z.literal('')),
});

export const InventoryTransactionSchema = z.object({
  productId: requiredString('Sản phẩm'),
  quantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, "Số lượng phải lớn hơn 0")
  ),
  date: requiredString('Ngày'), 
  relatedParty: z.string().optional(),
  notes: z.string().optional(),
  relatedOrderId: z.string().optional(),
});

export const FinancialForecastApiInputSchema = z.object({
  incomeData: z.string().min(1, "Dữ liệu thu nhập là bắt buộc"),
  expenseData: z.string().min(1, "Dữ liệu chi tiêu là bắt buộc"),
});

// Schemas for Sales Order
export const OrderItemSchema = z.object({
  productId: requiredString('Sản phẩm'),
  productName: requiredString('Tên sản phẩm'), // For display and record keeping
  quantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(1, "Số lượng phải lớn hơn 0")
  ),
  unitPrice: z.preprocess(
    (val) => parseFloat(String(val)),
    nonNegativeNumber('Đơn giá') // Allow 0 for free items
  ),
  costPrice: z.preprocess(
    (val) => parseFloat(String(val)),
    nonNegativeNumber('Giá vốn')
  ),
  // totalPrice will be calculated: quantity * unitPrice
});

export const SalesOrderSchema = z.object({
  orderNumber: z.string().optional(), // Can be auto-generated
  customerName: z.string().optional(),
  date: requiredString('Ngày tạo đơn'),
  items: z.array(OrderItemSchema).min(1, "Đơn hàng phải có ít nhất một sản phẩm"),
  status: z.enum(SALES_ORDER_STATUSES, { errorMap: () => ({ message: "Trạng thái đơn hàng không hợp lệ" }) }),
  notes: z.string().optional(),
  // totalAmount, totalCost, totalProfit will be calculated
});

