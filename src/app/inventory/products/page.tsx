
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSchema } from '@/lib/schemas';
import type { Product, ProductUnit, ProductFormValues as ProductFormValuesType } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button'; // Import buttonVariants
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; 
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import type { ColumnDef, VisibilityState, Row } from '@tanstack/react-table';
import { flexRender } from "@tanstack/react-table";
import { PlusCircle, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FilterX, Loader2, Upload } from 'lucide-react'; // Added Upload icon
import { useToast } from '@/hooks';
import { PRODUCT_UNITS } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from "@/components/ui/slider";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";


type ProductFormValues = ProductFormValuesType;

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
  const isMobile = useIsMobile();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { minSellingPrice, maxSellingPrice } = useMemo(() => {
    const sellingPrices = products
      .map(p => p.sellingPrice)
      .filter(price => typeof price === 'number' && price >= 0) as number[];

    if (sellingPrices.length === 0) {
      return { minSellingPrice: 0, maxSellingPrice: 1000000 }; 
    }

    let min = Math.min(...sellingPrices);
    let max = Math.max(...sellingPrices);

    if (min === max) {
      const basePrice = min; 
      const offset = basePrice > 100000 ? basePrice * 0.2 : 50000; 
      return { 
        minSellingPrice: Math.max(0, basePrice - offset), 
        maxSellingPrice: basePrice + offset 
      };
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
      setColumnVisibility({
        sku: false,
        costPrice: false,
        sellingPrice: false,
        minStockLevel: false,
        imageUrl: false, 
      });
    } else {
      setColumnVisibility({
         imageUrl: true, 
      });
    }
  }, [isMobile]);

  const handleProductFormSubmit = (values: ProductFormValues, productBeingEdited: Product | null, closeModalFn: () => void) => {
    const costPrice = values.costPrice === '' ? undefined : Number(values.costPrice);
    const sellingPrice = values.sellingPrice === '' ? undefined : Number(values.sellingPrice);
    const minStockLevel = values.minStockLevel === '' ? undefined : Number(values.minStockLevel);

    const processedValues = {
      ...values,
      costPrice,
      sellingPrice,
      minStockLevel,
    };
    
    if (productBeingEdited) {
      updateProduct({ ...productBeingEdited, ...processedValues, currentStock: getProductStock(productBeingEdited.id) });
      toast({ title: "Thành công!", description: "Đã cập nhật sản phẩm." });
    } else {
      addProduct(processedValues);
      toast({ title: "Thành công!", description: "Đã thêm sản phẩm mới." });
    }
    setEditingProduct(null);
    closeModalFn();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: "Đã xóa", description: "Đã xóa sản phẩm.", variant: "destructive" });
  };
  
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
      enableHiding: true,
    },
    { 
      accessorKey: "name", 
      header: ({ column }) => <SortableHeader column={column} title="Tên Sản Phẩm" />,
    },
    { 
      accessorKey: "sku", 
      header: ({ column }) => <SortableHeader column={column} title="SKU" />,
      cell: ({ row }) => row.original.sku || 'N/A',
      enableHiding: true,
    },
    { 
      accessorKey: "unit", 
      header: "Đơn Vị" 
    },
    { 
      accessorKey: "costPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Vốn" />,
      cell: ({ row }) => row.original.costPrice !== undefined ? row.original.costPrice.toLocaleString('vi-VN') + ' đ' : 'N/A',
      enableHiding: true,
    },
    { 
      accessorKey: "sellingPrice", 
      header: ({ column }) => <SortableHeader column={column} title="Giá Bán" />,
      cell: ({ row }) => row.original.sellingPrice !== undefined ? row.original.sellingPrice.toLocaleString('vi-VN') + ' đ' : 'N/A',
      enableHiding: true,
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
      cell: ({ row }) => row.original.minStockLevel ?? 'N/A',
      enableHiding: true,
    },
    {
      id: "status",
      header: "Trạng Thái",
      cell: ({ row }) => {
        const product = row.original;
        if (product.minStockLevel !== undefined && product.currentStock < product.minStockLevel) {
          return <span className="text-destructive font-semibold px-2 py-1 rounded-md bg-destructive/10 text-xs sm:text-sm">Sắp hết</span>;
        }
        if (product.currentStock === 0) {
          return <span className="text-yellow-600 font-semibold px-2 py-1 rounded-md bg-yellow-500/10 text-xs sm:text-sm">Hết hàng</span>;
        }
        return <span className="text-green-600 font-semibold px-2 py-1 rounded-md bg-green-500/10 text-xs sm:text-sm">Còn hàng</span>;
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
           <FormModal<ProductFormValues>
              title="Chỉnh Sửa Sản Phẩm"
              formId={`product-form-edit-${row.original.id}`}
              triggerButton={
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
              }
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setEditingProduct(row.original);
                } else {
                  if (editingProduct && editingProduct.id === row.original.id) {
                    setEditingProduct(null); 
                  }
                }
              }}
              defaultOpen={false} 
            >
            {(closeModal) => {
              const productForForm = editingProduct && editingProduct.id === row.original.id ? editingProduct : null;
              return (
                <ProductFormContent
                  key={productForForm ? `edit-form-${productForForm.id}` : `edit-form-noop-${row.original.id}`}
                  editingProductFull={productForForm}
                  onSubmit={(formValues) => handleProductFormSubmit(formValues, productForForm, closeModal)}
                  closeModalSignal={closeModal}
                  isEditing={!!productForForm}
                  formHtmlId={`product-form-edit-${row.original.id}`}
                />
              );
            }}
          </FormModal>
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`sản phẩm "${row.original.name}"`}
          />
        </div>
      ),
    },
  ];

  const renderProductCard = (row: Row<Product>): React.ReactNode => {
    const product = row.original;
    
    const actionsCell = row.getVisibleCells().find(cell => cell.column.id === 'actions');
    const statusCell = row.getVisibleCells().find(cell => cell.column.id === 'status');
    const stockCell = row.getVisibleCells().find(cell => cell.column.id === 'currentStock');
  
    return (
      <Card key={product.id} className="w-full">
        <CardHeader className="pb-3 flex flex-row items-start gap-4">
          {product.imageUrl ? (
             <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border">
              <Image src={product.imageUrl} alt={product.name} width={80} height={80} className="h-full w-full object-cover" data-ai-hint="product item" />
            </div>
          ) : (
             <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">N/A</div>
          )}
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
          {stockCell && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Tồn kho:</span>
              <span>{flexRender(stockCell.column.columnDef.cell, stockCell.getContext())}</span>
            </div>
          )}
          {statusCell && (
             <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Trạng thái:</span>
              <div className="text-right">{flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}</div>
            </div>
          )}
          {product.sellingPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Giá bán:</span>
              <span>{product.sellingPrice.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {product.costPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Giá vốn:</span>
              <span>{product.costPrice.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
           {product.minStockLevel !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Tồn tối thiểu:</span>
              <span>{product.minStockLevel}</span>
            </div>
          )}
        </CardContent>
        {actionsCell && (
          <CardFooter className="flex justify-end pt-4">
            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Quản Lý Sản Phẩm" description="Thêm mới, chỉnh sửa và xem danh sách sản phẩm của bạn.">
        <FormModal<ProductFormValues>
          title="Thêm Sản Phẩm Mới"
          description="Điền thông tin chi tiết về sản phẩm."
          formId="product-form-main-new"
          key="add-new-product-modal-main" 
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Sản Phẩm
            </Button>
          }
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setEditingProduct(null); 
            }
          }}
        >
          {(closeModal) => (
            <ProductFormContent
              key={"new-product-form-content-main"} 
              editingProductFull={null}
              onSubmit={(formValues) => handleProductFormSubmit(formValues, null, closeModal)}
              closeModalSignal={closeModal}
              isEditing={false}
              formHtmlId="product-form-main-new"
            />
          )}
        </FormModal>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            {priceRange ? (
              <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-card">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                  <Label htmlFor="price-range-slider" className="text-base font-semibold mb-2 sm:mb-0">Lọc theo giá bán:</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPriceRange([minSellingPrice, maxSellingPrice])}
                    disabled={(priceRange[0] === minSellingPrice && priceRange[1] === maxSellingPrice) || products.length === 0 || minSellingPrice >= maxSellingPrice }
                    title="Xóa bộ lọc giá"
                    className="text-xs"
                  >
                    <FilterX className="h-4 w-4 mr-1" />
                    Xóa Lọc
                  </Button>
                </div>
                <Slider
                  id="price-range-slider"
                  min={minSellingPrice}
                  max={maxSellingPrice}
                  step={Math.max(1, Math.floor((maxSellingPrice - minSellingPrice) / 100) || 1)}
                  value={priceRange}
                  onValueChange={(newRange) => {
                    if (Array.isArray(newRange) && newRange.length === 2) {
                       setPriceRange(newRange as [number, number]);
                    }
                  }}
                  className="w-full"
                  disabled={products.length === 0 || minSellingPrice >= maxSellingPrice}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>Từ: {priceRange[0].toLocaleString('vi-VN')} đ</span>
                  <span>Đến: {priceRange[1].toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg">
                <Label className="text-base font-semibold">Lọc theo giá bán:</Label>
                <Skeleton className="h-5 w-full" />
                <div className="flex justify-between items-center text-xs">
                   <Skeleton className="h-4 w-1/3" />
                   <Skeleton className="h-4 w-1/3" />
                </div>
                 <Skeleton className="h-8 w-24 mt-1" />
              </div>
            )}
          </div>

          <DataTable 
            columns={columns} 
            data={displayedProducts} 
            filterColumn="name" 
            filterPlaceholder="Lọc theo tên sản phẩm..."
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            renderCardRow={renderProductCard}
          />
        </CardContent>
      </Card>
    </>
  );
}

interface ProductFormContentProps {
    editingProductFull: Product | null;
    onSubmit: (values: ProductFormValues) => void;
    closeModalSignal: () => void;
    isEditing: boolean;
    formHtmlId: string;
}


function ProductFormContent({ editingProductFull, onSubmit, closeModalSignal, isEditing, formHtmlId }: ProductFormContentProps) {
    const { toast } = useToast();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(editingProductFull?.imageUrl || null);
    const fileInputId = useMemo(() => `file-upload-${formHtmlId}-${editingProductFull?.id || 'new'}`, [formHtmlId, editingProductFull?.id]);
    
    const getInitialFormValues = useCallback((): ProductFormValues => {
        const initialValues = editingProductFull ? {
            name: editingProductFull.name,
            sku: editingProductFull.sku || '',
            unit: editingProductFull.unit,
            costPrice: editingProductFull.costPrice === undefined ? '' : editingProductFull.costPrice,
            sellingPrice: editingProductFull.sellingPrice === undefined ? '' : editingProductFull.sellingPrice,
            minStockLevel: editingProductFull.minStockLevel === undefined ? '' : editingProductFull.minStockLevel,
            initialStock: editingProductFull.initialStock, 
            imageUrl: editingProductFull.imageUrl || '',
        } : {
            name: '',
            sku: '',
            unit: PRODUCT_UNITS[0],
            costPrice: '',
            sellingPrice: '',
            minStockLevel: '',
            initialStock: 0,
            imageUrl: '',
        };
        return initialValues;
    }, [editingProductFull]);

    const formMethods = useForm<ProductFormValues>({
        resolver: zodResolver(ProductSchema),
        defaultValues: getInitialFormValues(), 
    });
    
    useEffect(() => {
        const initialVals = getInitialFormValues();
        formMethods.reset(initialVals);
        setImagePreview(initialVals.imageUrl || null);
        setImageFile(null); 
    }, [editingProductFull, formMethods, getInitialFormValues]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        formMethods.setValue('imageUrl', ''); 
      }
    };

    const handleInternalSubmit = async (data: ProductFormValues) => {
        setIsUploading(true);
        setUploadProgress(0);
        let finalImageUrl = editingProductFull?.imageUrl || data.imageUrl || ''; 

        if (imageFile) {
            const fileName = `products/${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
            const fileRef = storageRef(storage, fileName);
            const uploadTask = uploadBytesResumable(fileRef, imageFile);

            try {
                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => {
                            console.error("Upload failed:", error);
                            toast({ title: "Lỗi tải lên", description: `Không thể tải lên hình ảnh: ${error.message}`, variant: "destructive" });
                            reject(error);
                        },
                        async () => {
                            finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve();
                        }
                    );
                });
            } catch (error) {
                setIsUploading(false);
                setUploadProgress(null);
                return; 
            }
        }
        
        setIsUploading(false);
        setUploadProgress(null);
        const submissionData = { ...data, imageUrl: finalImageUrl };
        onSubmit(submissionData);
        setImageFile(null); 
    };

    return (
        <Form {...formMethods}> 
            <form onSubmit={formMethods.handleSubmit(handleInternalSubmit)} className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto p-1" id={formHtmlId}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={formMethods.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Tên Sản Phẩm</FormLabel><FormControl><Input placeholder="VD: Sách Kỹ Năng A" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={formMethods.control} name="sku" render={({ field }) => (
                        <FormItem><FormLabel>Mã SKU (tùy chọn)</FormLabel><FormControl><Input placeholder="VD: SP001" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={formMethods.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>Đơn Vị Tính</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger></FormControl>
                            <SelectContent>{PRODUCT_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                 <FormItem>
                    <FormLabel>Hình Ảnh Sản Phẩm</FormLabel>
                    <div className="mt-1">
                        <FormControl>
                             <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden" // Hide the default input
                                id={fileInputId} 
                            />
                        </FormControl>
                        <Label 
                            htmlFor={fileInputId}
                            className={cn(
                                buttonVariants({ variant: "outline" }),
                                "cursor-pointer inline-flex items-center"
                            )}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Chọn hoặc kéo thả ảnh
                        </Label>
                    </div>
                    
                    {imagePreview && !isUploading && (
                        <div className="mt-4">
                        <Image
                            src={imagePreview}
                            alt="Xem trước sản phẩm"
                            width={100}
                            height={100}
                            className="h-24 w-24 object-cover rounded-md border"
                            data-ai-hint="product preview"
                            onError={() => setImagePreview(null)} 
                        />
                        </div>
                    )}
                    {isUploading && uploadProgress !== null && (
                        <Progress value={uploadProgress} className="w-full mt-2" />
                    )}
                    {isUploading && <p className="text-xs text-muted-foreground mt-1">Đang tải lên: {uploadProgress?.toFixed(0)}%</p>}
                    
                    <FormField
                        control={formMethods.control}
                        name="imageUrl"
                        render={({ field }) => <Input type="hidden" {...field} />}
                    />
                    <FormMessage>{formMethods.formState.errors.imageUrl?.message}</FormMessage>
                </FormItem>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={formMethods.control} name="costPrice" render={({ field }) => (
                        <FormItem><FormLabel>Giá Vốn (tùy chọn)</FormLabel><FormControl><Input type="number" step="any" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={formMethods.control} name="sellingPrice" render={({ field }) => (
                        <FormItem><FormLabel>Giá Bán (tùy chọn)</FormLabel><FormControl><Input type="number" step="any" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={formMethods.control} name="initialStock" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tồn Kho Ban Đầu</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} disabled={isEditing} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
                          {isEditing && <p className="text-xs text-muted-foreground">Không thể sửa tồn kho ban đầu. Sử dụng Nhập/Xuất kho để điều chỉnh.</p>}
                          <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={formMethods.control} name="minStockLevel" render={({ field }) => (
                        <FormItem><FormLabel>Mức Tồn Kho Tối Thiểu (tùy chọn)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { closeModalSignal(); setImageFile(null); setImagePreview(editingProductFull?.imageUrl || null); }}>Hủy</Button>
                    <Button type="submit" disabled={isUploading}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu
                    </Button>
                </div>
            </form>
        </Form>
    );
}

