"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSchema } from '@/lib/schemas';
import type { Product, ProductUnit } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PRODUCT_UNITS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

type ProductFormValues = Omit<Product, 'id' | 'currentStock'>;

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, getProductStock } = useData();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: '',
      sku: '',
      unit: PRODUCT_UNITS[0],
      costPrice: undefined,
      sellingPrice: undefined,
      minStockLevel: undefined,
      initialStock: 0,
      imageUrl: '',
    },
  });
  
  React.useEffect(() => {
    if (editingProduct) {
      form.reset({
        name: editingProduct.name,
        sku: editingProduct.sku || '',
        unit: editingProduct.unit,
        costPrice: editingProduct.costPrice,
        sellingPrice: editingProduct.sellingPrice,
        minStockLevel: editingProduct.minStockLevel,
        initialStock: editingProduct.initialStock, // Keep initialStock as is for editing
        imageUrl: editingProduct.imageUrl || '',
      });
    } else {
      form.reset({
        name: '', sku: '', unit: PRODUCT_UNITS[0], costPrice: undefined, sellingPrice: undefined,
        minStockLevel: undefined, initialStock: 0, imageUrl: '',
      });
    }
  }, [editingProduct, form]);


  const onSubmit = (values: ProductFormValues, closeModal: () => void) => {
    if (editingProduct) {
      updateProduct({ ...editingProduct, ...values, currentStock: getProductStock(editingProduct.id) }); // currentStock will be updated by context
      toast({ title: "Thành công!", description: "Đã cập nhật sản phẩm." });
    } else {
      addProduct(values);
      toast({ title: "Thành công!", description: "Đã thêm sản phẩm mới." });
    }
    form.reset();
    setEditingProduct(null);
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: "Đã xóa", description: "Đã xóa sản phẩm.", variant: "destructive" });
  };

  const openEditModal = (product: Product, openModalFn: () => void) => {
    setEditingProduct(product);
    openModalFn();
  };
  
  const openNewModal = (openModalFn: () => void) => {
    setEditingProduct(null);
    openModalFn();
  }


  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "imageUrl",
      header: "Ảnh",
      cell: ({ row }) => {
        const url = row.getValue<string | undefined>("imageUrl");
        const name = row.original.name;
        return url ? (
          <Image src={url} alt={name} width={40} height={40} className="h-10 w-10 object-cover rounded-sm" data-ai-hint="product item"/>
        ) : (
          <div className="h-10 w-10 bg-muted rounded-sm flex items-center justify-center text-muted-foreground text-xs">
            N/A
          </div>
        );
      },
      enableHiding: false,
    },
    { accessorKey: "name", header: "Tên Sản Phẩm" },
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "unit", header: "Đơn Vị" },
    { 
      accessorKey: "costPrice", 
      header: "Giá Vốn",
      cell: ({ row }) => row.getValue<number>("costPrice")?.toLocaleString('vi-VN') + ' đ' || 'N/A'
    },
    { 
      accessorKey: "sellingPrice", 
      header: "Giá Bán",
      cell: ({ row }) => row.getValue<number>("sellingPrice")?.toLocaleString('vi-VN') + ' đ' || 'N/A'
    },
    { accessorKey: "currentStock", header: "Tồn Kho" },
    { accessorKey: "minStockLevel", header: "Tồn Tối Thiểu", cell: ({ row }) => row.getValue("minStockLevel") ?? 'N/A' },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
           <FormModal<ProductFormValues>
              title={editingProduct ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
              formId="product-form"
              triggerButton={
                <Button variant="ghost" size="icon" onClick={() => {/*This click is handled by FormModal's trigger logic*/}}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              }
              onOpenChange={(isOpen) => {
                if (isOpen) openEditModal(row.original, () => {}); // Manually set editing state, modal handles its own open
                else setEditingProduct(null);
              }}
              defaultOpen={false} // Important: modal controls its open state
            >
            {(closeModal) => (
              // Form content is duplicated. Consider abstracting if more complex.
              <ProductFormContent form={form} onSubmit={(values) => onSubmit(values, closeModal)} closeModal={closeModal} />
            )}
          </FormModal>
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`sản phẩm "${row.original.name}"`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Quản Lý Sản Phẩm" description="Thêm mới, chỉnh sửa và xem danh sách sản phẩm của bạn.">
        <FormModal<ProductFormValues>
          title={editingProduct ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
          description="Điền thông tin chi tiết về sản phẩm."
          formId="product-form"
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm
            </Button>
          }
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingProduct(null); // Clear editing state when modal closes
            else openNewModal(() => {}); // For new product, clear editing state
          }}
        >
          {(closeModal) => (
            <ProductFormContent form={form} onSubmit={(values) => onSubmit(values, closeModal)} closeModal={closeModal} />
          )}
        </FormModal>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={products} filterColumn="name" filterPlaceholder="Lọc theo tên sản phẩm..." />
        </CardContent>
      </Card>
    </>
  );
}

interface ProductFormContentProps {
    form: any; // React Hook Form instance
    onSubmit: (values: ProductFormValues, closeModal: () => void) => void;
    closeModal: () => void;
}

function ProductFormContent({ form, onSubmit, closeModal }: ProductFormContentProps) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data: ProductFormValues) => onSubmit(data, closeModal))} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto p-1" id="product-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Tên Sản Phẩm</FormLabel><FormControl><Input placeholder="VD: Sách Kỹ Năng A" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sku" render={({ field }) => (
                        <FormItem><FormLabel>Mã SKU (tùy chọn)</FormLabel><FormControl><Input placeholder="VD: SP001" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>Đơn Vị Tính</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger></FormControl>
                            <SelectContent>{PRODUCT_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="costPrice" render={({ field }) => (
                        <FormItem><FormLabel>Giá Vốn (tùy chọn)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                        <FormItem><FormLabel>Giá Bán (tùy chọn)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="initialStock" render={({ field }) => (
                        <FormItem><FormLabel>Tồn Kho Ban Đầu</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="minStockLevel" render={({ field }) => (
                        <FormItem><FormLabel>Mức Tồn Kho Tối Thiểu (tùy chọn)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem><FormLabel>URL Hình Ảnh (tùy chọn)</FormLabel><FormControl><Input type="url" placeholder="https://placehold.co/100x100.png" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Form>
    );
}

