
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SalesOrderSchema } from '@/lib/schemas';
import type { SalesOrder, Product, OrderItem } from '@/lib/types';
import { useData } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableProductSelect } from '@/components/common/SearchableProductSelect';
import { PlusCircle, MinusCircle, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks';
import type { SalesOrderFormValues } from '@/app/sales/orders/page';
import { z } from 'zod';

interface EditSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
}

const EditOrderFormSchema = SalesOrderSchema.omit({ status: true, orderNumber: true, totalAmount: true })
  .extend({
    editReason: z.string().min(1, "Vui lòng nhập lý do chỉnh sửa."),
  });

type EditOrderFormValues = SalesOrderFormValues & { editReason: string };

export default function EditSalesOrderModal({ isOpen, onClose, order }: EditSalesOrderModalProps) {
  const { products, updateSalesOrder, getProductStock, isLoading: isDataLoading } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(EditOrderFormSchema),
    defaultValues: {
      customerName: '',
      date: '',
      items: [],
      notes: '',
      editReason: '',
      finalAmount: 0
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "fieldId",
  });

  const watchedItems = form.watch("items");

  useEffect(() => {
    if (order) {
      form.reset({
        customerName: order.customerName || '',
        date: order.date,
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
        })),
        notes: order.notes || '',
        finalAmount: order.finalAmount || order.totalAmount,
        editReason: '',
      });
    }
  }, [order, form]);

  const calculateTotalAmount = useCallback(() => {
    return watchedItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return sum + (quantity * unitPrice);
    }, 0);
  }, [watchedItems]);

  useEffect(() => {
     form.setValue('finalAmount', calculateTotalAmount());
  }, [watchedItems, form, calculateTotalAmount]);


  const handleProductChange = (itemIndex: number, productId: string | undefined) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (product) {
      update(itemIndex, {
        ...watchedItems[itemIndex],
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0,
      });
    }
  };

  const handleItemQuantityChange = (itemIndex: number, newQuantityValue: number | string) => {
    const currentItem = watchedItems[itemIndex];
    const product = products.find(p => p.id === currentItem?.productId);
    const originalItem = order?.items.find(i => i.productId === currentItem?.productId);
    const originalQuantity = originalItem?.quantity || 0;

    if (typeof newQuantityValue === 'string' && newQuantityValue.trim() === "") {
        update(itemIndex, { ...currentItem, quantity: "" as any });
        return;
    }

    let numQuantity = Number(newQuantityValue);
    if (isNaN(numQuantity) || numQuantity < 0) {
        update(itemIndex, { ...currentItem, quantity: currentItem.quantity || "" as any });
        return;
    }

    if (product) {
        const availableStock = getProductStock(product.id) + originalQuantity; // Stock available + what was in the original order
        if (numQuantity > availableStock) {
            toast({
                title: "Số lượng vượt tồn kho",
                description: `Tồn kho khả dụng cho ${product.name} là ${availableStock}.`,
                variant: "default",
            });
            numQuantity = availableStock;
        }
    }
    update(itemIndex, { ...currentItem, quantity: numQuantity });
  };


  const onSubmit = async (data: EditOrderFormValues) => {
    if (!order) return;
    setIsSubmitting(true);
    try {
        const { editReason, ...orderData } = data;
        await updateSalesOrder(order.id, orderData, editReason);
        toast({ title: "Thành công!", description: "Đã cập nhật đơn hàng." });
        onClose();
    } catch (error: any) {
        toast({ title: "Lỗi", description: error.message || "Không thể cập nhật đơn hàng.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Chỉnh Sửa Đơn Hàng: {order.orderNumber}</DialogTitle>
          <DialogDescription>
            Thực hiện các thay đổi và cung cấp lý do. Các thay đổi về số lượng sẽ tự động cập nhật tồn kho.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[calc(90vh-250px)] pr-4">
              <div className="space-y-4 py-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel>Ngày Tạo Đơn</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="customerName" render={({ field }) => ( <FormItem><FormLabel>Tên Khách Hàng</FormLabel><FormControl><Input placeholder="Nhập tên khách hàng" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <Card>
                    <CardHeader><CardTitle className="text-lg">Chi Tiết Sản Phẩm</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                    {fields.map((itemField, index) => {
                        const currentItem = watchedItems[index];
                        const product = products.find(p => p.id === currentItem?.productId);
                        const originalQuantity = order.items.find(i => i.productId === currentItem?.productId)?.quantity || 0;
                        const availableStock = (product?.currentStock || 0) + originalQuantity;

                        return (
                        <div key={itemField.fieldId} className="p-3 border rounded-md space-y-3 bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormField control={form.control} name={`items.${index}.productId`} render={({ field }) => (<FormItem><FormLabel>Sản Phẩm</FormLabel><FormControl><SearchableProductSelect products={products} selectedProductId={field.value} onProductSelect={(pid) => { field.onChange(pid); handleProductChange(index, pid); }} disabledProductIds={watchedItems.filter((_, i) => i !== index).map(i => i.productId).filter(Boolean) as string[]} placeholder="Chọn hoặc tìm sản phẩm" disabled={isDataLoading} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Số Lượng (Khả dụng: {availableStock})</FormLabel><div className="flex items-center gap-1.5"><Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleItemQuantityChange(index, Number(field.value) - 1)} disabled={!product || Number(field.value) <= 1}><MinusCircle className="h-4 w-4" /></Button><FormControl><Input type="number" {...field} onChange={e => handleItemQuantityChange(index, e.target.value)} className="w-16 text-center h-9" disabled={!product} /></FormControl><Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleItemQuantityChange(index, Number(field.value) + 1)} disabled={!product || Number(field.value) >= availableStock}><PlusCircle className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)}/>
                            </div>
                            <div className="grid grid-cols-7 gap-x-3 items-end">
                            <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => ( <FormItem className="col-span-3"><FormLabel>Đơn Giá</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={!product} /></FormControl><FormMessage /></FormItem>)}/>
                            <div className="col-span-3"><FormLabel>Thành Tiền</FormLabel><p className="font-semibold text-sm h-10 flex items-center">{((Number(currentItem?.quantity) || 0) * (Number(currentItem?.unitPrice) || 0)).toLocaleString('vi-VN')} đ</p></div>
                            <div className="flex justify-end col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></div>
                            </div>
                        </div>);
                    })}
                     <Button type="button" variant="outline" onClick={() => append({productId: '', productName: '', quantity: 1, unitPrice: 0, costPrice: 0})}><PlusCircle className="mr-2 h-4 w-4" />Thêm Sản Phẩm</Button>
                    </CardContent>
                </Card>
                <div className="text-right mt-4"><p className="text-lg font-semibold">Tổng Cộng: {calculateTotalAmount().toLocaleString('vi-VN')} đ</p></div>
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Ghi Chú</FormLabel><FormControl><Textarea placeholder="Thông tin thêm..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="editReason" render={({ field }) => ( <FormItem><FormLabel>Lý do chỉnh sửa</FormLabel><FormControl><Input placeholder="VD: Thay đổi số lượng theo yêu cầu của khách" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Lưu Thay Đổi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
