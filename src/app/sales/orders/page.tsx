
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
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Trash2, ShoppingCart, Edit3, MoreHorizontal, Eye, Loader2, MinusCircle } from 'lucide-react';
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
import SalesOrderDetailModal from '@/components/sales/SalesOrderDetailModal';

type SalesOrderFormValues = {
  customerName?: string;
  date: string;
  items: Array<Omit<OrderItemType, 'id' | 'totalPrice' | 'costPrice'> & { costPrice?: number, tempId: string }>;
  status: SalesOrderStatus;
  notes?: string;
};


export default function SalesOrdersPage() {
  const { salesOrders, products, addSalesOrder, updateSalesOrderStatus, isLoading: isDataContextLoading, getProductStock } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isOrderDatePickerOpen, setIsOrderDatePickerOpen] = useState(false); // State for order date picker


  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(SalesOrderSchema.omit({ orderNumber: true })),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      customerName: '',
      items: [],
      status: 'Mới',
      notes: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "fieldId", 
  });

  const watchedItems = form.watch("items");

  const calculateTotalAmount = useCallback(() => {
    return watchedItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return sum + (quantity * unitPrice);
    }, 0);
  }, [watchedItems]);


  const onSubmit = async (values: SalesOrderFormValues) => {
    setIsSubmittingOrder(true);
    const validItems = values.items.filter(item => Number(item.quantity) > 0 && item.productId);
    
    if (validItems.length === 0) {
        toast({
            title: "Đơn hàng trống",
            description: "Vui lòng thêm ít nhất một sản phẩm hợp lệ vào đơn hàng.",
            variant: "destructive",
        });
        setIsSubmittingOrder(false);
        return;
    }

    const itemsForOrder = validItems.map(item => {
      const productDetails = products.find(p => p.id === item.productId);
      return {
        ...item,
        quantity: Number(item.quantity), 
        unitPrice: Number(item.unitPrice), 
        costPrice: productDetails?.costPrice || 0,
      };
    });

    const orderId = await addSalesOrder({ ...values, items: itemsForOrder });
    if (orderId) {
      toast({ title: "Thành công!", description: "Đã tạo đơn hàng mới." });
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        customerName: '',
        items: [],
        status: 'Mới',
        notes: '',
      });
      setIsModalOpen(false); 
    }
    setIsSubmittingOrder(false);
  };

  const handleProductChange = (itemIndex: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      update(itemIndex, {
        ...fields[itemIndex], 
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0, 
        quantity: fields[itemIndex].quantity || 1, 
      });
    }
  };

 const handleItemQuantityChange = (itemIndex: number, newQuantityValue: number | string) => {
    const currentItem = watchedItems[itemIndex];
    const product = products.find(p => p.id === currentItem?.productId);
    
    if (typeof newQuantityValue === 'string' && newQuantityValue.trim() === "") {
        update(itemIndex, { ...currentItem, quantity: "" as any }); // Allow temporary empty string
        return;
    }

    let numQuantity = Number(newQuantityValue);
    if (isNaN(numQuantity) || numQuantity < 0) { // Allow 0 temporarily during input
        update(itemIndex, { ...currentItem, quantity: currentItem.quantity || "" as any }); // Revert or keep empty
        return;
    }
    
    if (product) {
        const availableStock = getProductStock(product.id);
        if (numQuantity > availableStock) {
            toast({
                title: "Số lượng vượt tồn kho",
                description: `Sản phẩm ${product.name} chỉ còn ${availableStock}. Đã điều chỉnh số lượng.`,
                variant: "default", // Use default toast variant
            });
            numQuantity = availableStock;
        }
    }
    update(itemIndex, { ...currentItem, quantity: numQuantity });
  };
  
  const handleItemQuantityBlur = (itemIndex: number) => {
    const currentItem = watchedItems[itemIndex];
    let currentQuantity = Number(currentItem.quantity);

    if (isNaN(currentQuantity) || currentQuantity < 1) {
        const product = products.find(p => p.id === currentItem?.productId);
        if (product && getProductStock(product.id) > 0) {
            currentQuantity = 1; // Default to 1 if stock available and input is invalid
        } else {
            currentQuantity = 0; // Or 0 if no stock
        }
        update(itemIndex, { ...currentItem, quantity: currentQuantity });
    }
  };

  const adjustItemQuantityWithButtons = (itemIndex: number, adjustment: number) => {
    const currentItem = watchedItems[itemIndex];
    let currentQuantity = Number(currentItem.quantity) || 0;
    let newQuantity = currentQuantity + adjustment;

    const product = products.find(p => p.id === currentItem?.productId);
    if (product) {
        const availableStock = getProductStock(product.id);
        if (newQuantity > availableStock) {
            newQuantity = availableStock;
            toast({
                title: "Số lượng tối đa",
                description: `Sản phẩm ${product.name} chỉ còn ${availableStock}.`,
            });
        }
    } else { 
        update(itemIndex, { ...currentItem, quantity: 1 });
        return;
    }

    if (newQuantity < 1 && product) { 
        newQuantity = 1;
    } else if (newQuantity < 0) { 
        newQuantity = 0;
    }
    update(itemIndex, { ...currentItem, quantity: newQuantity });
  };
  
  const columns: ColumnDef<SalesOrder>[] = [
    {
      accessorKey: "orderNumber",
      header: "Mã ĐH",
    },
    {
      accessorKey: "date",
      header: "Ngày Tạo",
      cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "customerName",
      header: "Khách Hàng",
      cell: ({ row }) => row.getValue("customerName") || "Khách lẻ",
    },
    {
      accessorKey: "totalAmount",
      header: "Tổng Tiền",
      cell: ({ row }) => `${Number(row.getValue("totalAmount")).toLocaleString('vi-VN')} đ`,
    },
    {
      accessorKey: "totalProfit",
      header: "Lợi Nhuận",
      cell: ({ row }) => {
        const profit = Number(row.getValue("totalProfit"));
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
             {row.original.status !== 'Đã hủy' && row.original.status !== 'Hoàn thành' && ( 
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

  const renderSalesOrderCard = (row: Row<SalesOrder>): React.ReactNode => {
    const order = row.original;
    const actionsCell = row.getVisibleCells().find(cell => cell.column.id === 'actions');
    const statusCell = row.getVisibleCells().find(cell => cell.column.id === 'status');

    return (
      <Card key={order.id} className="w-full">
        <CardHeader className="pb-3 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg mb-1">{order.orderNumber}</CardTitle>
            <CardDescription>
              {order.customerName || 'Khách lẻ'} - {format(parse(order.date, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi })}
            </CardDescription>
          </div>
           {actionsCell && (
            <div className="flex-shrink-0">
                 {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Tổng tiền:</span>
            <span>{Number(order.totalAmount).toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Lợi nhuận:</span>
            <span className={cn(order.totalProfit > 0 ? "text-green-600" : order.totalProfit < 0 ? "text-red-600" : "text-muted-foreground")}>
                {Number(order.totalProfit).toLocaleString('vi-VN')} đ
            </span>
          </div>
          {statusCell && (
             <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Trạng thái:</span>
              <div className="text-right">{flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };


  return (
    <>
      <PageHeader title="Quản Lý Đơn Hàng Bán" description="Tạo và theo dõi các đơn hàng bán ra.">
        <Button onClick={() => {
          form.reset({ 
              date: format(new Date(), 'yyyy-MM-dd'),
              customerName: '',
              items: [],
              status: 'Mới',
              notes: '',
          });
          setIsModalOpen(true);
        }}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Tạo Đơn Hàng
        </Button>
      </PageHeader>

      <FormModal<SalesOrderFormValues>
        title="Tạo Đơn Hàng Mới"
        description="Điền thông tin chi tiết cho đơn hàng."
        formId="add-sales-order-form"
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        {(closeModal) => (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-1" id="add-sales-order-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày Tạo Đơn</FormLabel>
                      <Popover open={isOrderDatePickerOpen} onOpenChange={setIsOrderDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className="w-full pl-3 text-left font-normal h-10">
                              {field.value ? format(parse(field.value, 'yyyy-MM-dd', new Date()), "PPP", { locale: vi }) : <span>Chọn ngày</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : undefined}
                            onSelect={(date) => {
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                setIsOrderDatePickerOpen(false); // Close popover after selection
                              }
                            }
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
                      <FormControl><Input placeholder="Nhập tên khách hàng" {...field} className="h-10" /></FormControl>
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
                  {fields.map((itemField, index) => {
                    const currentItem = watchedItems[index];
                    const selectedProduct = products.find(p => p.id === currentItem?.productId);
                    const stock = selectedProduct ? getProductStock(selectedProduct.id) : 0;
                    const currentQuantityNum = Number(currentItem?.quantity) || 0;

                    return (
                      <div key={itemField.fieldId} className="p-3 border rounded-md space-y-3 bg-muted/30">
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
                                    {products.map(p => {
                                      const productStock = getProductStock(p.id);
                                      const isCurrentlySelectedInThisRow = itemField.productId === p.id;
                                      const isSelectedInAnotherRow = watchedItems.some(
                                        (otherItem, otherIndex) => otherIndex !== index && otherItem.productId === p.id
                                      );
                                      
                                      return (
                                        <SelectItem 
                                          key={p.id} 
                                          value={p.id} 
                                          disabled={(productStock <= 0 && !isCurrentlySelectedInThisRow) || (isSelectedInAnotherRow && !isCurrentlySelectedInThisRow)}
                                        >
                                          {p.name} (Tồn: {productStock})
                                        </SelectItem>
                                      );
                                    })}
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
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => adjustItemQuantityWithButtons(index, -1)}
                                    disabled={!selectedProduct || currentQuantityNum <= 1}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                  <FormControl>
                                  <Input
                                    type="text" 
                                    inputMode="numeric" 
                                    pattern="[0-9]*"
                                    placeholder="1"
                                    {...quantityField} 
                                    value={quantityField.value === 0 && !product ? "" : quantityField.value} 
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) { 
                                        handleItemQuantityChange(index, val);
                                      }
                                    }}
                                    onBlur={() => handleItemQuantityBlur(index)}
                                    className="w-16 text-center h-9"
                                    disabled={!selectedProduct}
                                  />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => adjustItemQuantityWithButtons(index, 1)}
                                    disabled={!selectedProduct || (selectedProduct && currentQuantityNum >= stock)}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                </div>
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
                                    value={priceField.value || ''}
                                    onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)} 
                                    disabled={!selectedProduct}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-1">
                            <FormLabel>Thành Tiền</FormLabel>
                            <p className="font-semibold text-sm h-10 flex items-center">
                              {( (Number(currentItem?.quantity) || 0) * (Number(currentItem?.unitPrice) || 0) ).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive self-end md:ml-auto">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => append({ tempId: Date.now().toString(), productId: '', productName: '', quantity: 1, unitPrice: 0, costPrice: 0 })}
                    disabled={products.filter(p => getProductStock(p.id) > 0 && !watchedItems.some(item => item.productId === p.id)).length === 0}
                  >
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
                <Button type="button" variant="outline" onClick={() => {form.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], status: 'Mới', notes: '' }); closeModal();}}>Hủy</Button>
                <Button 
                  type="submit" 
                  disabled={
                    isSubmittingOrder || 
                    isDataContextLoading || 
                    fields.length === 0 || 
                    fields.some(f => !f.productId || !(Number(f.quantity) > 0))
                  }
                >
                  {isSubmittingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu Đơn Hàng
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
            data={salesOrders} 
            filterColumn="orderNumber" 
            filterPlaceholder="Lọc theo mã ĐH..."
            renderCardRow={renderSalesOrderCard}
          />
        </CardContent>
      </Card>
      
      <SalesOrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </>
  );
}
