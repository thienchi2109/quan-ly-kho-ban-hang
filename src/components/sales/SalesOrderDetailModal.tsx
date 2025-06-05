
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
        return 'default'; // Blueish in theme
      case 'Hoàn thành':
        return 'secondary'; // Greenish/success
      case 'Đã hủy':
        return 'destructive';
      default:
        return 'outline';
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
                        <p>
                             <Badge variant={getStatusVariant(order.status)} className={cn(
                                "text-xs font-medium",
                                order.status === "Mới" && "bg-blue-500 text-white",
                                order.status === "Hoàn thành" && "bg-green-500 text-white",
                                order.status === "Đã hủy" && "bg-red-500 text-white",
                            )}>
                                {order.status}
                            </Badge>
                        </p>
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

