
"use client";

import React from 'react';
import type { IncomeEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';

interface IncomeDetailModalProps {
  entry: IncomeEntry | null;
  onClose: () => void;
}

export default function IncomeDetailModal({ entry, onClose }: IncomeDetailModalProps) {
  if (!entry) {
    return null;
  }

  return (
    <Dialog open={!!entry} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi Tiết Khoản Thu Nhập</DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết của khoản thu nhập đã ghi nhận.
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
                <TableCell className="font-semibold">Mô Tả:</TableCell>
                <TableCell className="whitespace-pre-wrap break-words">{entry.description || <span className="italic text-muted-foreground">Không có</span>}</TableCell>
              </TableRow>
              {entry.relatedOrderId && (
                <TableRow>
                  <TableCell className="font-semibold">Đơn Hàng Liên Quan:</TableCell>
                  <TableCell>{entry.relatedOrderId}</TableCell>
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
