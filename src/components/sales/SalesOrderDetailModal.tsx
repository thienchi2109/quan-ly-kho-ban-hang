
"use client";

import React from 'react';
import type { SalesOrder, OrderItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
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

    const shopName = "Maimiel Shop"; // Replace with your actual shop name
    const shopAddress = "01 Quản Trọng Hoàng, Hưng Lợi, Ninh Kiều, Cần Thơ"; // Replace
    const shopPhone = "0834xxxxxx"; // Replace

    const totalAmount = order.totalAmount;
    const addInfoRaw = `Thanh toan don hang ${order.orderNumber}`;
    const accountNameRaw = "Maimiel";

    const vietQRURL = `https://img.vietqr.io/image/vietcombank-0111000317652-print.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;

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
        /* --- Cài đặt chung cho máy in POS --- */
        body {
            font-family: 'Inter', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            font-size: 10px; /* Giảm kích thước font chữ cơ bản */
            line-height: 1.4;
            color: #000;
            background-color: #fff;
        }

        /* --- Khung chứa hóa đơn (khổ 80mm hoặc 58mm) --- */
        .invoice-container {
            width: 280px; /* Chiều rộng cho khổ giấy ~75mm, có thể chỉnh thành ~210px cho khổ 58mm */
            margin: auto;
            background: #fff;
            padding: 10px;
        }

        /* --- Phần đầu trang & thông tin cửa hàng --- */
        .header, .shop-info, .footer {
            text-align: center;
        }
        
        .header h1 {
            font-size: 1.2em; /* ~12px */
            font-weight: 700;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }
        
        .shop-info h2 {
            font-size: 1.1em; /* ~11px */
            font-weight: 600;
            margin: 0 0 5px 0;
        }
        .shop-info p {
            margin: 0;
            font-size: 0.9em; /* ~9px */
        }

        /* --- Chi tiết hóa đơn --- */
        .invoice-details {
            margin: 15px 0;
            padding-top: 10px;
            border-top: 1px dashed #000;
        }
        .invoice-details .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        .invoice-details .label {
            font-weight: 600;
        }

        /* --- Bảng sản phẩm --- */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0; /* Giảm margin */
            padding: 10px 0; /* Giảm padding */
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
        }
        .items-table th, .items-table td {
            padding: 3px 1px; /* Giảm padding cell */
            text-align: left;
            vertical-align: top; /* Căn trên cho nội dung cell */
        }
        .items-table th {
            font-weight: 600;
            border-bottom: 1px solid #000;
        }
        .align-right {
            text-align: right;
        }
        /* Điều chỉnh cột cho nhỏ hơn */
        .items-table td:nth-child(1) { /* Tên SP */
             word-break: break-word; /* Cho phép ngắt từ nếu tên SP quá dài */
        }
        .items-table th:nth-child(2), .items-table td:nth-child(2) { /* SL */
             width: 30px; 
             text-align: right;
        }
        .items-table th:nth-child(3), .items-table td:nth-child(3) { /* Thành Tiền */
             width: 70px; 
             text-align: right;
        }


        /* --- Phần tổng cộng --- */
        .totals {
            text-align: right;
            margin: 10px 0; /* Giảm margin */
        }
        .totals strong {
            font-size: 1.3em; /* ~13px */
            font-weight: 700;
        }

        /* --- Mã QR --- */
        .qr-code {
            text-align: center;
            margin-bottom: 10px; /* Giảm margin */
        }
        .qr-code img {
            max-width: 120px; /* Giảm kích thước QR */
        }
        .qr-code p {
            margin-top: 5px;
            font-size: 0.9em; /* ~9px */
        }

        /* --- Chân trang --- */
        .footer {
            margin-top: 10px; /* Giảm margin */
            font-size: 0.9em; /* ~9px */
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <section class="shop-info">
            <h2>${shopName}</h2>
            <p>${shopAddress}</p>
            <p>ĐT: ${shopPhone}</p>
        </section>

        <header class="header">
            <h1>Hóa Đơn</h1>
        </header>
        
        <section class="invoice-details">
            <div class="detail-item">
                <span class="label">Số HĐ:</span>
                <span class="value">${order.orderNumber}</span>
            </div>
            <div class="detail-item">
                <span class="label">Ngày:</span>
                <span class="value">${format(new Date(order.date), "dd/MM/yyyy")}</span>
            </div>
            <div class="detail-item">
                <span class="label">Khách hàng:</span>
                <span class="value">${order.customerName || 'Khách lẻ'}</span>
            </div>
        </section>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Tên SP</th>
                    <th class="align-right">SL</th>
                    <th class="align-right">Thành Tiền</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml} <!-- Đã bỏ cột STT và Đơn giá -->
            </tbody>
        </table>

        <div class="totals">
            <strong>Tổng Cộng: ${order.totalAmount.toLocaleString('vi-VN')} đ</strong>
        </div>

        <div class="qr-code">
            <p>Quét mã QR để thanh toán</p>
            <img src="${vietQRURL}" alt="VietQR Payment" />
        </div>

        <footer class="footer">
            <p>Cảm ơn quý khách!</p>
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
      alert('Vui lòng cho phép pop-up để in hóa đơn.');
    }
  };


  return (
    <Dialog open={!!order} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chi Tiết Đơn Hàng: {order.orderNumber}</DialogTitle>
          <DialogDescription>
            Ngày tạo: {format(new Date(order.date), "dd/MM/yyyy HH:mm", { locale: vi })}
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
                    
                    <div className="font-semibold">Tổng giá vốn:</div>
                    <div className="text-right">{order.totalCost.toLocaleString('vi-VN')} đ</div>

                    <div className="font-semibold text-primary text-base border-t pt-1 mt-1">Lợi nhuận:</div>
                    <div className="text-right font-bold text-primary text-base border-t pt-1 mt-1">{order.totalProfit.toLocaleString('vi-VN')} đ</div>
                </div>

                {order.notes && (
                    <div className="mt-2">
                        <span className="font-semibold">Ghi chú:</span>
                        <p className="text-sm whitespace-pre-wrap p-2 bg-muted rounded-md">{order.notes}</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handlePrintInvoice}>
            <Printer className="mr-2 h-4 w-4" />
            In Hóa Đơn
          </Button>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

