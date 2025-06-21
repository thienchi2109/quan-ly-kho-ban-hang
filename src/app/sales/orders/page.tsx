"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SalesOrderSchema, OrderItemSchema as SingleOrderItemSchema } from '@/lib/schemas';
import type { SalesOrder, OrderItem as OrderItemType, Product, SalesOrderStatus, OrderDataForPayment, ExtractedSalesItem as ExtractedSalesItemType } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel as ShadcnFormLabel, FormMessage } from "@/components/ui/form"; 
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef, Row, SortingState } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { format, parse, isWithinInterval, startOfDay, endOfDay, isValid as isValidDate } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Trash2, ShoppingCart, Edit3, MoreHorizontal, Eye, Loader2, MinusCircle, CalendarIcon, FilterX, ArrowUpCircle, ArrowDownCircle, DollarSign, Save, ArrowLeft, Printer, ArrowUp, ArrowDown, ArrowUpDown, ImagePlus, UploadCloud, Camera, Sparkles, PackageSearch, CheckCircle2, Wand, ArrowRightCircle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SALES_ORDER_STATUSES } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import SalesOrderDetailModal from '@/components/sales/SalesOrderDetailModal';
import PaymentModal from '@/components/sales/PaymentModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { SearchableProductSelect } from '@/components/common/SearchableProductSelect';
import { useIsMobile } from '@/hooks/use-mobile';
import ProductDetailModal from '@/components/products/ProductDetailModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  extractSalesNoteInfo, 
  type ExtractSalesNoteOutput, 
  type ExtractedSalesItem
} from '@/ai/flows/extract-sales-note-flow';
import { useAuth } from '@/contexts/AuthContext';


type SalesOrderFormValues = {
  customerName?: string;
  date: string;
  items: Array<Omit<OrderItemType, 'id' | 'totalPrice' | 'costPrice'> & { costPrice?: number, tempId?: string }>;
  notes?: string;
};

// Helper for fuzzy matching (can be moved to utils if used elsewhere)
const normalizeString = (str: string | undefined | null): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
};

const fuzzyMatchProductForSales = (productNameGuess: string, productsList: Product[]): Product | undefined => {
  if (!productNameGuess || productsList.length === 0) return undefined;
  const normalizedGuess = normalizeString(productNameGuess);

  const skuMatch = productsList.find(p => p.sku && normalizeString(p.sku) === normalizedGuess && p.currentStock > 0);
  if (skuMatch) return skuMatch;

  const nameMatch = productsList.find(p => normalizeString(p.name) === normalizedGuess && p.currentStock > 0);
  if (nameMatch) return nameMatch;
  
  let bestMatch: Product | undefined = undefined;
  let highestScore = 0.5; // Adjusted threshold

  for (const product of productsList) {
    if (product.currentStock <= 0) continue; 

    const normalizedProductName = normalizeString(product.name);
    let score = 0;

    const wordsGuess = normalizedGuess.split(/\s+/);
    const wordsName = normalizedProductName.split(/\s+/);
    let commonWords = 0;
    wordsGuess.forEach(wg => {
        if (wordsName.includes(wg)) commonWords++;
    });
    score = commonWords / Math.max(wordsGuess.length, wordsName.length, 1);
    
    if (normalizedProductName.includes(normalizedGuess) || normalizedGuess.includes(normalizedProductName)) {
      score = Math.max(score, 0.7); // Boost score for direct inclusion
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = product;
    }
  }
  return bestMatch;
};

// State for each AI Extracted Sales Item in the Dialog
interface AiSalesItemState {
  originalItem: ExtractedSalesItem; 
  selectedProductId: string | undefined;
  quantity: number | string;
  unitPrice: number | string;
  isAddedToOrder: boolean;
  tempId: string; 
}

function dataURLtoFile(dataurl: string, filename: string): File | null {
  const arr = dataurl.split(',');
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) return null;
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

const SortableHeader = ({ column, title }: { column: any, title: string }) => {
  const isSorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted === "asc")}
      className="px-2 py-1 -ml-2 text-xs sm:text-sm"
    >
      {title}
      {isSorted === "asc" && <ArrowUp className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />}
      {isSorted === "desc" && <ArrowDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />}
      {!isSorted && <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 opacity-30" />}
    </Button>
  );
};


export default function SalesOrdersPage() {
  const { salesOrders, products, addSalesOrder, updateSalesOrderStatus, isLoading: isDataContextLoading, getProductStock, getProductById } = useData();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderDataForPayment, setOrderDataForPayment] = useState<OrderDataForPayment | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>(undefined);
  const [filterToDate, setFilterToDate] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<SalesOrderStatus | 'all'>('all');

  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setIsToDatePickerOpen] = useState(false);

  const productSelectRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const newlyAddedItemIndexRef = useRef<number | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const isMobile = useIsMobile();
  const [mobileSortOption, setMobileSortOption] = useState<string>('date_desc');
  const [viewingProductFromOrder, setViewingProductFromOrder] = useState<Product | null>(null);

  // AI Sales Note States
  const [isAiSalesNoteModalOpen, setIsAiSalesNoteModalOpen] = useState(false);
  const [aiSalesNoteImagePreview, setAiSalesNoteImagePreview] = useState<string | null>(null);
  const [aiSalesNoteImageDataUri, setAiSalesNoteImageDataUri] = useState<string | null>(null);
  const [isAiSalesNoteProcessing, setIsAiSalesNoteProcessing] = useState(false);
  const [aiSalesNoteCameraOpen, setAiSalesNoteCameraOpen] = useState(false);
  const [aiSalesNoteHasCameraPermission, setAiSalesNoteHasCameraPermission] = useState<boolean | null>(null);
  const aiSalesNoteVideoRef = useRef<HTMLVideoElement>(null);
  const aiSalesNoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const aiSalesNoteFileInputRef = useRef<HTMLInputElement>(null);
  const [aiSalesNoteResult, setAiSalesNoteResult] = useState<ExtractSalesNoteOutput | null>(null);
  const [aiSalesNoteItemStates, setAiSalesNoteItemStates] = useState<AiSalesItemState[]>([]);


  const createOrderForm = useForm<SalesOrderFormValues>({
    resolver: zodResolver(SalesOrderSchema.omit({ orderNumber: true, status: true, totalAmount: true, discountPercentage: true, otherIncomeAmount: true, finalAmount: true, paymentMethod: true, cashReceived: true, changeGiven: true })),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      customerName: '',
      items: [],
      notes: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: createOrderForm.control,
    name: "items",
    keyName: "fieldId",
  });

  const watchedItems = createOrderForm.watch("items");

  useEffect(() => {
    productSelectRefs.current = productSelectRefs.current.slice(0, fields.length);
  }, [fields.length]);

  useEffect(() => {
    if (newlyAddedItemIndexRef.current !== null) {
      const indexToFocus = newlyAddedItemIndexRef.current;
      setTimeout(() => {
        if (productSelectRefs.current && productSelectRefs.current[indexToFocus]) {
          productSelectRefs.current[indexToFocus]?.focus();
        }
        newlyAddedItemIndexRef.current = null;
      }, 0);
    }
  }, [fields]);

  useEffect(() => {
    if (isCreateOrderModalOpen && !isPaymentModalOpen) {
      setTimeout(() => {
        customerNameInputRef.current?.focus();
      }, 100);
    }
  }, [isCreateOrderModalOpen, isPaymentModalOpen]);


  const calculateTotalAmount = useCallback(() => {
    return watchedItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return sum + (quantity * unitPrice);
    }, 0);
  }, [watchedItems]);


  const handleOpenPaymentModal = (values: SalesOrderFormValues) => {
    const currentOrderTotal = calculateTotalAmount();
     if (values.items.filter(item => Number(item.quantity) > 0 && item.productId).length === 0) {
        toast({
            title: "Đơn hàng trống",
            description: "Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng.",
            variant: "destructive",
        });
        return;
    }
    setOrderDataForPayment({
      ...values,
      items: values.items.map(item => ({
          ...item,
          costPrice: products.find(p => p.id === item.productId)?.costPrice || 0
      })),
      currentOrderTotal: currentOrderTotal,
    });
    setIsCreateOrderModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleSaveDraftOrder = async (values: SalesOrderFormValues) => {
    setIsSubmittingOrder(true);
    const validItems = values.items.filter(item => Number(item.quantity) > 0 && item.productId);

    if (validItems.length === 0) {
        toast({ title: "Đơn hàng trống", description: "Vui lòng thêm sản phẩm.", variant: "destructive" });
        setIsSubmittingOrder(false);
        return;
    }

    const itemsForOrder = validItems.map(item => {
      const productDetails = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        costPrice: productDetails?.costPrice || 0,
      };
    });

    const orderPayload = {
      customerName: values.customerName,
      date: values.date,
      items: itemsForOrder,
      notes: values.notes,
      status: 'Mới' as SalesOrderStatus,
      totalAmount: calculateTotalAmount(),
    };

    const orderId = await addSalesOrder(orderPayload, true);

    if (orderId) {
      toast({ title: "Thành công!", description: "Đã lưu tạm đơn hàng." });
      createOrderForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], notes: '' });
      setIsCreateOrderModalOpen(false);
    }
    setIsSubmittingOrder(false);
  };

  const handleConfirmPayment = async (paymentDetails: {
    discountPercentage: number;
    otherIncomeAmount: number;
    paymentMethod: 'Tiền mặt' | 'Chuyển khoản';
    cashReceived?: number;
  }) => {
    if (!orderDataForPayment) return;
    setIsSubmittingOrder(true);
    let orderSuccessfullyProcessed = false;

    try {
      const { items, date, customerName, notes, currentOrderTotal } = orderDataForPayment;
      const finalAmount = (currentOrderTotal * (1 - (paymentDetails.discountPercentage || 0) / 100)) + (paymentDetails.otherIncomeAmount || 0);
      const changeGiven = paymentDetails.paymentMethod === 'Tiền mặt' && paymentDetails.cashReceived !== undefined
                          ? paymentDetails.cashReceived - finalAmount
                          : undefined;

      const itemsForOrder = items.map(item => {
          const productDetails = products.find(p => p.id === item.productId);
          return {
              productId: item.productId,
              productName: item.productName,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              costPrice: productDetails?.costPrice || 0,
          };
      });

      const orderPayloadToSave: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalProfit' | 'totalCost'> = {
          customerName,
          date,
          items: itemsForOrder,
          notes,
          status: 'Mới',
          totalAmount: currentOrderTotal,
          discountPercentage: paymentDetails.discountPercentage || 0,
          otherIncomeAmount: paymentDetails.otherIncomeAmount || 0,
          finalAmount: Math.round(finalAmount),
          paymentMethod: paymentDetails.paymentMethod,
          cashReceived: paymentDetails.cashReceived,
          changeGiven: changeGiven !== undefined ? Math.round(changeGiven) : undefined,
      };

      const newOrderId = await addSalesOrder(orderPayloadToSave, false); 

      if (newOrderId) {
          await updateSalesOrderStatus(newOrderId, 'Hoàn thành');
          toast({ title: "Thành công!", description: "Đã hoàn tất thanh toán và lưu đơn hàng." });
          createOrderForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], notes: '' });
          orderSuccessfullyProcessed = true;
      }
    } catch (e: any) {
      console.error("Unexpected error during payment confirmation:", e);
      toast({ title: "Lỗi Hệ Thống", description: e.message || "Đã xảy ra lỗi không mong muốn khi xử lý thanh toán.", variant: "destructive" });
      orderSuccessfullyProcessed = false;
    } finally {
      setIsSubmittingOrder(false);
      setIsPaymentModalOpen(false);
      setOrderDataForPayment(null);
    }
  };

  const handlePrintOrderFromTable = (order: SalesOrder) => {
    if (!order) return;

    const shopName = "Maimiel Shop";
    const shopAddress = "01 Quản Trọng Hoàng, Hưng Lợi, Ninh Kiều, Cần Thơ";
    const shopPhone = "0834xxxxxx";

    const accountNameRaw = "Maimiel";
    const bankIdAndAccountNo = "vietcombank-0111000317652";
    const addInfoRaw = `Thanh toan don hang ${order.orderNumber}`;
    const amountForQR = order.finalAmount ?? order.totalAmount;

    const vietQRURL = `https://img.vietqr.io/image/${bankIdAndAccountNo}-print.png?amount=${Math.round(amountForQR)}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;

    const itemsHtml = order.items.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${item.totalPrice.toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');

    let paymentDetailsHtml = `<div class="totals-summary">`;
    paymentDetailsHtml += `<div class="summary-item"><span class="label">Tổng tiền hàng:</span><span class="value">${order.totalAmount.toLocaleString('vi-VN')} đ</span></div>`;

    const discountPercentage = order.discountPercentage || 0;
    const discountAmount = order.totalAmount * (discountPercentage / 100);
    paymentDetailsHtml += `<div class="summary-item ${discountAmount > 0 ? 'destructive' : ''}"><span class="label">Giảm giá (${discountPercentage}%):</span><span class="value">- ${discountAmount.toLocaleString('vi-VN')} đ</span></div>`;

    const otherIncomeAmount = order.otherIncomeAmount || 0;
    paymentDetailsHtml += `<div class="summary-item ${otherIncomeAmount > 0 ? 'positive' : ''}"><span class="label">Thu khác:</span><span class="value">+ ${otherIncomeAmount.toLocaleString('vi-VN')} đ</span></div>`;

    paymentDetailsHtml += `</div>`;

    const invoiceHtml = `
      <html>
<head>
    <title>Hóa Đơn - ${order.orderNumber}</title>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', 'Arial', sans-serif; margin: 0; padding: 0; font-size: 11px; line-height: 1.5; color: #1a1a1a; background-color: #f5f5f5; }
        .invoice-box { width: 300px; margin: 20px auto; padding: 15px; background: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); }
        .header-section { text-align: center; margin-bottom: 15px; }
        .header-section h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 5px 0; color: #000; }
        .header-section p { margin: 0; font-size: 0.9em; }
        .details-section { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        .details-section .detail-item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.95em; }
        .details-section .label { font-weight: 500; }
        .details-section .value { font-weight: 400; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .items-table thead th { font-size: 1em; font-weight: 700; text-align: left; padding: 8px 2px; border-bottom: 2px solid #000; }
        .items-table tbody td { padding: 8px 2px; vertical-align: top; border-bottom: 1px solid #eee; }
        .items-table .item-name { font-weight: 500; word-break: break-word; }
        .items-table .align-center { text-align: center; }
        .items-table .align-right { text-align: right; }
        .totals-section { margin-top: 10px; }
        .totals-section .summary-item { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.95em; }
        .totals-section .summary-item .label { font-weight: 400; }
        .totals-section .summary-item .value { font-weight: 500; }
        .totals-section .grand-total { margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
        .totals-section .grand-total .label, .totals-section .grand-total .value { font-size: 1.4em; font-weight: 700; }
        .totals-section .cash-details { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc; }
        .totals-section .cash-details .summary-item .label, .totals-section .cash-details .summary-item .value { font-size: 1.1em; font-weight: 700; }
        .qr-section { text-align: center; margin: 15px 0; }
        .qr-section img { max-width: 180px; }
        .footer-section { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em; font-style: italic; }
    </style>
</head>
<body>
    <div class="invoice-box">
        <header class="header-section"><h1>${shopName}</h1><p>${shopAddress}</p><p>ĐT: ${shopPhone}</p></header>
        <section><h2 style="text-align: center; font-size: 1.5em; margin: 15px 0; font-weight: 700;">HÓA ĐƠN BÁN HÀNG</h2></section>
        <section class="details-section">
            <div class="detail-item"><span class="label">Số HĐ:</span><span class="value">${order.orderNumber}</span></div>
            <div class="detail-item"><span class="label">Ngày:</span><span class="value">${format(parse(order.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy HH:mm", { locale: vi })}</span></div>
            <div class="detail-item"><span class="label">Khách hàng:</span><span class="value">${order.customerName || 'Khách lẻ'}</span></div>
        </section>
        <table class="items-table"><thead><tr><th>Tên sản phẩm</th><th class="align-center">SL</th><th class="align-right">Thành tiền</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <section class="totals-section">
            ${paymentDetailsHtml}
            <div class="summary-item grand-total"><span class="label">TỔNG CỘNG</span><span class="value">${(order.finalAmount || order.totalAmount).toLocaleString('vi-VN')} đ</span></div>
            ${order.paymentMethod === 'Tiền mặt' && order.cashReceived ? `<div class="cash-details"><div class="summary-item"><span class="label">Tiền khách trả</span><span class="value">${(order.cashReceived).toLocaleString('vi-VN')} đ</span></div><div class="summary-item"><span class="label">Tiền thối lại</span><span class="value">${(order.changeGiven || 0).toLocaleString('vi-VN')} đ</span></div></div>` : ''}
        </section>
        ${order.paymentMethod === 'Chuyển khoản' && order.status === 'Hoàn thành' ? `<section class="qr-section"><p>Quét mã QR để thanh toán</p><img src="${vietQRURL}" alt="VietQR Payment" data-ai-hint="payment QR"/></section>` : ''}
        <footer class="footer-section"><p>Cảm ơn quý khách và hẹn gặp lại!</p></footer>
    </div>
</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast({ title: 'Lỗi In Hóa Đơn', description: 'Vui lòng cho phép pop-up để in hóa đơn.', variant: 'destructive' });
    }
  };


  const handleProductChange = (itemIndex: number, productId: string | undefined) => {
    if (!productId) {
      update(itemIndex, {
        ...watchedItems[itemIndex],
        productId: '',
        productName: '',
        unitPrice: 0,
        costPrice: 0,
        quantity: 1,
      });
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product) {
      update(itemIndex, {
        ...watchedItems[itemIndex],
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0,
        quantity: watchedItems[itemIndex]?.quantity || 1,
      });
    }
  };

 const handleItemQuantityChange = (itemIndex: number, newQuantityValue: number | string) => {
    const currentItem = watchedItems[itemIndex];
    const product = products.find(p => p.id === currentItem?.productId);

    if (typeof newQuantityValue === 'string' && newQuantityValue.trim() === "") {
        update(itemIndex, { ...currentItem, quantity: "" as any });
        return;
    }

    let numQuantity = Number(newQuantityValue);
    if (isNaN(numQuantity) || numQuantity < 0) {
        update(itemIndex, { ...currentItem, quantity: currentItem.quantity || "" as any });
        return;
    }

    if (product) {
        const availableStock = product.currentStock;
        if (numQuantity > availableStock) {
            toast({
                title: "Số lượng vượt tồn kho",
                description: `Sản phẩm ${product.name} chỉ còn ${availableStock}. Đã điều chỉnh số lượng.`,
                variant: "default",
            });
            numQuantity = availableStock;
        }
    }
    update(itemIndex, { ...currentItem, quantity: numQuantity });
  };

  const handleItemQuantityBlur = (itemIndex: number) => {
    const currentItem = watchedItems[itemIndex];
    let currentQuantity = Number(currentItem.quantity);

    if (isNaN(currentQuantity) || currentQuantity < 1) {
        const product = products.find(p => p.id === currentItem?.productId);
        if (product && product.currentStock > 0) {
            currentQuantity = 1;
        } else {
            currentQuantity = 0;
        }
        update(itemIndex, { ...currentItem, quantity: currentQuantity });
    }
  };

  const adjustItemQuantityWithButtons = (itemIndex: number, adjustment: number) => {
    const currentItem = watchedItems[itemIndex];
    let currentQuantity = Number(currentItem.quantity) || 0;
    let newQuantity = currentQuantity + adjustment;

    const product = products.find(p => p.id === currentItem?.productId);
    if (product) {
        const availableStock = product.currentStock;
        if (newQuantity > availableStock) {
            newQuantity = availableStock;
            toast({
                title: "Số lượng tối đa",
                description: `Sản phẩm ${product.name} chỉ còn ${availableStock}.`,
            });
        }
    } else {
        update(itemIndex, { ...currentItem, quantity: 1 });
        return;
    }

    if (newQuantity < 1 && product) {
        newQuantity = 1;
    } else if (newQuantity < 0) {
        newQuantity = 0;
    }
    update(itemIndex, { ...currentItem, quantity: newQuantity });
  };

  const handleAddNewItemAndFocus = () => {
    const newIndex = fields.length;
    append({ productId: '', productName: '', quantity: 1, unitPrice: 0, costPrice: 0 });
    newlyAddedItemIndexRef.current = newIndex;
  };

  const displayedOrders = useMemo(() => {
    let filtered = salesOrders.filter(order => {
      let isDateMatch = true;
      const orderDate = parse(order.date, 'yyyy-MM-dd', new Date());

      if (filterFromDate && filterToDate) {
        isDateMatch = isWithinInterval(orderDate, { start: startOfDay(filterFromDate), end: endOfDay(filterToDate) });
      } else if (filterFromDate) {
        isDateMatch = orderDate >= startOfDay(filterFromDate);
      } else if (filterToDate) {
        isDateMatch = orderDate <= endOfDay(filterToDate);
      }

      const isStatusMatch = filterStatus === 'all' || order.status === filterStatus;
      return isDateMatch && isStatusMatch;
    });

    if (isMobile && mobileSortOption) {
      const [field, direction] = mobileSortOption.split('_');
      filtered = [...filtered].sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (field) {
          case 'date': valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); break;
          case 'amount': valA = a.finalAmount ?? a.totalAmount; valB = b.finalAmount ?? b.totalAmount; break;
          case 'profit': valA = a.totalProfit; valB = b.totalProfit; break;
          case 'orderNumber': valA = a.orderNumber; valB = b.orderNumber; return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          case 'customerName': valA = a.customerName || ''; valB = b.customerName || ''; return direction === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
          case 'status': valA = a.status; valB = b.status; return direction === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
          default: return 0;
        }
        if (typeof valA === 'number' && typeof valB === 'number') { return direction === 'asc' ? valA - valB : valB - valA; }
        return 0;
      });
    }
    return filtered;
  }, [salesOrders, filterFromDate, filterToDate, filterStatus, isMobile, mobileSortOption]);


  const resetFilters = () => {
    setFilterFromDate(undefined);
    setFilterToDate(undefined);
    setFilterStatus('all');
  };

  const filteredStats = useMemo(() => {
    const revenue = displayedOrders.reduce((sum, order) => sum + (order.finalAmount ?? order.totalAmount), 0);
    const cogs = displayedOrders.reduce((sum, order) => sum + order.totalCost, 0);
    const profit = displayedOrders.reduce((sum, order) => sum + order.totalProfit, 0);
    return { revenue, cogs, profit };
  }, [displayedOrders]);


  const handleViewProductDetails = (productId: string) => {
    const product = getProductById(productId);
    if (product) {
      setViewingProductFromOrder(product);
    } else {
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin sản phẩm.", variant: "destructive"});
    }
  };

  // --- AI Sales Note Functions ---
  const resetAiSalesNoteModalState = useCallback(() => {
    setAiSalesNoteImagePreview(null);
    setAiSalesNoteImageDataUri(null);
    setAiSalesNoteCameraOpen(false);
    setAiSalesNoteHasCameraPermission(null);
    setAiSalesNoteResult(null);
    setAiSalesNoteItemStates([]);
    if (aiSalesNoteFileInputRef.current) {
      aiSalesNoteFileInputRef.current.value = "";
    }
  }, []);

  const handleAiSalesNoteImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiSalesNoteImageDataUri(reader.result as string);
        setAiSalesNoteImagePreview(reader.result as string);
        setAiSalesNoteResult(null); // Clear previous results
        setAiSalesNoteItemStates([]);
      };
      reader.readAsDataURL(file);
      setAiSalesNoteCameraOpen(false);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (!aiSalesNoteCameraOpen) {
        if (aiSalesNoteVideoRef.current && aiSalesNoteVideoRef.current.srcObject) {
          (aiSalesNoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          aiSalesNoteVideoRef.current.srcObject = null;
        }
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setAiSalesNoteHasCameraPermission(true);
        if (aiSalesNoteVideoRef.current) {
          aiSalesNoteVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing AI sales camera:', error);
        setAiSalesNoteHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Không thể truy cập Camera', description: 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.' });
        setAiSalesNoteCameraOpen(false);
      }
    };
    getCameraPermission();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (aiSalesNoteVideoRef.current && aiSalesNoteVideoRef.current.srcObject) {
         (aiSalesNoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
         aiSalesNoteVideoRef.current.srcObject = null;
      }
    };
  }, [aiSalesNoteCameraOpen, toast]);

  const handleAiSalesNoteCaptureImage = () => {
    if (aiSalesNoteVideoRef.current && aiSalesNoteCanvasRef.current) {
      const video = aiSalesNoteVideoRef.current;
      const canvas = aiSalesNoteCanvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setAiSalesNoteImageDataUri(dataUrl);
        setAiSalesNoteImagePreview(dataUrl);
        setAiSalesNoteResult(null);
        setAiSalesNoteItemStates([]);
      }
      setAiSalesNoteCameraOpen(false);
    }
  };

  const handleAnalyzeSalesNoteImage = async () => {
    if (!aiSalesNoteImageDataUri) {
      toast({ title: "Chưa chọn ảnh", description: "Vui lòng chọn hoặc chụp ảnh phiếu bán hàng.", variant: "destructive" });
      return;
    }
    setIsAiSalesNoteProcessing(true);
    setAiSalesNoteResult(null);
    setAiSalesNoteItemStates([]);
    try {
      const result = await extractSalesNoteInfo({ imageDataUri: aiSalesNoteImageDataUri });
      setAiSalesNoteResult(result);
      if (result.extractedItems && result.extractedItems.length > 0) {
        const initialItemStates = result.extractedItems.map((item, index) => {
          const matchedProduct = fuzzyMatchProductForSales(item.productNameGuess, products);
          return {
            originalItem: item,
            selectedProductId: matchedProduct?.id,
            quantity: item.quantityGuess > 0 ? item.quantityGuess : 1,
            unitPrice: item.unitPriceGuess !== undefined && item.unitPriceGuess >= 0 
                         ? item.unitPriceGuess 
                         : (matchedProduct?.sellingPrice !== undefined ? matchedProduct.sellingPrice : ''),
            isAddedToOrder: false,
            tempId: `ai-item-${Date.now()}-${index}`
          };
        });
        setAiSalesNoteItemStates(initialItemStates);
      }
      toast({ title: "AI đã phân tích xong!", description: "Vui lòng kiểm tra và thêm sản phẩm vào đơn hàng." });
    } catch (error: any) {
      console.error("AI Sales Note Analysis Error:", error);
      toast({ title: "Lỗi Phân Tích Ảnh Phiếu Bán", description: error.message || "Không thể phân tích ảnh.", variant: "destructive" });
    } finally {
      setIsAiSalesNoteProcessing(false);
    }
  };
  
  const handleAiSalesItemProductChange = (tempId: string, newProductId: string | undefined) => {
    setAiSalesNoteItemStates(prevStates =>
      prevStates.map(itemState => {
        if (itemState.tempId === tempId) {
          const product = products.find(p => p.id === newProductId);
          return {
            ...itemState,
            selectedProductId: newProductId,
            unitPrice: product?.sellingPrice !== undefined ? product.sellingPrice : itemState.unitPrice // Update price if product changes
          };
        }
        return itemState;
      })
    );
  };

  const handleAiSalesItemFieldChange = (tempId: string, field: 'quantity' | 'unitPrice', value: string) => {
     const numericValue = value === '' ? '' : parseFloat(value.replace(/\./g, ''));
      if (value !== '' && (isNaN(numericValue as number) || (numericValue as number) < 0)) return; // Prevent non-numeric or negative

    setAiSalesNoteItemStates(prevStates =>
      prevStates.map(itemState =>
        itemState.tempId === tempId ? { ...itemState, [field]: numericValue } : itemState
      )
    );
  };

  const handleAddAiSalesItemToOrder = (itemState: AiSalesItemState) => {
    if (!itemState.selectedProductId || Number(itemState.quantity) <= 0) {
      toast({ title: "Thông tin không hợp lệ", description: "Vui lòng chọn sản phẩm và nhập số lượng hợp lệ.", variant: "destructive"});
      return;
    }
    const product = products.find(p => p.id === itemState.selectedProductId);
    if (!product) {
      toast({ title: "Sản phẩm không tồn tại", variant: "destructive"});
      return;
    }

    append({
      productId: product.id,
      productName: product.name,
      quantity: Number(itemState.quantity),
      unitPrice: Number(itemState.unitPrice) || product.sellingPrice || 0,
      costPrice: product.costPrice || 0,
    });

    setAiSalesNoteItemStates(prevStates =>
      prevStates.map(is => is.tempId === itemState.tempId ? { ...is, isAddedToOrder: true } : is)
    );
    toast({ title: "Đã thêm sản phẩm", description: `${product.name} đã được thêm vào đơn hàng.`});
  };
  
  const applyAiCustomerAndDateToForm = () => {
    if (aiSalesNoteResult?.customerNameGuess) {
        createOrderForm.setValue('customerName', aiSalesNoteResult.customerNameGuess);
    }
    if (aiSalesNoteResult?.dateGuess && isValidDate(parse(aiSalesNoteResult.dateGuess, 'yyyy-MM-dd', new Date()))) {
        createOrderForm.setValue('date', aiSalesNoteResult.dateGuess);
    }
    if (aiSalesNoteResult?.notesGuess) {
        const currentNotes = createOrderForm.getValues('notes') || "";
        createOrderForm.setValue('notes', `${currentNotes ? currentNotes + "\n\n" : ""}--- Ghi chú từ AI ---\n${aiSalesNoteResult.notesGuess}`);
    }
    toast({title: "Đã áp dụng thông tin chung", description: "Tên khách hàng và ngày (nếu có) đã được điền."})
  };


  const columns: ColumnDef<SalesOrder>[] = [
    { accessorKey: "orderNumber", header: ({ column }) => <SortableHeader column={column} title="Mã ĐH" />, },
    { accessorKey: "date", header: ({ column }) => <SortableHeader column={column} title="Ngày Tạo" />, cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }), },
    { accessorKey: "customerName", header: ({ column }) => <SortableHeader column={column} title="Khách Hàng" />, cell: ({ row }) => row.getValue("customerName") || "Khách lẻ", },
    { accessorFn: row => row.finalAmount ?? row.totalAmount, id: 'finalAmount', header: ({ column }) => <SortableHeader column={column} title="Tổng TT" />, cell: ({ row }) => `${Number(row.original.finalAmount ?? row.original.totalAmount).toLocaleString('vi-VN')} đ` },
    { accessorKey: "totalProfit", header: ({ column }) => <SortableHeader column={column} title="Lợi Nhuận" />, cell: ({ row }) => { const profit = Number(row.getValue("totalProfit")); const profitColor = profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-muted-foreground"; return <span className={profitColor}>{profit.toLocaleString('vi-VN')} đ</span>; } },
    { accessorKey: "status", header: ({ column }) => <SortableHeader column={column} title="Trạng Thái" />, cell: ({ row }) => { const status = row.getValue<SalesOrderStatus>("status"); return ( <span className={cn( "px-2 py-1 rounded-md text-xs font-medium", status === "Mới" && "bg-blue-500 text-white", status === "Hoàn thành" && "bg-green-500 text-white", status === "Đã hủy" && "bg-red-500 text-white", )}>{status}</span> ); }, },
    { id: "actions", cell: ({ row }) => ( <DropdownMenu> <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Mở menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger> <DropdownMenuContent align="end"> <DropdownMenuItem onClick={() => setViewingOrder(row.original)}><Eye className="mr-2 h-4 w-4" />Xem Chi Tiết</DropdownMenuItem> {row.original.status === 'Hoàn thành' && ( <DropdownMenuItem onClick={() => handlePrintOrderFromTable(row.original)}><Printer className="mr-2 h-4 w-4" />In Hóa Đơn</DropdownMenuItem> )} {currentUser?.role === 'admin' && <DropdownMenuSeparator />} {currentUser?.role === 'admin' && row.original.status === 'Mới' && ( <DropdownMenuItem onClick={() => { const o = row.original; setOrderDataForPayment({ customerName: o.customerName, date: o.date, items: o.items.map(i=>({productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, costPrice: i.costPrice})), notes: o.notes, currentOrderTotal: o.totalAmount, existingOrderId: o.id } as OrderDataForPayment & { existingOrderId?: string }); setIsPaymentModalOpen(true); }}><DollarSign className="mr-2 h-4 w-4" />Thanh Toán Đơn Này</DropdownMenuItem> )} {currentUser?.role === 'admin' && row.original.status !== 'Đã hủy' && row.original.status !== 'Hoàn thành' && ( <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => updateSalesOrderStatus(row.original.id, 'Đã hủy')}><Trash2 className="mr-2 h-4 w-4" />Hủy Đơn Hàng</DropdownMenuItem> )} </DropdownMenuContent> </DropdownMenu> ), },
  ];

  const renderSalesOrderCard = (row: Row<SalesOrder>): React.ReactNode => {
    const order = row.original;
    const actionsCell = row.getVisibleCells().find(cell => cell.column.id === 'actions');
    const statusCell = row.getVisibleCells().find(cell => cell.column.id === 'status');
    const finalAmount = order.finalAmount ?? order.totalAmount;
    return ( <Card key={order.id} className="w-full"> <CardHeader className="pb-3 flex flex-row items-start justify-between"> <div> <CardTitle className="text-lg mb-1">{order.orderNumber}</CardTitle> <CardDescription>{order.customerName || 'Khách lẻ'} - {format(parse(order.date, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi })}</CardDescription> </div> {actionsCell && ( <div className="flex-shrink-0">{flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}</div> )} </CardHeader> <CardContent className="space-y-1.5 text-sm pt-0"> <div className="flex justify-between"><span className="text-muted-foreground font-medium">Tổng thanh toán:</span><span>{Number(finalAmount).toLocaleString('vi-VN')} đ</span></div> <div className="flex justify-between"><span className="text-muted-foreground font-medium">Lợi nhuận:</span><span className={cn(order.totalProfit > 0 ? "text-green-600" : order.totalProfit < 0 ? "text-red-600" : "text-muted-foreground")}>{Number(order.totalProfit).toLocaleString('vi-VN')} đ</span></div> {statusCell && ( <div className="flex justify-between items-center"><span className="text-muted-foreground font-medium">Trạng thái:</span><div className="text-right">{flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}</div></div> )} </CardContent> </Card> );
  };

  const mobileSortOptions = [ { value: 'date_desc', label: 'Ngày tạo (Mới nhất)' }, { value: 'date_asc', label: 'Ngày tạo (Cũ nhất)' }, { value: 'amount_desc', label: 'Tổng TT (Cao nhất)' }, { value: 'amount_asc', label: 'Tổng TT (Thấp nhất)' }, { value: 'profit_desc', label: 'Lợi nhuận (Cao nhất)' }, { value: 'profit_asc', label: 'Lợi nhuận (Thấp nhất)' }, { value: 'orderNumber_asc', label: 'Mã ĐH (A-Z)' }, { value: 'orderNumber_desc', label: 'Mã ĐH (Z-A)' }, { value: 'customerName_asc', label: 'Khách hàng (A-Z)' }, { value: 'customerName_desc', label: 'Khách hàng (Z-A)' }, { value: 'status_asc', label: 'Trạng thái (A-Z)' }, { value: 'status_desc', label: 'Trạng thái (Z-A)' }, ];

  return (
    <>
      <PageHeader title="Quản Lý Đơn Hàng Bán" description="Tạo và theo dõi các đơn hàng bán ra.">
        {currentUser?.role === 'admin' && (
          <>
            <Button onClick={() => { createOrderForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], notes: '' }); newlyAddedItemIndexRef.current = null; setIsCreateOrderModalOpen(true); }}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Tạo Đơn Hàng
            </Button>
            <Button variant="outline" onClick={() => { 
              resetAiSalesNoteModalState(); 
              setIsCreateOrderModalOpen(false); // Đóng modal form chính nếu đang mở
              setIsAiSalesNoteModalOpen(true); 
            }}>
              <ImagePlus className="mr-2 h-4 w-4" /> AI Nhập từ Ảnh
            </Button>
          </>
        )}
      </PageHeader>

      <Card className="mb-6">
        <CardHeader><CardTitle>Bộ Lọc Đơn Hàng</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div><Label htmlFor="filter-from-date">Từ ngày</Label><Popover open={isFromDatePickerOpen} onOpenChange={setIsFromDatePickerOpen}><PopoverTrigger asChild><Button id="filter-from-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10",!filterFromDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterFromDate ? format(filterFromDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterFromDate} onSelect={(date) => {setFilterFromDate(date); setIsFromDatePickerOpen(false);}} initialFocus disabled={(date) => filterToDate ? date > filterToDate : false}/></PopoverContent></Popover></div>
            <div><Label htmlFor="filter-to-date">Đến ngày</Label><Popover open={isToDatePickerOpen} onOpenChange={setIsToDatePickerOpen}><PopoverTrigger asChild><Button id="filter-to-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10",!filterToDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filterToDate ? format(filterToDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterToDate} onSelect={(date) => {setFilterToDate(date); setIsToDatePickerOpen(false);}} initialFocus disabled={(date) => filterFromDate ? date < filterFromDate : false}/></PopoverContent></Popover></div>
            <div><Label htmlFor="filter-status">Trạng thái</Label><Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as SalesOrderStatus | 'all')}><SelectTrigger id="filter-status" className="w-full h-10"><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{SALES_ORDER_STATUSES.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="flex justify-end"><Button variant="ghost" onClick={resetFilters} disabled={!filterFromDate && !filterToDate && filterStatus === 'all'}><FilterX className="mr-2 h-4 w-4" />Xóa bộ lọc</Button></div>
        </CardContent>
      </Card>

      {(filterFromDate || filterToDate || filterStatus !== 'all') && displayedOrders.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng Doanh Thu (lọc)</CardTitle><ArrowUpCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{filteredStats.revenue.toLocaleString('vi-VN')} đ</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng Giá Vốn (lọc)</CardTitle><ArrowDownCircle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{filteredStats.cogs.toLocaleString('vi-VN')} đ</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng Lợi Nhuận (lọc)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={`text-2xl font-bold ${filteredStats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>{filteredStats.profit.toLocaleString('vi-VN')} đ</div></CardContent></Card>
        </div>
      )}

      <FormModal<SalesOrderFormValues>
        title="Tạo Đơn Hàng Mới"
        description="Điền thông tin chi tiết cho đơn hàng."
        formId="add-sales-order-form"
        open={isCreateOrderModalOpen}
        onOpenChange={(isOpen) => { setIsCreateOrderModalOpen(isOpen); if (!isOpen) { newlyAddedItemIndexRef.current = null; } }}
      >
        {(closeModal) => (
          <Form {...createOrderForm}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-4" id="add-sales-order-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createOrderForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Ngày Tạo Đơn</ShadcnFormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-10 pr-2"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createOrderForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Tên Khách Hàng (tùy chọn)</ShadcnFormLabel>
                      <FormControl>
                        <Input ref={customerNameInputRef} placeholder="Nhập tên khách hàng" {...field} className="h-10"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-lg">Chi Tiết Sản Phẩm</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {fields.map((itemField, index) => {
                    const c = watchedItems[index];
                    const p = products.find(p => p.id === c?.productId);
                    const s = p ? p.currentStock : 0;
                    const q = Number(c?.quantity) || 0;
                    return (
                      <div key={itemField.fieldId} className="p-3 border rounded-md space-y-3 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <FormField
                            control={createOrderForm.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <ShadcnFormLabel>Sản Phẩm</ShadcnFormLabel>
                                <FormControl>
                                  <SearchableProductSelect
                                    ref={(el) => { if (productSelectRefs.current) productSelectRefs.current[index] = el; }}
                                    products={products}
                                    selectedProductId={field.value}
                                    onProductSelect={(pid) => { field.onChange(pid); handleProductChange(index, pid); }}
                                    disabledProductIds={watchedItems.filter((_, i) => i !== index).map(i => i.productId).filter(id => !!id) as string[]}
                                    placeholder="Chọn hoặc tìm sản phẩm"
                                    disabled={isDataContextLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createOrderForm.control}
                            name={`items.${index}.quantity`}
                            render={({ field: qField }) => (
                              <FormItem>
                                <ShadcnFormLabel>Số Lượng</ShadcnFormLabel>
                                <div className="flex items-center gap-1.5">
                                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => adjustItemQuantityWithButtons(index, -1)} disabled={!p || q <= 1}>
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      placeholder="1"
                                      {...qField}
                                      value={qField.value === 0 && !p ? "" : qField.value}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === "" || /^[0-9]*$/.test(v)) handleItemQuantityChange(index, v);
                                      }}
                                      onBlur={() => handleItemQuantityBlur(index)}
                                      className="w-16 text-center h-9"
                                      disabled={!p}
                                    />
                                  </FormControl>
                                  <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => adjustItemQuantityWithButtons(index, 1)} disabled={!p || (p && q >= s)}>
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-y-3 md:grid md:grid-cols-7 md:gap-x-3 md:gap-y-0 md:items-end">
                           <FormField
                            control={createOrderForm.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field: pField }) => (
                              <FormItem className="md:col-span-3">
                                <ShadcnFormLabel>Đơn Giá</ShadcnFormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" min="0" {...pField} value={pField.value || ''} onChange={e => pField.onChange(parseFloat(e.target.value) || 0)} disabled={!p} className="h-10"/>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-3">
                            <ShadcnFormLabel>Thành Tiền</ShadcnFormLabel>
                            <p className="font-semibold text-sm h-10 flex items-center">{((Number(c?.quantity) || 0) * (Number(c?.unitPrice) || 0)).toLocaleString('vi-VN')} đ</p>
                          </div>
                          <div className="flex justify-end md:col-span-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive self-center md:self-end">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNewItemAndFocus}
                    disabled={products.filter(p => p.currentStock > 0 && !watchedItems.some(item => item.productId === p.id)).length === 0}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm
                  </Button>
                </CardContent>
              </Card>
              <div className="text-right mt-4">
                <p className="text-lg font-semibold">Tổng Cộng: {calculateTotalAmount().toLocaleString('vi-VN')} đ</p>
              </div>
              <FormField
                control={createOrderForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <ShadcnFormLabel>Ghi Chú (tùy chọn)</ShadcnFormLabel>
                    <FormControl>
                      <Textarea placeholder="Thông tin thêm về đơn hàng..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="outline" onClick={() => {createOrderForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], notes: '' }); newlyAddedItemIndexRef.current = null; closeModal();}}>Hủy</Button>
                <Button type="button" variant="secondary" onClick={createOrderForm.handleSubmit(handleSaveDraftOrder)} disabled={isSubmittingOrder || isDataContextLoading || fields.length === 0 || fields.some(f => !f.productId || !(Number(f.quantity) > 0))}>
                  {isSubmittingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Lưu Tạm
                </Button>
                <Button type="button" onClick={createOrderForm.handleSubmit(handleOpenPaymentModal)} disabled={ isDataContextLoading || fields.length === 0 || fields.some(f => !f.productId || !(Number(f.quantity) > 0)) }>
                  <DollarSign className="mr-2 h-4 w-4" /> Thanh Toán
                </Button>
              </div>
            </form>
          </Form>
        )}
      </FormModal>

      {orderDataForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => { setIsPaymentModalOpen(false); setOrderDataForPayment(null); }}
          orderData={orderDataForPayment}
          onConfirmPayment={handleConfirmPayment}
          onBack={() => { setIsPaymentModalOpen(false); setIsCreateOrderModalOpen(true); }}
          isSubmitting={isSubmittingOrder}
        />
      )}

      {/* AI Sales Note Dialog */}
      <Dialog open={isAiSalesNoteModalOpen} onOpenChange={(isOpen) => { setIsAiSalesNoteModalOpen(isOpen); if (!isOpen) resetAiSalesNoteModalState(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nhập Liệu AI Từ Ảnh Phiếu Bán Hàng</DialogTitle>
            <DialogDescription>Chọn hoặc chụp ảnh phiếu bán hàng. AI sẽ phân tích và gợi ý thông tin.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)] pr-3 -mr-3">
            <div className="space-y-4 py-4">
              {!aiSalesNoteCameraOpen && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="outline" onClick={() => aiSalesNoteFileInputRef.current?.click()} className="flex-1"><UploadCloud className="mr-2 h-4 w-4" /> Chọn Ảnh</Button>
                    <Input type="file" accept="image/*" ref={aiSalesNoteFileInputRef} onChange={handleAiSalesNoteImageFileChange} className="hidden" id="ai-sales-note-file-upload"/>
                    <Button type="button" variant="outline" onClick={() => setAiSalesNoteCameraOpen(true)} className="flex-1"><Camera className="mr-2 h-4 w-4" /> Chụp Ảnh</Button>
                  </div>
                  {aiSalesNoteImagePreview && !isAiSalesNoteProcessing && (
                    <div className="mt-2 p-2 border rounded-md flex flex-col items-center bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-2">Ảnh đã chọn:</p>
                      <Image src={aiSalesNoteImagePreview} alt="Xem trước phiếu bán" width={400} height={300} style={{ objectFit: 'contain', maxHeight: '250px', width: 'auto' }} className="rounded-md border" data-ai-hint="handwritten note"/>
                    </div>
                  )}
                </div>
              )}

              {isAiSalesNoteProcessing && ( <div className="flex flex-col items-center justify-center space-y-2 p-6"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">AI đang phân tích ảnh...</p><Skeleton className="h-4 w-3/4 mt-2" /><Skeleton className="h-4 w-1/2" /></div> )}
              
              {aiSalesNoteCameraOpen && (
                <Card className="mt-2">
                  <CardHeader><CardTitle className="text-base">Chụp Ảnh Phiếu Bán</CardTitle></CardHeader>
                  <CardContent className="relative">
                    <video ref={aiSalesNoteVideoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                    {aiSalesNoteHasCameraPermission === false && (
                      <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/90 rounded-md p-4">
                        <Alert variant="destructive">
                          <AlertTitle>Không có quyền truy cập Camera</AlertTitle>
                          <AlertDescription>Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.</AlertDescription>
                        </Alert>
                      </div>
                    )}
                    {aiSalesNoteHasCameraPermission === null && (
                       <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/90 rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground mt-2">Đang khởi tạo camera...</p>
                      </div>
                    )}
                  </CardContent>
                  {aiSalesNoteHasCameraPermission === true && (
                  <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAiSalesNoteCameraOpen(false)}>Hủy</Button>
                    <Button type="button" onClick={handleAiSalesNoteCaptureImage} disabled={!aiSalesNoteVideoRef.current?.srcObject}>Chụp</Button>
                  </CardFooter>
                  )}
                </Card>
              )}
              <canvas ref={aiSalesNoteCanvasRef} className="hidden"></canvas>

              {aiSalesNoteResult && !isAiSalesNoteProcessing && (
                <div className="space-y-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-md">Thông Tin Chung (AI Gợi Ý)</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {aiSalesNoteResult.customerNameGuess && <p>Khách hàng: <span className="font-medium">{aiSalesNoteResult.customerNameGuess}</span></p>}
                      {aiSalesNoteResult.dateGuess && <p>Ngày: <span className="font-medium">{aiSalesNoteResult.dateGuess}</span></p>}
                      {aiSalesNoteResult.notesGuess && <div>Ghi chú từ phiếu: <pre className="whitespace-pre-wrap font-sans bg-background p-2 rounded-sm border text-xs">{aiSalesNoteResult.notesGuess}</pre></div>}
                    </CardContent>
                    <CardFooter><Button size="sm" onClick={applyAiCustomerAndDateToForm} disabled={!aiSalesNoteResult.customerNameGuess && !aiSalesNoteResult.dateGuess && !aiSalesNoteResult.notesGuess}><Wand className="mr-2 h-4 w-4" /> Áp dụng vào Form</Button></CardFooter>
                  </Card>
                  
                  <Separator />
                  <h3 className="text-md font-semibold">Sản Phẩm AI Nhận Diện:</h3>
                  {aiSalesNoteItemStates.length > 0 ? (
                    <div className="space-y-3">
                      {aiSalesNoteItemStates.map((itemState, index) => (
                        <Card key={itemState.tempId} className={cn("p-3", itemState.isAddedToOrder && "bg-green-50 dark:bg-green-900/30 opacity-70")}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                            <div className="space-y-1">
                              <Label>Sản phẩm AI đoán: <span className="italic text-muted-foreground">"{itemState.originalItem.productNameGuess}"</span></Label>
                              <SearchableProductSelect
                                products={products.filter(p => p.currentStock > 0 || p.id === itemState.selectedProductId)}
                                selectedProductId={itemState.selectedProductId}
                                onProductSelect={(pid) => handleAiSalesItemProductChange(itemState.tempId, pid)}
                                placeholder="Chọn sản phẩm khớp"
                                disabled={itemState.isAddedToOrder || isDataContextLoading}
                              />
                            </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label>Số lượng</Label>
                                  <Input type="text" inputMode="numeric" value={itemState.quantity} onChange={(e) => handleAiSalesItemFieldChange(itemState.tempId, 'quantity', e.target.value)} placeholder="SL" disabled={itemState.isAddedToOrder} className="h-9"/>
                                </div>
                                <div className="space-y-1">
                                  <Label>Đơn giá (AI: {itemState.originalItem.unitPriceGuess !== undefined ? itemState.originalItem.unitPriceGuess.toLocaleString('vi-VN') : 'N/A'})</Label>
                                  <Input type="text" inputMode="decimal" value={itemState.unitPrice} onChange={(e) => handleAiSalesItemFieldChange(itemState.tempId, 'unitPrice', e.target.value)} placeholder="Giá" disabled={itemState.isAddedToOrder} className="h-9"/>
                                </div>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" onClick={() => handleAddAiSalesItemToOrder(itemState)} disabled={!itemState.selectedProductId || Number(itemState.quantity) <= 0 || itemState.isAddedToOrder}>
                              {itemState.isAddedToOrder ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                              {itemState.isAddedToOrder ? "Đã Thêm" : "Thêm vào Đơn"}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Không nhận diện được sản phẩm nào từ ảnh, hoặc tất cả đã được thêm.</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-between pt-4 border-t mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setAiSalesNoteImagePreview(null);
                setAiSalesNoteImageDataUri(null);
                setAiSalesNoteResult(null);
                setAiSalesNoteItemStates([]);
                if (aiSalesNoteFileInputRef.current) {
                  aiSalesNoteFileInputRef.current.value = "";
                }
                setAiSalesNoteCameraOpen(false); 
              }} 
              disabled={isAiSalesNoteProcessing}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Chọn/Chụp Lại Ảnh
            </Button>

            <div className="flex gap-2 items-center">
               <Button 
                type="button" 
                variant="ghost" 
                onClick={() => { setIsAiSalesNoteModalOpen(false); resetAiSalesNoteModalState(); }} 
                disabled={isAiSalesNoteProcessing}
              >
                Hủy
              </Button>
              {aiSalesNoteImageDataUri && !aiSalesNoteResult && !aiSalesNoteCameraOpen && (
                 <Button type="button" onClick={handleAnalyzeSalesNoteImage} disabled={isAiSalesNoteProcessing}>
                    {isAiSalesNoteProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Phân Tích Ảnh
                </Button>
              )}
              {aiSalesNoteResult && (
                <Button
                  type="button"
                  onClick={() => {
                    setIsAiSalesNoteModalOpen(false);
                    setIsCreateOrderModalOpen(true); 
                  }}
                  disabled={isAiSalesNoteProcessing}
                >
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> Hoàn Tất & Xem Đơn
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          {isMobile && ( <div className="mb-4"><Label htmlFor="mobile-sort-order">Sắp xếp theo</Label><Select value={mobileSortOption} onValueChange={setMobileSortOption}><SelectTrigger id="mobile-sort-order" className="w-full sm:w-auto"><SelectValue placeholder="Chọn cách sắp xếp" /></SelectTrigger><SelectContent>{mobileSortOptions.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select></div> )}
          <DataTable columns={columns} data={displayedOrders} filterColumn="orderNumber" filterPlaceholder="Lọc theo mã ĐH, khách hàng..." renderCardRow={renderSalesOrderCard} sorting={sorting} onSortingChange={setSorting}/>
        </CardContent>
      </Card>

      <SalesOrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} onViewProductDetails={handleViewProductDetails}/>
      <ProductDetailModal product={viewingProductFromOrder} onClose={() => setViewingProductFromOrder(null)}/>
    </>
  );
}
