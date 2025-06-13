
"use client";

import React from 'react';
import type { Product } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  if (!product) {
    return null;
  }

  let statusText = 'Còn hàng';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = 'default'; // "secondary" for green-ish
  let statusClassName = "bg-green-500 text-white";


  if (product.currentStock === 0) {
    statusText = 'Hết hàng';
    statusVariant = 'destructive';
    statusClassName = "bg-red-500 text-white";
  } else if (product.minStockLevel !== undefined && product.currentStock <= product.minStockLevel) {
    statusText = 'Sắp hết hàng';
    statusVariant = 'default'; // using default for orange/yellowish
    statusClassName = "bg-orange-500 text-white";
  }


  return (
    <Dialog open={!!product} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chi Tiết Sản Phẩm: {product.name}</DialogTitle>
          {product.sku && <DialogDescription>SKU: {product.sku}</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-200px)] pr-5">
          <div className="grid gap-4 py-4">
            {product.imageUrl && (
              <div className="mb-4 flex justify-center">
                <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                  <Image 
                    src={product.imageUrl} 
                    alt={product.name} 
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="product item"
                  />
                </div>
              </div>
            )}
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold w-[150px]">Tên sản phẩm:</TableCell>
                  <TableCell>{product.name}</TableCell>
                </TableRow>
                {product.sku && (
                  <TableRow>
                    <TableCell className="font-semibold">SKU:</TableCell>
                    <TableCell>{product.sku}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-semibold">Đơn vị tính:</TableCell>
                  <TableCell>{product.unit}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Giá vốn:</TableCell>
                  <TableCell>{product.costPrice !== undefined ? product.costPrice.toLocaleString('vi-VN') + ' đ' : 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Giá bán:</TableCell>
                  <TableCell>{product.sellingPrice !== undefined ? product.sellingPrice.toLocaleString('vi-VN') + ' đ' : 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Tồn kho ban đầu:</TableCell>
                  <TableCell>{product.initialStock}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Tồn kho hiện tại:</TableCell>
                  <TableCell className="font-bold">{product.currentStock}</TableCell>
                </TableRow>
                {product.minStockLevel !== undefined && (
                  <TableRow>
                    <TableCell className="font-semibold">Mức tồn tối thiểu:</TableCell>
                    <TableCell>{product.minStockLevel}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-semibold">Trạng thái:</TableCell>
                  <TableCell>
                     <Badge variant={statusVariant} className={cn("text-xs font-medium", statusClassName)}>
                        {statusText}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
