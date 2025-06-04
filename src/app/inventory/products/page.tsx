
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
import { PlusCircle, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks';
import { PRODUCT_UNITS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ProductFormValues = Omit<Product, 'id' | 'currentStock'>;

const SortableHeader = ({ column, title }: { column: any, title: string }) => {
  const isSorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted === "asc")}
      className="px-2 py-1 -ml-2"
    >
      {title}
      {isSorted === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
      {isSorted === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
      {!isSorted && <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
    </Button>
  );
};


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
        initialStock: editingProduct.initialStock, 
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
      updateProduct({ ...editingProduct, ...values, currentStock: getProductStock(editingProduct.id) }); 
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
        const url = row.original.imageUrl;
        const name = row.original.name;
        return url ? (
          <Image src={url} alt={name} width={40} height={40} className="h-10 w-10 object-cover rounded-sm" data-ai-hint="product item"/>
        ) : (
          <div className="h-10 w-10 bg-muted rounded-sm flex items-center justify-center text-muted-foreground text-xs">
            N/A
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    { 
      accessorKey: "name", 
      header: ({ column }) => <SortableHeader column={column} title="Tên Sản Phẩm" />,
    },
    { 
      accessorKey: "sku", 
      header: ({ column }) => <SortableHeader column={column} title="SKU" />,
      cell: ({ row }) => row.original.sku || 'N/A',
    },
    { 
      accessorKey: "unit", 
      header: "Đơn Vị" 
    },
    { 
      accessorKey: "costPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Vốn" />,
      cell: ({ row }) => row.original.costPrice?.toLocaleString('vi-VN') + ' đ' || 'N/A'
    },
    { 
      accessorKey: "sellingPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Bán" />,
      cell: ({ row }) => row.original.sellingPrice?.toLocaleString('vi-VN') + ' đ' || 'N/A'
    },
    { 
      accessorKey: "currentStock", 
      header: ({ column }) => <SortableHeader column={column} title="Tồn Kho" />,
      cell: ({ row }) => {
        const product = row.original;
        const isLowStock = product.minStockLevel !== undefined && product.currentStock < product.minStockLevel;
        const isOutOfStock = product.currentStock === 0;
        return (
          <span className={cn(
            isLowStock && "text-destructive font-semibold",
            isOutOfStock && !isLowStock && "text-yellow-600 font-semibold"
          )}>
            {product.currentStock}
          </span>
        );
      }
    },
    { 
      accessorKey: "minStockLevel", 
      header: ({ column }) => <SortableHeader column={column} title="Tồn Tối Thiểu" />,
      cell: ({ row }) => row.original.minStockLevel ?? 'N/A' 
    },
    {
      id: "status",
      header: "Trạng Thái",
      cell: ({ row }) => {
        const product = row.original;
        if (product.minStockLevel !== undefined && product.currentStock < product.minStockLevel) {
          return <span className="text-destructive font-semibold px-2 py-1 rounded-md bg-destructive/10">Sắp hết hàng</span>;
        }
        if (product.currentStock === 0) {
          return <span className="text-yellow-600 font-semibold px-2 py-1 rounded-md bg-yellow-500/10">Hết hàng</span>;
        }
        return <span className="text-green-600 font-semibold px-2 py-1 rounded-md bg-green-500/10">Còn hàng</span>;
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
           <FormModal<ProductFormValues>
              title={editingProduct?.id === row.original.id ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
              formId={`product-form-${row.id}`} // Unique formId
              triggerButton={
                <Button variant="ghost" size="icon" onClick={() => {/* Click handled by onOpenChange */}}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              }
              onOpenChange={(isOpen) => {
                if (isOpen) openEditModal(row.original, () => {});
                else if (editingProduct?.id === row.original.id) setEditingProduct(null);
              }}
              defaultOpen={false} 
            >
            {(closeModal) => (
              <ProductFormContent form={form} onSubmit={(values) => onSubmit(values, closeModal)} closeModal={closeModal} isEditing={!!editingProduct} />
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
          title="Thêm Sản Phẩm Mới"
          description="Điền thông tin chi tiết về sản phẩm."
          formId="product-form-new" // Unique formId
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm
            </Button>
          }
          onOpenChange={(isOpen) => {
            if (!isOpen && !editingProduct) setEditingProduct(null); 
            else if (isOpen) openNewModal(() => {}); 
          }}
        >
          {(closeModal) => (
            <ProductFormContent form={form} onSubmit={(values) => onSubmit(values, closeModal)} closeModal={closeModal} isEditing={false} />
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
    form: any; 
    onSubmit: (values: ProductFormValues, closeModal: () => void) => void;
    closeModal: () => void;
    isEditing: boolean;
}

function ProductFormContent({ form, onSubmit, closeModal, isEditing }: ProductFormContentProps) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data: ProductFormValues) => onSubmit(data, closeModal))} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto p-1" id={form.formId}>
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
                        <FormItem><FormLabel>Giá Vốn (tùy chọn)</FormLabel><FormControl><Input type="number" step="any" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                        <FormItem><FormLabel>Giá Bán (tùy chọn)</FormLabel><FormControl><Input type="number" step="any" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="initialStock" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tồn Kho Ban Đầu</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} disabled={isEditing} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
                          {isEditing && <p className="text-xs text-muted-foreground">Không thể sửa tồn kho ban đầu. Sử dụng Nhập/Xuất kho để điều chỉnh.</p>}
                          <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="minStockLevel" render={({ field }) => (
                        <FormItem><FormLabel>Mức Tồn Kho Tối Thiểu (tùy chọn)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
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


    