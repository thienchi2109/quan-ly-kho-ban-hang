
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InventoryTransactionSchema } from '@/lib/schemas';
import type { InventoryTransaction, Product } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportFormValues = Omit<InventoryTransaction, 'id' | 'type'>;

export default function ImportsPage() {
  const { products, inventoryTransactions, addInventoryTransaction, getProductById } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const importTransactions = inventoryTransactions.filter(t => t.type === 'import');

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(InventoryTransactionSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      relatedParty: '',
      notes: '',
    },
  });

  const onSubmit = async (values: ImportFormValues, closeModal: () => void) => {
    setIsSubmitting(true);
    const result = await addInventoryTransaction({ ...values, type: 'import' });
    if (result === null) {
      toast({ title: "Thành công!", description: "Đã ghi nhận phiếu nhập kho." });
      form.reset({
        productId: '',
        quantity: 1,
        date: format(new Date(), 'yyyy-MM-dd'),
        relatedParty: '',
        notes: '',
      });
      closeModal();
    } else {
      toast({ title: "Lỗi!", description: result, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const columns: ColumnDef<InventoryTransaction>[] = [
    {
      accessorKey: "date",
      header: "Ngày Nhập",
      cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "productId",
      header: "Sản Phẩm",
      cell: ({ row }) => getProductById(row.getValue("productId"))?.name || "Không rõ",
    },
    {
      accessorKey: "quantity",
      header: "Số Lượng",
    },
    {
      accessorKey: "relatedParty",
      header: "Nhà Cung Cấp",
      cell: ({ row }) => row.getValue("relatedParty") || <span className="text-muted-foreground italic">N/A</span>,
    },
    {
      accessorKey: "notes",
      header: "Ghi Chú",
      cell: ({ row }) => row.getValue("notes") || <span className="text-muted-foreground italic">N/A</span>,
    },
  ];

  const renderImportCard = (row: Row<InventoryTransaction>): React.ReactNode => {
    const transaction = row.original;
    const productCell = row.getVisibleCells().find(cell => cell.column.id === 'productId');
    const dateCell = row.getVisibleCells().find(cell => cell.column.id === 'date');
    const quantityCell = row.getVisibleCells().find(cell => cell.column.id === 'quantity');
    const relatedPartyCell = row.getVisibleCells().find(cell => cell.column.id === 'relatedParty');
    const notesCell = row.getVisibleCells().find(cell => cell.column.id === 'notes');

    return (
      <Card key={transaction.id} className="w-full">
        <CardHeader className="pb-3">
          {productCell && <CardTitle className="text-base mb-1">{flexRender(productCell.column.columnDef.cell, productCell.getContext())}</CardTitle>}
          {dateCell && <CardDescription>Ngày nhập: {flexRender(dateCell.column.columnDef.cell, dateCell.getContext())}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          {quantityCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Số lượng:</span>
              <span>{flexRender(quantityCell.column.columnDef.cell, quantityCell.getContext())}</span>
            </div>
          }
          {relatedPartyCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Nhà cung cấp:</span>
              <span>{flexRender(relatedPartyCell.column.columnDef.cell, relatedPartyCell.getContext())}</span>
            </div>
          }
          {notesCell && (
            <div>
              <span className="text-muted-foreground font-medium">Ghi chú: </span>
              {flexRender(notesCell.column.columnDef.cell, notesCell.getContext())}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Nhập Kho" description="Ghi nhận các giao dịch nhập hàng vào kho.">
         <Button onClick={() => {
           form.reset({
            productId: '',
            quantity: 1,
            date: format(new Date(), 'yyyy-MM-dd'),
            relatedParty: '',
            notes: '',
           });
           setIsModalOpen(true);
         }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tạo Phiếu Nhập
        </Button>
      </PageHeader>
      <FormModal<ImportFormValues>
          title="Tạo Phiếu Nhập Kho"
          description="Điền thông tin chi tiết về lô hàng nhập."
          formId="add-import-form"
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4" id="add-import-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày Nhập</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10"/>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sản Phẩm</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name} ({product.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số Lượng Nhập</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relatedParty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nhà Cung Cấp (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên nhà cung cấp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi Chú (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Thông tin thêm về lô hàng..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {form.reset({ productId: '', quantity: 1, date: format(new Date(), 'yyyy-MM-dd'), relatedParty: '', notes: '' }); closeModal();}}>Hủy</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Lưu Phiếu Nhập
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>


      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns} 
            data={importTransactions} 
            filterColumn="productId" 
            filterPlaceholder="Lọc theo sản phẩm..."
            renderCardRow={renderImportCard}
          />
        </CardContent>
      </Card>
    </>
  );
}
