
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
    const shopAddress = "123 Đường ABC, Quận XYZ, Thành phố HCM"; // Replace
    const shopPhone = "0901234567"; // Replace

    const totalAmount = order.totalAmount;
    const addInfoRaw = `Thanh toan don hang ${order.orderNumber}`;
    const accountNameRaw = "Maimiel";

    const vietQRURL = `https://img.vietqr.io/image/vietcombank-0111000317652-print.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;

    const itemsHtml = order.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.productName}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${item.unitPrice.toLocaleString('vi-VN')} đ</td>
        <td style="text-align: right;">${item.totalPrice.toLocaleString('vi-VN')} đ</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <html>
        <head>
          <title>Hóa Đơn - ${order.orderNumber}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; font-size: 14px; line-height: 1.6; color: #333; }
            .invoice-container { max-width: 800px; margin: auto; background: #fff; padding: 25px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 20px; }
            .shop-info { margin-bottom: 20px; }
            .shop-info h2 { margin: 0 0 5px 0; font-size: 1.5em; color: #555; }
            .shop-info p { margin: 0; font-size: 0.9em; }
            .invoice-details { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #ccc; }
            .invoice-details table { width: 100%; }
            .invoice-details td { padding: 2px 0; }
            .invoice-details .label { font-weight: bold; width: 120px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f9f9f9; }
            .totals { text-align: right; margin-bottom: 30px; }
            .totals strong { font-size: 1.2em; }
            .qr-code { text-align: center; margin-bottom: 20px; }
            .qr-code img { max-width: 200px; border: 1px solid #ddd; padding: 5px; }
            .footer { text-align: center; font-size: 0.9em; color: #777; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
            @media print {
              body { padding: 0; font-size: 12px; }
              .invoice-container { border: none; box-shadow: none; margin: 0; max-width: 100%; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <h1>HÓA ĐƠN BÁN HÀNG</h1>
            </div>
            <div class="shop-info">
              <h2>${shopName}</h2>
              <p>${shopAddress}</p>
              <p>Điện thoại: ${shopPhone}</p>
            </div>
            <div class="invoice-details">
              <table>
                <tr><td class="label">Số HĐ:</td><td>${order.orderNumber}</td></tr>
                <tr><td class="label">Ngày tạo:</td><td>${format(new Date(order.date), "dd/MM/yyyy HH:mm", { locale: vi })}</td></tr>
                <tr><td class="label">Khách hàng:</td><td>${order.customerName || 'Khách lẻ'}</td></tr>
                <tr><td class="label">Trạng thái:</td><td>${order.status}</td></tr>
              </table>
            </div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Sản Phẩm</th>
                  <th style="text-align: right;">Số Lượng</th>
                  <th style="text-align: right;">Đơn Giá</th>
                  <th style="text-align: right;">Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="totals">
              <strong>Tổng Cộng: ${order.totalAmount.toLocaleString('vi-VN')} đ</strong>
            </div>
            <div class="qr-code">
              <p>Quét mã QR để thanh toán:</p>
              <img src="${vietQRURL}" alt="VietQR Payment" data-ai-hint="payment qr code" />
            </div>
            <div class="footer">
              <p>Cảm ơn quý khách đã mua hàng!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close(); // Important for some browsers
      // Delay print slightly to ensure images (like QR) have a chance to load
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

