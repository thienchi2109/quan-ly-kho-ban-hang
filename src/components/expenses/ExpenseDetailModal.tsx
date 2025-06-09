
"use client";

import React from 'react';
import type { ExpenseEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface ExpenseDetailModalProps {
  entry: ExpenseEntry | null;
  onClose: () => void;
}

export default function ExpenseDetailModal({ entry, onClose }: ExpenseDetailModalProps) {
  if (!entry) {
    return null;
  }

  return (
    <Dialog open={!!entry} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi Tiết Khoản Chi Tiêu</DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết của khoản chi tiêu đã ghi nhận.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold w-[150px]">Ngày:</TableCell>
                <TableCell>{format(parse(entry.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", { locale: vi })}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Số Tiền:</TableCell>
                <TableCell>{entry.amount.toLocaleString('vi-VN')} đ</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Danh Mục:</TableCell>
                <TableCell>{entry.category}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold align-top">Mô Tả:</TableCell>
                <TableCell className="whitespace-pre-wrap break-words">{entry.description || <span className="italic text-muted-foreground">Không có</span>}</TableCell>
              </TableRow>
              {entry.relatedOrderId && (
                <TableRow>
                  <TableCell className="font-semibold">Đơn Hàng Liên Quan:</TableCell>
                  <TableCell>{entry.relatedOrderId}</TableCell>
                </TableRow>
              )}
              {entry.receiptImageUrl && (
                <TableRow>
                  <TableCell className="font-semibold align-top">Biên Lai:</TableCell>
                  <TableCell>
                    <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block group">
                      <div className="relative w-full max-w-[200px] h-auto aspect-square border rounded-md overflow-hidden mb-1">
                        <Image 
                          src={entry.receiptImageUrl} 
                          alt="Biên lai chi tiêu" 
                          layout="fill"
                          objectFit="contain"
                          className="transition-transform duration-300 group-hover:scale-105"
                          data-ai-hint="receipt document"
                        />
                      </div>
                      <span className="inline-flex items-center text-sm">
                        Xem ảnh gốc <ExternalLink className="ml-1 h-3 w-3" />
                      </span>
                    </a>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
