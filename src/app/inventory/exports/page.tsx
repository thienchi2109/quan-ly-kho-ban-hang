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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';

type ExportFormValues = Omit<InventoryTransaction, 'id' | 'type'>;

export default function ExportsPage() {
  const { products, inventoryTransactions, addInventoryTransaction, getProductById, getProductStock } = useData();
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const exportTransactions = inventoryTransactions.filter(t => t.type === 'export');

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(InventoryTransactionSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      date: new Date().toISOString().split('T')[0],
      relatedParty: '',
      notes: '',
    },
  });

  const onSubmit = (values: ExportFormValues, closeModal: () => void) => {
    const result = addInventoryTransaction({ ...values, type: 'export' });
    if (result === null) {
      toast({ title: "Thành công!", description: "Đã ghi nhận phiếu xuất kho." });
      form.reset();
      closeModal();
    } else {
      toast({ title: "Lỗi!", description: result, variant: "destructive" });
    }
  };

  const currentStockForSelected = selectedProductId ? getProductStock(selectedProductId) : null;
  
  const columns: ColumnDef<InventoryTransaction>[] = [
    {
      accessorKey: "date",
      header: "Ngày Xuất",
      cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy", { locale: vi }),
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
      header: "Khách Hàng/Mục Đích",
      cell: ({ row }) => row.getValue("relatedParty") || "N/A",
    },
    {
      accessorKey: "notes",
      header: "Ghi Chú",
      cell: ({ row }) => row.getValue("notes") || "N/A",
    },
  ];

  return (
    <>
      <PageHeader title="Xuất Kho" description="Ghi nhận các giao dịch xuất hàng khỏi kho.">
        <FormModal<ExportFormValues>
          title="Tạo Phiếu Xuất Kho"
          description="Điền thông tin chi tiết về lô hàng xuất."
          formId="add-export-form"
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Tạo Phiếu Xuất
            </Button>
          }
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4" id="add-export-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ngày Xuất</FormLabel>
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
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sản Phẩm</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedProductId(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name} (Tồn: {getProductStock(product.id)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentStockForSelected !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tồn kho hiện tại của sản phẩm đã chọn: {currentStockForSelected}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số Lượng Xuất</FormLabel>
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
                      <FormLabel>Khách Hàng/Mục Đích Sử Dụng (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên khách hàng hoặc mục đích" {...field} />
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
                    <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
                    <Button type="submit">Lưu Phiếu Xuất</Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={exportTransactions} filterColumn="productId" filterPlaceholder="Lọc theo sản phẩm..." />
        </CardContent>
      </Card>
    </>
  );
}
