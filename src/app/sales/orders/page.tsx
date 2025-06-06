
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel as ShadcnFormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse, isWithinInterval, startOfDay, endOfDay, isValid as isValidDate, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Trash2, ShoppingCart, Edit3, MoreHorizontal, Eye, Loader2, MinusCircle, CalendarIcon, FilterX, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { SearchableProductSelect } from '@/components/common/SearchableProductSelect';


type SalesOrderFormValues = {
  customerName?: string;
  date: string;
  items: Array<Omit<OrderItemType, 'id' | 'totalPrice' | 'costPrice'> & { costPrice?: number, tempId?: string }>; // tempId is optional
  status: SalesOrderStatus;
  notes?: string;
};


export default function SalesOrdersPage() {
  const { salesOrders, products, addSalesOrder, updateSalesOrderStatus, isLoading: isDataContextLoading, getProductStock } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [filterFromDate, setFilterFromDate] = useState<Date | undefined>(undefined);
  const [filterToDate, setFilterToDate] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<SalesOrderStatus | 'all'>('all');

  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setIsToDatePickerOpen] = useState(false);

  const productSelectRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const newlyAddedItemIndexRef = useRef<number | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement>(null);


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

  useEffect(() => {
    productSelectRefs.current = productSelectRefs.current.slice(0, fields.length);
  }, [fields.length]);

  useEffect(() => {
    if (newlyAddedItemIndexRef.current !== null) {
      const indexToFocus = newlyAddedItemIndexRef.current;
      setTimeout(() => {
        if (productSelectRefs.current && productSelectRefs.current[indexToFocus]) {
          productSelectRefs.current[indexToFocus]?.focus();
        }
        newlyAddedItemIndexRef.current = null; 
      }, 0);
    }
  }, [fields]); 

  // Focus on customer name when modal opens for new order
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => { // Timeout to ensure input is rendered and visible
        customerNameInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);


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

  const handleProductChange = (itemIndex: number, productId: string | undefined) => {
    if (!productId) {
      update(itemIndex, {
        ...watchedItems[itemIndex],
        productId: '',
        productName: '',
        unitPrice: 0,
        costPrice: 0,
        quantity: 1,
      });
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product) {
      update(itemIndex, {
        ...watchedItems[itemIndex],
        productId: product.id,
        productName: product.name,
        unitPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0,
        quantity: watchedItems[itemIndex]?.quantity || 1,
      });
    }
  };

 const handleItemQuantityChange = (itemIndex: number, newQuantityValue: number | string) => {
    const currentItem = watchedItems[itemIndex];
    const product = products.find(p => p.id === currentItem?.productId);

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
        const availableStock = product.currentStock;
        if (numQuantity > availableStock) {
            toast({
                title: "Số lượng vượt tồn kho",
                description: `Sản phẩm ${product.name} chỉ còn ${availableStock}. Đã điều chỉnh số lượng.`,
                variant: "default",
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
        if (product && product.currentStock > 0) {
            currentQuantity = 1;
        } else {
            currentQuantity = 0;
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
        const availableStock = product.currentStock;
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

  const handleAddNewItemAndFocus = () => {
    const newIndex = fields.length;
    append({ productId: '', productName: '', quantity: 1, unitPrice: 0, costPrice: 0 });
    newlyAddedItemIndexRef.current = newIndex;
  };


  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(order => {
      let isDateMatch = true;
      const orderDate = parse(order.date, 'yyyy-MM-dd', new Date());

      if (filterFromDate && filterToDate) {
        isDateMatch = isWithinInterval(orderDate, { start: startOfDay(filterFromDate), end: endOfDay(filterToDate) });
      } else if (filterFromDate) {
        isDateMatch = orderDate >= startOfDay(filterFromDate);
      } else if (filterToDate) {
        isDateMatch = orderDate <= endOfDay(filterToDate);
      }

      const isStatusMatch = filterStatus === 'all' || order.status === filterStatus;

      return isDateMatch && isStatusMatch;
    });
  }, [salesOrders, filterFromDate, filterToDate, filterStatus]);

  const resetFilters = () => {
    setFilterFromDate(undefined);
    setFilterToDate(undefined);
    setFilterStatus('all');
  };

  const filteredStats = useMemo(() => {
    const revenue = filteredSalesOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const cogs = filteredSalesOrders.reduce((sum, order) => sum + order.totalCost, 0);
    const profit = filteredSalesOrders.reduce((sum, order) => sum + order.totalProfit, 0);
    return { revenue, cogs, profit };
  }, [filteredSalesOrders]);

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
          newlyAddedItemIndexRef.current = null; 
          setIsModalOpen(true);
        }}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Tạo Đơn Hàng
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bộ Lọc Đơn Hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="filter-from-date">Từ ngày</Label>
              <Popover open={isFromDatePickerOpen} onOpenChange={setIsFromDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-from-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !filterFromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterFromDate ? format(filterFromDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterFromDate}
                    onSelect={(date) => {
                        setFilterFromDate(date);
                        setIsFromDatePickerOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => filterToDate ? date > filterToDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="filter-to-date">Đến ngày</Label>
              <Popover open={isToDatePickerOpen} onOpenChange={setIsToDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="filter-to-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !filterToDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterToDate ? format(filterToDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterToDate}
                    onSelect={(date) => {
                        setFilterToDate(date);
                        setIsToDatePickerOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => filterFromDate ? date < filterFromDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="filter-status">Trạng thái</Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as SalesOrderStatus | 'all')}>
                <SelectTrigger id="filter-status" className="w-full h-10">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {SALES_ORDER_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={resetFilters} disabled={!filterFromDate && !filterToDate && filterStatus === 'all'}>
              <FilterX className="mr-2 h-4 w-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {(filterFromDate || filterToDate || filterStatus !== 'all') && filteredSalesOrders.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Doanh Thu (lọc)</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredStats.revenue.toLocaleString('vi-VN')} đ</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Giá Vốn (lọc)</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredStats.cogs.toLocaleString('vi-VN')} đ</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Lợi Nhuận (lọc)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${filteredStats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {filteredStats.profit.toLocaleString('vi-VN')} đ
                </div>
              </CardContent>
            </Card>
        </div>
      )}


      <FormModal<SalesOrderFormValues>
        title="Tạo Đơn Hàng Mới"
        description="Điền thông tin chi tiết cho đơn hàng."
        formId="add-sales-order-form"
        open={isModalOpen}
        onOpenChange={(isOpen) => {
          setIsModalOpen(isOpen);
          if (!isOpen) {
            newlyAddedItemIndexRef.current = null; 
          }
        }}
      >
        {(closeModal) => (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-4" id="add-sales-order-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Ngày Tạo Đơn</ShadcnFormLabel>
                        <FormControl>
                           <Input type="date" {...field} className="h-10 pr-2"/>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Tên Khách Hàng (tùy chọn)</ShadcnFormLabel>
                      <FormControl>
                        <Input 
                          ref={customerNameInputRef}
                          placeholder="Nhập tên khách hàng" 
                          {...field} 
                          className="h-10" 
                        />
                      </FormControl>
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
                    const stock = selectedProduct ? selectedProduct.currentStock : 0;
                    const currentQuantityNum = Number(currentItem?.quantity) || 0;

                    return (
                      <div key={itemField.fieldId} className="p-3 border rounded-md space-y-3 bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <ShadcnFormLabel>Sản Phẩm</ShadcnFormLabel>
                                <FormControl>
                                  <SearchableProductSelect
                                    ref={(el) => {
                                      if (productSelectRefs.current) productSelectRefs.current[index] = el;
                                    }}
                                    products={products}
                                    selectedProductId={field.value}
                                    onProductSelect={(productId) => {
                                      field.onChange(productId);
                                      handleProductChange(index, productId);
                                    }}
                                    disabledProductIds={
                                      watchedItems
                                        .filter((_, i) => i !== index)
                                        .map(item => item.productId)
                                        .filter(id => !!id) as string[]
                                    }
                                    placeholder="Chọn hoặc tìm sản phẩm"
                                    disabled={isDataContextLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: quantityField }) => (
                              <FormItem>
                                <ShadcnFormLabel>Số Lượng</ShadcnFormLabel>
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
                                    value={quantityField.value === 0 && !selectedProduct ? "" : quantityField.value}
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
                        
                        <div className="space-y-3 md:grid md:grid-cols-7 md:gap-x-3 md:gap-y-0 md:items-end">
                           <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field: priceField }) => (
                              <FormItem className="md:col-span-3">
                                <ShadcnFormLabel>Đơn Giá</ShadcnFormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    {...priceField}
                                    value={priceField.value || ''}
                                    onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)}
                                    disabled={!selectedProduct}
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-3">
                            <ShadcnFormLabel>Thành Tiền</ShadcnFormLabel>
                            <p className="font-semibold text-sm h-10 flex items-center">
                              {( (Number(currentItem?.quantity) || 0) * (Number(currentItem?.unitPrice) || 0) ).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                          <div className="flex justify-end md:col-span-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive self-center md:self-end">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNewItemAndFocus}
                    disabled={products.filter(p => p.currentStock > 0 && !watchedItems.some(item => item.productId === p.id)).length === 0}
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
                    <ShadcnFormLabel>Trạng Thái Đơn Hàng</ShadcnFormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger></FormControl>
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
                    <ShadcnFormLabel>Ghi Chú (tùy chọn)</ShadcnFormLabel>
                    <FormControl><Textarea placeholder="Thông tin thêm về đơn hàng..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="outline" onClick={() => {form.reset({ date: format(new Date(), 'yyyy-MM-dd'), customerName: '', items: [], status: 'Mới', notes: '' }); newlyAddedItemIndexRef.current = null; closeModal();}}>Hủy</Button>
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
            data={filteredSalesOrders}
            filterColumn="orderNumber"
            filterPlaceholder="Lọc theo mã ĐH, khách hàng..."
            renderCardRow={renderSalesOrderCard}
          />
        </CardContent>
      </Card>

      <SalesOrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
    </>
  );
}

