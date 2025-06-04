"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpenseEntrySchema } from '@/lib/schemas';
import type { ExpenseEntry, ExpenseCategory } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

type ExpenseFormValues = Omit<ExpenseEntry, 'id'>;

export default function ExpensesPage() {
  const { expenseEntries, addExpenseEntry, deleteExpenseEntry } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      description: '',
      receiptImageUrl: '',
    },
  });

  const onSubmit = (values: ExpenseFormValues, closeModal: () => void) => {
    addExpenseEntry(values);
    toast({ title: "Thành công!", description: "Đã thêm khoản chi tiêu mới." });
    form.reset();
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteExpenseEntry(id);
    toast({ title: "Đã xóa", description: "Đã xóa khoản chi tiêu.", variant: "destructive" });
  };
  
  const columns: ColumnDef<ExpenseEntry>[] = [
    {
      accessorKey: "date",
      header: "Ngày",
      cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "amount",
      header: "Số Tiền",
      cell: ({ row }) => `${row.getValue<number>("amount").toLocaleString('vi-VN')} đ`,
    },
    {
      accessorKey: "category",
      header: "Danh Mục",
    },
    {
      accessorKey: "description",
      header: "Mô Tả",
    },
    {
      accessorKey: "receiptImageUrl",
      header: "Biên Lai",
      cell: ({ row }) => {
        const url = row.getValue<string | undefined>("receiptImageUrl");
        if (url) {
          return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
              <Image src={url} alt="Biên lai" width={32} height={32} className="h-8 w-8 object-cover rounded-sm mr-2" data-ai-hint="receipt document"/>
              Xem <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          );
        }
        return <span className="text-muted-foreground">Không có</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {/* <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button> */}
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`khoản chi tiêu "${row.original.description || row.original.category}"`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Theo Dõi Chi Tiêu" description="Quản lý các khoản chi tiêu của bạn.">
        <FormModal<ExpenseFormValues>
          title="Thêm Khoản Chi Tiêu Mới"
          description="Điền thông tin chi tiết về khoản chi tiêu."
          formId="add-expense-form"
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Mới
            </Button>
          }
          onOpenChange={setIsModalOpen}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4" id="add-expense-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ngày</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full pl-3 text-left font-normal">
                              {field.value ? format(new Date(field.value), "PPP", { locale: vi }) : <span>Chọn ngày</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số Tiền</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh Mục</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô Tả (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Mô tả chi tiết..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receiptImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Hình Ảnh Biên Lai (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/receipt.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={expenseEntries} filterColumn="description" filterPlaceholder="Lọc theo mô tả..." />
        </CardContent>
      </Card>
    </>
  );
}
