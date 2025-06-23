
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSchema } from '@/lib/schemas';
import type { Product, ProductUnit, ProductFormValues as ProductFormValuesType } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; 
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import type { ColumnDef, VisibilityState, Row } from '@tanstack/react-table';
import { flexRender } from "@tanstack/react-table";
import { PlusCircle, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FilterX, Loader2, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks';
import { PRODUCT_UNITS } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from "@/components/ui/slider";
import { useAuth } from '@/contexts/AuthContext';

type ProductFormValues = ProductFormValuesType;

const formatNumericForDisplayLocal = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && (isNaN(value) || value === 0))) {
    return ''; 
  }
  const numStr = String(value).replace(/\./g, ''); 
  const num = parseFloat(numStr);
  if (isNaN(num)) {
    return String(value); 
  }
  return num.toLocaleString('vi-VN');
};

const parseNumericFromDisplayLocal = (displayValue: string): string => {
  const cleaned = String(displayValue).replace(/\./g, ''); 
  if (/^\d*$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/[^\d]/g, ''); 
};

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
  const { currentUser } = useAuth();
  
  // State for modal editing (add/edit via modal)
  const [editingProductModal, setEditingProductModal] = useState<Product | null>(null);
  const [openedEditModalId, setOpenedEditModalId] = useState<string | null>(null);
  
  // State for inline editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  const isMobile = useIsMobile();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const inlineFormMethods = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema.omit({ imageUrl: true })), // initialStock is part of schema and form values
  });

  const { minSellingPrice, maxSellingPrice } = useMemo(() => {
    const sellingPrices = products
      .map(p => p.sellingPrice)
      .filter(price => typeof price === 'number' && price >= 0) as number[];
    if (sellingPrices.length === 0) return { minSellingPrice: 0, maxSellingPrice: 1000000 };
    let min = Math.min(...sellingPrices);
    let max = Math.max(...sellingPrices);
    if (min === max) {
      const basePrice = min; 
      const offset = basePrice > 100000 ? basePrice * 0.2 : 50000; 
      return { minSellingPrice: Math.max(0, basePrice - offset), maxSellingPrice: basePrice + offset };
    }
    return { minSellingPrice: min, maxSellingPrice: max };
  }, [products]);

  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    setPriceRange([minSellingPrice, maxSellingPrice]);
  }, [minSellingPrice, maxSellingPrice]);

  const displayedProducts = useMemo(() => {
    if (!priceRange) return products; 
    return products.filter(product => {
      if (product.sellingPrice === undefined) return true; 
      return product.sellingPrice >= priceRange[0] && product.sellingPrice <= priceRange[1];
    });
  }, [products, priceRange]);

  useEffect(() => {
    if (isMobile) {
      setColumnVisibility({ sku: false, costPrice: false, sellingPrice: false, minStockLevel: false });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile]);

  const handleModalFormSubmit = async (values: ProductFormValues, productBeingEdited: Product | null, closeModalFn: () => void) => {
    const costPrice = values.costPrice === '' || values.costPrice === undefined ? undefined : Number(values.costPrice);
    const sellingPrice = values.sellingPrice === '' || values.sellingPrice === undefined ? undefined : Number(values.sellingPrice);
    const minStockLevel = values.minStockLevel === '' || values.minStockLevel === undefined ? undefined : Number(values.minStockLevel);
    const initialStock = values.initialStock === undefined ? 0 : Number(values.initialStock);

    const processedValues = { ...values, costPrice, sellingPrice, minStockLevel, initialStock };
    
    if (productBeingEdited) {
      await updateProduct({ ...productBeingEdited, ...processedValues, currentStock: getProductStock(productBeingEdited.id) });
      toast({ title: "Thành công!", description: "Đã cập nhật sản phẩm." });
    } else {
      await addProduct(processedValues);
      toast({ title: "Thành công!", description: "Đã thêm sản phẩm mới." });
    }
    setEditingProductModal(null); 
    closeModalFn();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: "Đã xóa", description: "Đã xóa sản phẩm.", variant: "destructive" });
  };

  // --- Inline Editing Handlers ---
  const startEditingRow = useCallback((product: Product) => {
    if (currentUser?.role !== 'admin') return;
    if (editingRowId === product.id) return; // Already editing this row
    if (editingRowId && editingRowId !== product.id) {
      // If another row is being edited, prompt to save/cancel or auto-cancel
      toast({ title: "Thông báo", description: "Vui lòng Lưu hoặc Hủy thay đổi ở dòng hiện tại trước.", variant: "default" });
      return;
    }

    const formData: ProductFormValues = {
      name: product.name,
      sku: product.sku || '',
      unit: product.unit,
      costPrice: product.costPrice === undefined || product.costPrice === null ? '' : product.costPrice,
      sellingPrice: product.sellingPrice === undefined || product.sellingPrice === null ? '' : product.sellingPrice,
      minStockLevel: product.minStockLevel === undefined || product.minStockLevel === null ? '' : product.minStockLevel,
      initialStock: product.initialStock, // For form state, not editable inline
      imageUrl: product.imageUrl || '', // For form state, not editable inline
    };
    setEditingRowId(product.id);
    inlineFormMethods.reset(formData);
  }, [editingRowId, inlineFormMethods, toast, currentUser?.role]);

  const onSaveInlineEdit = async (data: ProductFormValues) => {
    if (!editingRowId) return;
    setIsSubmittingInline(true);

    const originalProduct = products.find(p => p.id === editingRowId);
    if (!originalProduct) {
      toast({ title: "Lỗi", description: "Không tìm thấy sản phẩm gốc.", variant: "destructive" });
      setEditingRowId(null);
      setIsSubmittingInline(false);
      return;
    }

    const costPriceFinal = data.costPrice === '' || data.costPrice === undefined || data.costPrice === null ? undefined : Number(String(data.costPrice).replace(/\./g, ''));
    const sellingPriceFinal = data.sellingPrice === '' || data.sellingPrice === undefined || data.sellingPrice === null ? undefined : Number(String(data.sellingPrice).replace(/\./g, ''));
    const minStockLevelFinal = data.minStockLevel === '' || data.minStockLevel === undefined || data.minStockLevel === null ? undefined : Number(String(data.minStockLevel).replace(/\./g, ''));

    const productToUpdate: Product = {
      id: editingRowId,
      name: data.name,
      sku: data.sku || undefined,
      unit: data.unit,
      costPrice: costPriceFinal,
      sellingPrice: sellingPriceFinal,
      minStockLevel: minStockLevelFinal,
      initialStock: originalProduct.initialStock,
      currentStock: originalProduct.currentStock, 
      imageUrl: originalProduct.imageUrl,
    };
    
    await updateProduct(productToUpdate);
    toast({ title: "Thành công!", description: "Đã cập nhật sản phẩm." });
    setEditingRowId(null);
    setIsSubmittingInline(false);
    inlineFormMethods.reset();
  };

  const onCancelInlineEdit = () => {
    setEditingRowId(null);
    inlineFormMethods.reset(); // Clear form
  };

  const columns: ColumnDef<Product>[] = [
    { 
      accessorKey: "name", 
      header: ({ column }) => <SortableHeader column={column} title="Tên Sản Phẩm" />,
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
          return (
            <FormField
              control={inlineFormMethods.control}
              name="name"
              render={({ field }) => <Input {...field} autoFocus className="h-8 text-sm" />}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.name}</div>;
      }
    },
    { 
      accessorKey: "sku", 
      header: ({ column }) => <SortableHeader column={column} title="SKU" />,
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
          return (
            <FormField
              control={inlineFormMethods.control}
              name="sku"
              render={({ field }) => <Input {...field} className="h-8 text-sm" />}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.sku || 'N/A'}</div>;
      },
      enableHiding: true,
    },
    { 
      accessorKey: "unit", 
      header: "Đơn Vị",
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
          return (
            <FormField
              control={inlineFormMethods.control}
              name="unit"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Chọn ĐVT" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.unit}</div>;
      }
    },
    { 
      accessorKey: "costPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Vốn" />,
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
          return (
            <FormField
              control={inlineFormMethods.control}
              name="costPrice"
              render={({ field }) => (
                <Input 
                  type="text" 
                  inputMode="decimal"
                  className="h-8 text-sm" 
                  {...field}
                  value={formatNumericForDisplayLocal(field.value)}
                  onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))}
                />
              )}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.costPrice !== undefined ? row.original.costPrice.toLocaleString('vi-VN') + ' đ' : 'N/A'}</div>;
      },
      enableHiding: true,
    },
    { 
      accessorKey: "sellingPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Bán" />,
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
          return (
             <FormField
              control={inlineFormMethods.control}
              name="sellingPrice"
              render={({ field }) => (
                <Input 
                  type="text" 
                  inputMode="decimal"
                  className="h-8 text-sm" 
                  {...field}
                  value={formatNumericForDisplayLocal(field.value)}
                  onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))}
                />
              )}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.sellingPrice !== undefined ? row.original.sellingPrice.toLocaleString('vi-VN') + ' đ' : 'N/A'}</div>;
      },
      enableHiding: true,
    },
    { 
      accessorKey: "currentStock", 
      header: ({ column }) => <SortableHeader column={column} title="Tồn Kho" />,
      cell: ({ row }) => {
        const product = row.original;
        const isLowStock = product.minStockLevel !== undefined && product.currentStock > 0 && product.currentStock <= product.minStockLevel;
        const isOutOfStock = product.currentStock === 0;
        return (
          <span className={cn( isLowStock && "text-destructive font-semibold", isOutOfStock && "text-yellow-600 font-semibold" )}>
            {product.currentStock}
          </span>
        );
      } // Not editable
    },
    { 
      accessorKey: "minStockLevel", 
      header: ({ column }) => <SortableHeader column={column} title="Tồn Tối Thiểu" />,
      cell: ({ row }) => {
        const isEditing = editingRowId === row.original.id;
        if (isEditing) {
           return (
             <FormField
              control={inlineFormMethods.control}
              name="minStockLevel"
              render={({ field }) => (
                <Input 
                  type="text" 
                  inputMode="numeric"
                  className="h-8 text-sm" 
                  {...field}
                  value={formatNumericForDisplayLocal(field.value)} // Use local formatter for simple number input
                  onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))}
                />
              )}
            />
          );
        }
        return <div onDoubleClick={() => startEditingRow(row.original)} className={cn("min-h-[32px] flex items-center p-1 -m-1", currentUser?.role === 'admin' && "cursor-pointer")}>{row.original.minStockLevel ?? 'N/A'}</div>;
      },
      enableHiding: true,
    },
    {
      id: "status",
      header: "Trạng Thái",
      cell: ({ row }) => { // Not editable
        const product = row.original;
        if (product.currentStock === 0) return <span className="text-yellow-600 font-semibold px-2 py-1 rounded-md bg-yellow-500/10 text-xs sm:text-sm">Hết hàng</span>;
        if (product.minStockLevel !== undefined && product.currentStock <= product.minStockLevel) return <span className="text-destructive font-semibold px-2 py-1 rounded-md bg-destructive/10 text-xs sm:text-sm">Sắp hết</span>;
        return <span className="text-green-600 font-semibold px-2 py-1 rounded-md bg-green-500/10 text-xs sm:text-sm">Còn hàng</span>;
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        if (currentUser?.role !== 'admin') {
          return null; // No actions for non-admins
        }
        const isEditingThisRow = editingRowId === row.original.id;
        if (isEditingThisRow) {
          return (
            <div className="flex gap-1">
              <Button type="submit" variant="ghost" size="icon" disabled={isSubmittingInline} title="Lưu">
                {isSubmittingInline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onCancelInlineEdit} disabled={isSubmittingInline} title="Hủy">
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => startEditingRow(row.original)} title="Sửa dòng này">
              <Edit2 className="h-4 w-4" />
            </Button>
            <DeleteConfirmDialog 
              onConfirm={() => handleDelete(row.original.id)}
              itemName={`sản phẩm "${row.original.name}"`}
            />
          </div>
        );
      },
    },
  ];

  const renderProductCard = (row: Row<Product>): React.ReactNode => {
    const product = row.original;
    const statusCell = columns.find(col => col.id === 'status')?.cell;
    const stockCell = columns.find(col => col.accessorKey === 'currentStock')?.cell;
  
    return (
      <Card key={product.id} className="w-full">
        <CardHeader className="pb-3 flex flex-row items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="text-lg mb-1">{product.name}</CardTitle>
            <CardDescription>
              {product.sku ? `SKU: ${product.sku}` : ''}
              {product.sku && product.unit ? ' - ' : ''}
              {product.unit && `ĐVT: ${product.unit}`}
              {!product.sku && !product.unit && <span className="italic">Không có SKU/ĐVT</span>}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          {stockCell && typeof stockCell === 'function' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Tồn kho:</span>
              <span>{flexRender(stockCell, { row } as any)}</span>
            </div>
          )}
          {statusCell && typeof statusCell === 'function' && (
             <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Trạng thái:</span>
              <div className="text-right">{flexRender(statusCell, { row } as any)}</div>
            </div>
          )}
          {product.sellingPrice !== undefined && ( <div className="flex justify-between"> <span className="text-muted-foreground font-medium">Giá bán:</span> <span>{product.sellingPrice.toLocaleString('vi-VN')} đ</span> </div> )}
          {product.costPrice !== undefined && ( <div className="flex justify-between"> <span className="text-muted-foreground font-medium">Giá vốn:</span> <span>{product.costPrice.toLocaleString('vi-VN')} đ</span> </div> )}
          {product.minStockLevel !== undefined && ( <div className="flex justify-between"> <span className="text-muted-foreground font-medium">Tồn tối thiểu:</span> <span>{product.minStockLevel}</span> </div> )}
        </CardContent>
        {currentUser?.role === 'admin' && (
          <CardFooter className="flex justify-end pt-4">
            <Button variant="outline" size="sm" onClick={() => {
              setEditingProductModal(row.original);
              setOpenedEditModalId(row.original.id);
            }}>
              <Edit2 className="h-3 w-3 mr-1" /> Sửa
            </Button>
              <FormModal<ProductFormValues> // This modal is for mobile view, if "Sửa" on card is clicked
                title="Chỉnh Sửa Sản Phẩm"
                formId={`product-form-edit-modal-${row.original.id}`}
                open={openedEditModalId === row.original.id && editingProductModal?.id === row.original.id}
                onOpenChange={(modalIsOpen) => {
                  if (!modalIsOpen) {
                    setOpenedEditModalId(null);
                    setEditingProductModal(null); 
                  }
                }}
              >
              {(closeModal) => (
                  <ProductFormContent
                    key={`modal-edit-form-${row.original.id}`}
                    editingProductFull={row.original} // Pass the full product for modal editing
                    onSubmit={(formValues) => handleModalFormSubmit(formValues, row.original, closeModal)}
                    closeModalSignal={closeModal}
                    isEditing={true}
                    formHtmlId={`product-form-edit-modal-${row.original.id}`}
                  />
                )}
            </FormModal>
            <DeleteConfirmDialog 
              onConfirm={() => handleDelete(row.original.id)}
              itemName={`sản phẩm "${row.original.name}"`}
              triggerButton={<Button variant="ghost" size="sm" className="text-destructive ml-2"><Trash2 className="h-3 w-3 mr-1"/> Xóa</Button>}
            />
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Quản Lý Sản Phẩm" description="Thêm mới, chỉnh sửa và xem danh sách sản phẩm của bạn.">
        {currentUser?.role === 'admin' && (
          <FormModal<ProductFormValues>
            title="Thêm Sản Phẩm Mới"
            description="Điền thông tin chi tiết về sản phẩm."
            formId="product-form-main-new-modal"
            key="add-new-product-modal-main" 
            triggerButton={<Button><PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm</Button>}
            onOpenChange={(isOpen) => { if (isOpen) { setEditingProductModal(null); setOpenedEditModalId(null); } }}
          >
            {(closeModal) => (
              <ProductFormContent
                key={"new-product-form-content-main-modal"} 
                editingProductFull={null}
                onSubmit={(formValues) => handleModalFormSubmit(formValues, null, closeModal)}
                closeModalSignal={closeModal}
                isEditing={false}
                formHtmlId="product-form-main-new-modal"
              />
            )}
          </FormModal>
        )}
      </PageHeader>
      <Form {...inlineFormMethods}> {/* FormProvider for inline editing */}
        <form onSubmit={inlineFormMethods.handleSubmit(onSaveInlineEdit)}>
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6">
                {priceRange ? (
                  <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-card">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                      <Label htmlFor="price-range-slider" className="text-base font-semibold mb-2 sm:mb-0">Lọc theo giá bán:</Label>
                      <Button variant="ghost" size="sm" onClick={() => setPriceRange([minSellingPrice, maxSellingPrice])}
                        disabled={(priceRange[0] === minSellingPrice && priceRange[1] === maxSellingPrice) || products.length === 0 || minSellingPrice >= maxSellingPrice }
                        title="Xóa bộ lọc giá" className="text-xs">
                        <FilterX className="h-4 w-4 mr-1" /> Xóa Lọc
                      </Button>
                    </div>
                    <Slider id="price-range-slider" min={minSellingPrice} max={maxSellingPrice}
                      step={Math.max(1, Math.floor((maxSellingPrice - minSellingPrice) / 100) || 1)}
                      value={priceRange}
                      onValueChange={(newRange) => { if (Array.isArray(newRange) && newRange.length === 2) { setPriceRange(newRange as [number, number]); } }}
                      className="w-full" disabled={products.length === 0 || minSellingPrice >= maxSellingPrice} />
                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                      <span>Từ: {priceRange[0].toLocaleString('vi-VN')} đ</span>
                      <span>Đến: {priceRange[1].toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                ) : ( <div className="space-y-3 p-4 border rounded-lg"> <Label className="text-base font-semibold">Lọc theo giá bán:</Label> <Skeleton className="h-5 w-full" /> <div className="flex justify-between items-center text-xs"> <Skeleton className="h-4 w-1/3" /> <Skeleton className="h-4 w-1/3" /> </div> <Skeleton className="h-8 w-24 mt-1" /> </div> )}
              </div>

              <DataTable 
                columns={columns} 
                data={displayedProducts} 
                filterColumn="name" 
                filterPlaceholder="Lọc theo tên sản phẩm..."
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                renderCardRow={renderProductCard} // For mobile, no inline editing on cards. Edit via modal.
              />
            </CardContent>
          </Card>
        </form>
      </Form>
       {/* Modal for editing when "Sửa" is clicked on a mobile card */}
        {editingProductModal && openedEditModalId === editingProductModal.id && (
            <FormModal<ProductFormValues>
              title="Chỉnh Sửa Sản Phẩm (Modal)"
              formId={`product-form-edit-modal-explicit-${editingProductModal.id}`}
              open={!!editingProductModal && openedEditModalId === editingProductModal.id}
              onOpenChange={(modalIsOpen) => {
                if (!modalIsOpen) {
                  setOpenedEditModalId(null);
                  setEditingProductModal(null);
                }
              }}
            >
            {(closeModal) => (
                <ProductFormContent
                  key={`modal-edit-form-content-${editingProductModal.id}`}
                  editingProductFull={editingProductModal}
                  onSubmit={(formValues) => handleModalFormSubmit(formValues, editingProductModal, closeModal)}
                  closeModalSignal={closeModal}
                  isEditing={true}
                  formHtmlId={`product-form-edit-modal-explicit-${editingProductModal.id}`}
                />
              )}
          </FormModal>
        )}
    </>
  );
}

// This component is now only for the MODAL form. Inline form is directly in `cell` renderers.
interface ProductFormContentProps {
    editingProductFull: Product | null; // Full Product type for initial data
    onSubmit: (values: ProductFormValues) => Promise<void>;
    closeModalSignal: () => void;
    isEditing: boolean;
    formHtmlId: string;
}

function ProductFormContent({ editingProductFull, onSubmit, closeModalSignal, isEditing, formHtmlId }: ProductFormContentProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const getInitialFormValues = useCallback((): ProductFormValues => {
        return editingProductFull ? {
            name: editingProductFull.name,
            sku: editingProductFull.sku || '',
            unit: editingProductFull.unit,
            costPrice: editingProductFull.costPrice === undefined || editingProductFull.costPrice === null ? '' : editingProductFull.costPrice,
            sellingPrice: editingProductFull.sellingPrice === undefined || editingProductFull.sellingPrice === null ? '' : editingProductFull.sellingPrice,
            minStockLevel: editingProductFull.minStockLevel === undefined || editingProductFull.minStockLevel === null ? '' : editingProductFull.minStockLevel,
            initialStock: editingProductFull.initialStock,
            imageUrl: editingProductFull.imageUrl || '',
        } : {
            name: '', sku: '', unit: PRODUCT_UNITS[0], costPrice: '', sellingPrice: '', minStockLevel: '', initialStock: 0, imageUrl: '',
        };
    }, [editingProductFull]);

    const modalFormMethods = useForm<ProductFormValues>({
        resolver: zodResolver(ProductSchema.omit({ imageUrl: true })), // Keep imageUrl optional for modal
        defaultValues: getInitialFormValues(), 
    });
    
    useEffect(() => {
        modalFormMethods.reset(getInitialFormValues());
    }, [editingProductFull, getInitialFormValues, modalFormMethods]);

    const handleInternalSubmit = async (data: ProductFormValues) => {
        setIsSubmitting(true);
        await onSubmit(data); // This calls handleModalFormSubmit
        setIsSubmitting(false);
    };
    
    return (
        <Form {...modalFormMethods}> 
            <form onSubmit={modalFormMethods.handleSubmit(handleInternalSubmit)} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto p-1" id={formHtmlId}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={modalFormMethods.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Tên Sản Phẩm</FormLabel><FormControl><Input placeholder="VD: Sách Kỹ Năng A" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={modalFormMethods.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>Mã SKU (tùy chọn)</FormLabel><FormControl><Input placeholder="VD: SP001" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={modalFormMethods.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>Đơn Vị Tính</FormLabel> <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger></FormControl> <SelectContent>{PRODUCT_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent> </Select><FormMessage /> </FormItem> )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={modalFormMethods.control} name="costPrice" render={({ field }) => ( <FormItem><FormLabel>Giá Vốn (tùy chọn)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="0" {...field} value={formatNumericForDisplayLocal(field.value)} onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={modalFormMethods.control} name="sellingPrice" render={({ field }) => ( <FormItem><FormLabel>Giá Bán (tùy chọn)</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="0" {...field} value={formatNumericForDisplayLocal(field.value)} onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={modalFormMethods.control} name="initialStock" render={({ field }) => ( <FormItem> <FormLabel>Tồn Kho Ban Đầu</FormLabel> <FormControl><Input type="text" inputMode="numeric" placeholder="0" {...field} value={formatNumericForDisplayLocal(field.value)} disabled={isEditing} onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))} /></FormControl> {isEditing && <p className="text-xs text-muted-foreground">Không thể sửa tồn kho ban đầu. Sử dụng Nhập/Xuất kho để điều chỉnh.</p>} <FormMessage /> </FormItem> )} />
                    <FormField control={modalFormMethods.control} name="minStockLevel" render={({ field }) => ( <FormItem><FormLabel>Mức Tồn Kho Tối Thiểu (tùy chọn)</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="0" {...field} value={formatNumericForDisplayLocal(field.value)} onChange={e => field.onChange(parseNumericFromDisplayLocal(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { closeModalSignal(); }}>Hủy</Button>
                    <Button type="submit" disabled={isSubmitting}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu </Button>
                </div>
            </form>
        </Form>
    );
}

    

    