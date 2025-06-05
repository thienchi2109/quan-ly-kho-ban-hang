
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SalesOrderSchema, OrderItemSchema as SingleOrderItemSchema } from '@/lib/schemas';
import type { SalesOrder, OrderItem as OrderItemType, Product, SalesOrderStatus } from '@/lib/types';
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
// import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'; // Might be used for cancelling orders
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Trash2, ShoppingCart, Edit3, MoreHorizontal, Eye } from 'lucide-react';
import { useToast } from '@/hooks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SALES_ORDER_STATUSES } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import SalesOrderDetailModal from '@/components/sales/SalesOrderDetailModal'; // Import the new modal

// Form values type, slightly different from SalesOrder to handle form state
type SalesOrderFormValues = {
  customerName?: string;
  date: string;
  items: Array<Omit<OrderItemType, 'id' | 'totalPrice' | 'costPrice'> & { costPrice?: number, tempId: string }>; // costPrice is fetched, totalPrice calculated
  status: SalesOrderStatus;
  notes?: string;
};


export default function SalesOrdersPage() {
  const { salesOrders, products, addSalesOrder, updateSalesOrderStatus, isLoading: isDataLoading, getProductStock } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);


  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(SalesOrderSchema.omit({ orderNumber: true })), // orderNumber is auto-generated
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      items: [],
      status: 'Mới',
      notes: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "fieldId", // Important for React key prop
  });

  const watchedItems = form.watch("items");

  const calculateTotalAmount = useCallback(() => {
    return watchedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);


  const onSubmit = async (values: SalesOrderFormValues, closeModal: () => void) => {
    const itemsForOrder = values.items.map(item => {
      const productDetails = products.find(p => p.id === item.productId);
      return {
        ...item,
        costPrice: productDetails?.costPrice || 0, // Ensure costPrice is set
      };
    });

    const orderId = await addSalesOrder({ ...values, items: itemsForOrder });
    if (orderId) {
      toast({ title: "Thành công!", description: "Đã tạo đơn hàng mới." });
      form.reset({
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        items: [],
        status: 'Mới',
        notes: '',
      });
      closeModal();
    } else {
      // Error toast is handled by addSalesOrder in DataContext
    }
  };

  const handleProductChange = (itemIndex: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      update(itemIndex, {
        ...fields[itemIndex], // Keep tempId and other potentially set values
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0, // Store cost price at time of selection
        quantity: fields[itemIndex].quantity || 1, // Default quantity to 1 if not set
      });
    }
  };
  
  const columns: ColumnDef<SalesOrder>[] = [
    {
      accessorKey: "orderNumber",
      header: "Mã ĐH",
    },
    {
      accessorKey: "date",
      header: "Ngày Tạo",
      cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "customerName",
      header: "Khách Hàng",
      cell: ({ row }) => row.getValue("customerName") || "Khách lẻ",
    },
    {
      accessorKey: "totalAmount",
      header: "Tổng Tiền",
      cell: ({ row }) => `${row.getValue<number>("totalAmount").toLocaleString('vi-VN')} đ`,
    },
    {
      accessorKey: "totalProfit",
      header: "Lợi Nhuận",
      cell: ({ row }) => {
        const profit = row.getValue<number>("totalProfit");
        const profitColor = profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-muted-foreground";
        return <span className={profitColor}>{profit.toLocaleString('vi-VN')} đ</span>;
      }
    },
    {
      accessorKey: "status",
      header: "Trạng Thái",
      cell: ({ row }) => {
        const status = row.getValue<SalesOrderStatus>("status");
        return (
          <span className={cn(
            "px-2 py-1 rounded-md text-xs font-medium",
            status === "Mới" && "bg-blue-500 text-white",
            status === "Hoàn thành" && "bg-green-500 text-white",
            status === "Đã hủy" && "bg-red-500 text-white",
          )}>
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Mở menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewingOrder(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              Xem Chi Tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.original.status === 'Mới' && (
              <DropdownMenuItem onClick={() => updateSalesOrderStatus(row.original.id, 'Hoàn thành')}>
                <Edit3 className="mr-2 h-4 w-4" />
                Đánh Dấu Hoàn Thành
              </DropdownMenuItem>
            )}
             {row.original.status !== 'Đã hủy' && (
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => updateSalesOrderStatus(row.original.id, 'Đã hủy')}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hủy Đơn Hàng
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Quản Lý Đơn Hàng Bán" description="Tạo và theo dõi các đơn hàng bán ra.">
        <FormModal<SalesOrderFormValues>
          title="Tạo Đơn Hàng Mới"
          description="Điền thông tin chi tiết cho đơn hàng."
          formId="add-sales-order-form"
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          triggerButton={
            <Button onClick={() => {
              form.reset({ 
                  date: new Date().toISOString().split('T')[0],
                  customerName: '',
                  items: [],
                  status: 'Mới',
                  notes: '',
              });
              setIsModalOpen(true);
            }}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Tạo Đơn Hàng
            </Button>
          }
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-1" id="add-sales-order-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ngày Tạo Đơn</FormLabel>
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
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên Khách Hàng (tùy chọn)</FormLabel>
                        <FormControl><Input placeholder="Nhập tên khách hàng" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Chi Tiết Sản Phẩm</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.fieldId} className="p-3 border rounded-md space-y-3 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field: selectField }) => (
                              <FormItem>
                                <FormLabel>Sản Phẩm</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    selectField.onChange(value);
                                    handleProductChange(index, value);
                                  }}
                                  value={selectField.value}
                                >
                                  <FormControl><SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {products.map(p => (
                                      <SelectItem key={p.id} value={p.id} disabled={getProductStock(p.id) <= 0 && !watchedItems.find(item => item.productId === p.id && item.tempId === field.tempId)}>
                                        {p.name} (Tồn: {getProductStock(p.id)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: quantityField }) => (
                              <FormItem>
                                <FormLabel>Số Lượng</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    min="1"
                                    {...quantityField} 
                                    onChange={e => {
                                        const newQuantity = parseInt(e.target.value, 10) || 1;
                                        const currentProduct = products.find(p => p.id === watchedItems[index]?.productId);
                                        if (currentProduct && newQuantity > getProductStock(currentProduct.id)) {
                                            toast({
                                                title: "Số lượng vượt tồn kho",
                                                description: `Sản phẩm ${currentProduct.name} chỉ còn ${getProductStock(currentProduct.id)}.`,
                                                variant: "destructive"
                                            });
                                            quantityField.onChange(getProductStock(currentProduct.id));
                                        } else {
                                            quantityField.onChange(newQuantity);
                                        }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                           <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field: priceField }) => (
                              <FormItem>
                                <FormLabel>Đơn Giá</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    min="0"
                                    {...priceField}
                                    onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-1">
                            <FormLabel>Thành Tiền</FormLabel>
                            <p className="font-semibold text-sm h-10 flex items-center">
                              {( (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0) ).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive self-end md:ml-auto">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => append({ tempId: Date.now().toString(), productId: '', productName: '', quantity: 1, unitPrice: 0 })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm
                    </Button>
                  </CardContent>
                </Card>

                <div className="text-right mt-4">
                  <p className="text-lg font-semibold">
                    Tổng Cộng: {calculateTotalAmount().toLocaleString('vi-VN')} đ
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng Thái Đơn Hàng</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {SALES_ORDER_STATUSES.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
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
                      <FormControl><Textarea placeholder="Thông tin thêm về đơn hàng..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-6">
                  <Button type="button" variant="outline" onClick={closeModal}>Hủy</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting || isDataLoading || fields.length === 0}>Lưu Đơn Hàng</Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={salesOrders} filterColumn="orderNumber" filterPlaceholder="Lọc theo mã ĐH..." />
        </CardContent>
      </Card>
      
      <SalesOrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </>
  );
}

