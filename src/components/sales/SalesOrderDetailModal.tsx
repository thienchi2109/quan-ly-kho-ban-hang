
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
        /* CSS Reset & Basic Setup */
        body {
            font-family: 'Roboto', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.5;
            color: #1a1a1a;
            background-color: #f5f5f5; /* Light grey background for contrast */
        }
        .invoice-box {
            width: 300px;
            margin: 20px auto;
            padding: 15px;
            background: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
        }

        /* Header Section */
        .header-section {
            text-align: center;
            margin-bottom: 15px;
        }
        .header-section h1 {
            font-size: 1.6em;
            font-weight: 700;
            margin: 0 0 5px 0;
            color: #000;
        }
        .header-section p {
            margin: 0;
            font-size: 0.9em;
        }

        /* Invoice Details Section */
        .details-section {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .details-section .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 0.95em;
        }
        .details-section .label {
            font-weight: 500;
        }
        .details-section .value {
            font-weight: 400;
        }

        /* Items Table Section */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table thead th {
            font-size: 1em;
            font-weight: 700;
            text-align: left;
            padding: 8px 2px;
            border-bottom: 2px solid #000;
        }
        .items-table tbody td {
            padding: 8px 2px;
            vertical-align: top;
            border-bottom: 1px solid #eee;
        }
        .items-table .item-name {
             font-weight: 500;
             word-break: break-word;
        }
        .items-table .align-center { text-align: center; }
        .items-table .align-right { text-align: right; }
        
        /* Totals Section */
        .totals-section {
            margin-top: 10px;
        }
        .totals-section .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 0.95em;
        }
         .totals-section .summary-item .label {
            font-weight: 400;
        }
        .totals-section .summary-item .value {
            font-weight: 500;
        }
        .totals-section .grand-total {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 2px solid #000;
        }
        .totals-section .grand-total .label,
        .totals-section .grand-total .value {
            font-size: 1.4em;
            font-weight: 700;
        }
         .totals-section .cash-details {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #ccc;
        }
         .totals-section .cash-details .summary-item .label,
         .totals-section .cash-details .summary-item .value {
            font-size: 1.1em;
            font-weight: 700;
        }

        /* QR & Footer */
        .qr-section {
            text-align: center;
            margin: 15px 0;
        }
        .qr-section img {
            max-width: 180px;
        }
        .footer-section {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            font-size: 0.9em;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <header class="header-section">
            <h1>${shopName}</h1>
            <p>${shopAddress}</p>
            <p>ĐT: ${shopPhone}</p>
        </header>

        <section>
            <h2 style="text-align: center; font-size: 1.5em; margin: 15px 0; font-weight: 700;">HÓA ĐƠN BÁN HÀNG</h2>
        </section>

        <section class="details-section">
            <div class="detail-item">
                <span class="label">Số HĐ:</span>
                <span class="value">${order.orderNumber}</span>
            </div>
            <div class="detail-item">
                <span class="label">Ngày:</span>
                <span class="value">${format(parse(order.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
            </div>
            <div class="detail-item">
                <span class="label">Khách hàng:</span>
                <span class="value">${order.customerName || 'Khách lẻ'}</span>
            </div>
        </section>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Tên sản phẩm</th>
                    <th class="align-center">SL</th>
                    <th class="align-right">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <section class="totals-section">
            ${paymentDetailsHtml}
            
            <div class="summary-item grand-total">
                <span class="label">TỔNG CỘNG</span>
                <span class="value">${(order.finalAmount || order.totalAmount).toLocaleString('vi-VN')} đ</span>
            </div>

            ${order.paymentMethod === 'Tiền mặt' && order.cashReceived ? `
            <div class="cash-details">
                <div class="summary-item">
                    <span class="label">Tiền khách trả</span>
                    <span class="value">${(order.cashReceived).toLocaleString('vi-VN')} đ</span>
                </div>
                <div class="summary-item">
                    <span class="label">Tiền thối lại</span>
                    <span class="value">${(order.changeGiven || 0).toLocaleString('vi-VN')} đ</span>
                </div>
            </div>
            ` : ''}
        </section>

        ${order.paymentMethod === 'Chuyển khoản' && order.status === 'Hoàn thành' ? `
            <section class="qr-section">
                <p>Quét mã QR để thanh toán</p>
                <img src="${vietQRURL}" alt="VietQR Payment" data-ai-hint="payment QR"/>
            </section>
        ` : ''}
        
        <footer class="footer-section">
            <p>Cảm ơn quý khách và hẹn gặp lại!</p>
        </footer>
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
                    
                    {/* Always show discount and other income fields */}
                    <div className="font-semibold text-destructive">Giảm giá ({(order.discountPercentage || 0).toLocaleString('vi-VN')}%):</div>
                    <div className="text-right text-destructive">- {(order.totalAmount * (order.discountPercentage || 0) / 100).toLocaleString('vi-VN')} đ</div>
                    
                    <div className="font-semibold text-green-600">Thu khác:</div>
                    <div className="text-right text-green-600">+ {(order.otherIncomeAmount || 0).toLocaleString('vi-VN')} đ</div>
                    
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

