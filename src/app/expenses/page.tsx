
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type ExpenseFormValues = Omit<ExpenseEntry, 'id'>;

export default function ExpensesPage() {
  const { expenseEntries, addExpenseEntry, deleteExpenseEntry } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseEntrySchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      description: '',
      receiptImageUrl: '',
    },
  });

  const onSubmit = (values: ExpenseFormValues, closeModal: () => void) => {
    addExpenseEntry(values);
    toast({ title: "Thành công!", description: "Đã thêm khoản chi tiêu mới." });
    form.reset({
       date: format(new Date(), 'yyyy-MM-dd'),
       amount: 0,
       category: EXPENSE_CATEGORIES[0],
       description: '',
       receiptImageUrl: '',
    });
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
      cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }),
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
      cell: ({ row }) => row.getValue("description") || <span className="text-muted-foreground italic">Không có</span>,
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
        return <span className="text-muted-foreground italic">Không có</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`khoản chi tiêu "${row.original.description || row.original.category}"`}
          />
        </div>
      ),
    },
  ];

  const renderExpenseCard = (row: Row<ExpenseEntry>): React.ReactNode => {
    const expense = row.original;
    const actionsCell = row.getVisibleCells().find(cell => cell.column.id === 'actions');
    const dateCell = row.getVisibleCells().find(cell => cell.column.id === 'date');
    const amountCell = row.getVisibleCells().find(cell => cell.column.id === 'amount');
    const receiptCell = row.getVisibleCells().find(cell => cell.column.id === 'receiptImageUrl');
    
    return (
      <Card key={expense.id} className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base mb-1">{expense.category}</CardTitle>
          {dateCell && <CardDescription>{flexRender(dateCell.column.columnDef.cell, dateCell.getContext())}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          {amountCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Số tiền:</span>
              <span>{flexRender(amountCell.column.columnDef.cell, amountCell.getContext())}</span>
            </div>
          }
          {expense.description && (
            <div>
              <span className="text-muted-foreground font-medium">Mô tả: </span>
              <span>{expense.description}</span>
            </div>
          )}
           {!expense.description && (
             <div>
                <span className="text-muted-foreground font-medium">Mô tả: </span>
                <span className="text-muted-foreground italic">Không có</span>
            </div>
          )}
          {receiptCell && (
            <div className="mt-1">
              <span className="text-muted-foreground font-medium">Biên lai: </span>
              {flexRender(receiptCell.column.columnDef.cell, receiptCell.getContext())}
            </div>
          )}
        </CardContent>
        {actionsCell && (
          <CardFooter className="flex justify-end pt-3 pb-3">
            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
          </CardFooter>
        )}
      </Card>
    );
  };


  return (
    <>
      <PageHeader title="Theo Dõi Chi Tiêu" description="Quản lý các khoản chi tiêu của bạn.">
        <Button onClick={() => {
          form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: 0,
            category: EXPENSE_CATEGORIES[0],
            description: '',
            receiptImageUrl: '',
          });
          setIsModalOpen(true);
        }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm Mới
        </Button>
      </PageHeader>
      <FormModal<ExpenseFormValues>
          title="Thêm Khoản Chi Tiêu Mới"
          description="Điền thông tin chi tiết về khoản chi tiêu."
          formId="add-expense-form"
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4" id="add-expense-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-10"/>
                      </FormControl>
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
                    <Button type="button" variant="outline" onClick={() => {form.reset({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, category: EXPENSE_CATEGORIES[0], description: '', receiptImageUrl: '' }); closeModal();}}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>


      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns} 
            data={expenseEntries} 
            filterColumn="description" 
            filterPlaceholder="Lọc theo mô tả..."
            renderCardRow={renderExpenseCard}
          />
        </CardContent>
      </Card>
    </>
  );
}
