
"use client";

import React from 'react';
import type { SalesOrder, OrderItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface SalesOrderDetailModalProps {
  order: SalesOrder | null;
  onClose: () => void;
}

export default function SalesOrderDetailModal({ order, onClose }: SalesOrderDetailModalProps) {
  if (!order) {
    return null;
  }

  const getStatusVariant = (status: SalesOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Mới':
        return 'default'; 
      case 'Hoàn thành':
        return 'secondary'; 
      case 'Đã hủy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handlePrintInvoice = () => {
    if (!order) return;

    const shopName = "Maimiel Shop"; 
    const shopAddress = "01 Quản Trọng Hoàng, Hưng Lợi, Ninh Kiều, Cần Thơ"; 
    const shopPhone = "0834xxxxxx"; 

    const accountNameRaw = "Maimiel";
    const bankIdAndAccountNo = "vietcombank-0111000317652";
    const addInfoRaw = `Thanh toan don hang ${order.orderNumber}`;

    // Use finalAmount if available (for completed orders), otherwise totalAmount
    const amountForQR = order.finalAmount ?? order.totalAmount;

    const vietQRURL = `https://img.vietqr.io/image/${bankIdAndAccountNo}-print.png?amount=${Math.round(amountForQR)}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;

    const itemsHtml = order.items.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${item.totalPrice.toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <html>
<head>
    <title>Hóa Đơn - ${order.orderNumber}</title>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', 'Arial', sans-serif; margin: 0; padding: 0; font-size: 10px; line-height: 1.4; color: #000; background-color: #fff; }
        .invoice-container { width: 280px; margin: auto; background: #fff; padding: 10px; }
        .header, .shop-info, .footer { text-align: center; }
        .header h1 { font-size: 1.4em; font-weight: 700; margin: 0 0 10px 0; text-transform: uppercase; }
        .shop-info h2 { font-size: 1.4em; font-weight: 600; margin: 0 0 5px 0; }
        .shop-info p { margin: 0; font-size: 0.9em; }
        .invoice-details { margin: 15px 0; padding-top: 10px; border-top: 1px dashed #000; }
        .invoice-details .detail-item { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .invoice-details .label { font-weight: 600; }
        .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; padding: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .items-table th, .items-table td { font-size: 0.7em; padding: 3px 1px; text-align: left; vertical-align: top; }
        .items-table th { font-size: 0.75em; font-weight: 600; border-bottom: 1px solid #000; }
        .align-right { text-align: right; }
        .items-table td:nth-child(1) { font-size: 0.75em; word-break: break-word; }
        .items-table th:nth-child(2), .items-table td:nth-child(2) { font-size: 0.75em; width: 30px; text-align: center; padding-right: 20px; }
        .items-table th:nth-child(3), .items-table td:nth-child(3) { font-size: 0.75em; width: 70px; text-align: right; }
        .totals { text-align: right; margin: 10px 0; }
        .totals strong { font-size: 1.3em; font-weight: 700; }
        .qr-code { text-align: center; margin-bottom: 10px; }
        .qr-code img { max-width: 150px; }
        .qr-code p { margin-top: 5px; font-size: 0.9em; }
        .footer { margin-top: 10px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <section class="shop-info"><h2>${shopName}</h2><p>${shopAddress}</p><p>ĐT: ${shopPhone}</p></section>
        <header class="header"><h1>Hóa Đơn</h1></header>
        <section class="invoice-details">
            <div class="detail-item"><span class="label">Số HĐ:</span><span class="value">${order.orderNumber}</span></div>
            <div class="detail-item"><span class="label">Ngày:</span><span class="value">${format(parse(order.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy HH:mm", { locale: vi })}</span></div>
            <div class="detail-item"><span class="label">Khách hàng:</span><span class="value">${order.customerName || 'Khách lẻ'}</span></div>
        </section>
        <table class="items-table">
            <thead><tr><th>Tên sản phẩm</th><th class="align-right">SL</th><th class="align-right">Thành tiền</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="totals"><strong>Tổng tiền: ${(order.finalAmount || order.totalAmount).toLocaleString('vi-VN')} đ</strong></div>
        ${order.paymentMethod === 'Chuyển khoản' && order.status === 'Hoàn thành' ? `
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            <div class="qr-code">
                <p>Quét mã QR để thanh toán</p>
                <img src="${vietQRURL}" alt="VietQR Payment" />
            </div>
        ` : ''}
        <footer class="footer"><p>Cảm ơn quý khách!</p></footer>
    </div>
</body>
</html>
  `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close(); 
      setTimeout(() => {
        printWindow.print();
      }, 500); 
    } else {
      // Consider using a toast notification here
      alert('Vui lòng cho phép pop-up để in hóa đơn.');
    }
  };


  return (
    <Dialog open={!!order} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chi Tiết Đơn Hàng: {order.orderNumber}</DialogTitle>
          <DialogDescription>
            Ngày tạo: {format(parse(order.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy HH:mm", { locale: vi })}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-200px)] pr-5">
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                        <span className="font-semibold">Khách hàng:</span>
                        <p className="text-sm">{order.customerName || 'Khách lẻ'}</p>
                    </div>
                    <div>
                        <span className="font-semibold">Trạng thái:</span>
                        <div> 
                             <Badge variant={getStatusVariant(order.status)} className={cn(
                                "text-xs font-medium",
                                order.status === "Mới" && "bg-blue-500 text-white",
                                order.status === "Hoàn thành" && "bg-green-500 text-white",
                                order.status === "Đã hủy" && "bg-red-500 text-white",
                            )}>
                                {order.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                <h3 className="font-semibold text-md mt-2">Chi Tiết Sản Phẩm:</h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-right">Số lượng</TableHead>
                            <TableHead className="text-right">Đơn giá</TableHead>
                            <TableHead className="text-right">Thành tiền</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {order.items.map((item, index) => (
                            <TableRow key={item.productId + index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.unitPrice.toLocaleString('vi-VN')} đ</TableCell>
                            <TableCell className="text-right">{item.totalPrice.toLocaleString('vi-VN')} đ</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="font-semibold">Tổng tiền hàng:</div>
                    <div className="text-right">{order.totalAmount.toLocaleString('vi-VN')} đ</div>
                    
                    {order.discountPercentage !== undefined && order.discountPercentage > 0 && (
                        <>
                            <div className="font-semibold text-destructive">Giảm giá ({order.discountPercentage}%):</div>
                            <div className="text-right text-destructive">- {(order.totalAmount * order.discountPercentage / 100).toLocaleString('vi-VN')} đ</div>
                        </>
                    )}
                    {order.otherIncomeAmount !== undefined && order.otherIncomeAmount > 0 && (
                         <>
                            <div className="font-semibold text-green-600">Thu khác:</div>
                            <div className="text-right text-green-600">+ {order.otherIncomeAmount.toLocaleString('vi-VN')} đ</div>
                        </>
                    )}
                     {order.finalAmount !== undefined && (
                        <>
                            <div className="font-semibold text-lg border-t pt-1 mt-1">Khách thanh toán:</div>
                            <div className="text-right font-bold text-lg border-t pt-1 mt-1">{order.finalAmount.toLocaleString('vi-VN')} đ</div>
                        </>
                    )}


                    <div className="font-semibold">Tổng giá vốn:</div>
                    <div className="text-right">{order.totalCost.toLocaleString('vi-VN')} đ</div>

                    <div className="font-semibold text-primary text-base border-t pt-1 mt-1">Lợi nhuận:</div>
                    <div className="text-right font-bold text-primary text-base border-t pt-1 mt-1">{order.totalProfit.toLocaleString('vi-VN')} đ</div>
                </div>
                 {order.paymentMethod && (
                    <div className="mt-2">
                        <span className="font-semibold">Phương thức thanh toán:</span>
                        <p className="text-sm">{order.paymentMethod}</p>
                    </div>
                )}
                {order.paymentMethod === 'Tiền mặt' && order.cashReceived !== undefined && (
                    <>
                        <div>
                            <span className="font-semibold">Tiền khách trả:</span>
                            <p className="text-sm">{order.cashReceived.toLocaleString('vi-VN')} đ</p>
                        </div>
                         {order.changeGiven !== undefined && order.changeGiven >=0 && (
                            <div>
                                <span className="font-semibold">Tiền thối lại:</span>
                                <p className="text-sm">{order.changeGiven.toLocaleString('vi-VN')} đ</p>
                            </div>
                        )}
                    </>
                )}


                {order.notes && (
                    <div className="mt-2">
                        <span className="font-semibold">Ghi chú:</span>
                        <p className="text-sm whitespace-pre-wrap p-2 bg-muted rounded-md">{order.notes}</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        
        <DialogFooter className="sm:justify-between pt-4">
          {order.status === 'Hoàn thành' && (
            <Button variant="outline" onClick={handlePrintInvoice}>
              <Printer className="mr-2 h-4 w-4" />
              In Hóa Đơn
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className={cn(order.status !== 'Hoàn thành' && "sm:ml-auto")}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

