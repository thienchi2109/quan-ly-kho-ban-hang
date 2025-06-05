
"use client";

import PageHeader from '@/components/PageHeader';
import { useData } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Component Card cho mỗi sản phẩm trong Kanban
const ProductKanbanCard = ({ product }: { product: Product }) => {
  let statusBorderColor = 'border-border'; // Default border
  let statusIndicatorText = 'Còn hàng';
  let statusTextClass = 'text-green-600';

  if (product.currentStock === 0) {
    statusBorderColor = 'border-l-yellow-500 dark:border-l-yellow-400';
    statusIndicatorText = 'Hết hàng';
    statusTextClass = 'text-yellow-600 dark:text-yellow-400';
  } else if (product.minStockLevel !== undefined && product.currentStock < product.minStockLevel) {
    statusBorderColor = 'border-l-red-500 dark:border-l-red-400';
    statusIndicatorText = 'Sắp hết';
    statusTextClass = 'text-red-600 dark:text-red-400';
  } else {
    statusBorderColor = 'border-l-green-500 dark:border-l-green-400';
  }

  return (
    <Card className={cn("mb-2 shadow-sm hover:shadow-md transition-shadow border-l-4", statusBorderColor)}>
      <CardHeader className="flex flex-row items-center gap-3 p-3 space-y-0">
        {product.imageUrl ? (
          <Image 
            src={product.imageUrl} 
            alt={product.name} 
            width={40} 
            height={40} 
            className="h-10 w-10 object-cover rounded-sm border flex-shrink-0" 
            data-ai-hint="product item"
          />
        ) : (
          <div className="h-10 w-10 bg-muted rounded-sm flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">N/A</div>
        )}
        <div className="flex-grow min-w-0">
          <CardTitle className="text-sm font-medium leading-tight truncate" title={product.name}>{product.name}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground truncate">{product.sku || 'Không có SKU'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tồn kho:</span>
          <span className="font-semibold">{product.currentStock} {product.unit}</span>
        </div>
        {product.minStockLevel !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tồn tối thiểu:</span>
            <span>{product.minStockLevel}</span>
          </div>
        )}
        <div className="flex justify-between">
            <span className="text-muted-foreground">Giá bán:</span>
            <span className="font-semibold">{product.sellingPrice !== undefined ? `${product.sellingPrice.toLocaleString('vi-VN')} đ` : 'N/A'}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-muted-foreground">Trạng thái:</span>
            <span className={cn("font-semibold", statusTextClass)}>{statusIndicatorText}</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface KanbanColumn {
  id: 'inStock' | 'lowStock' | 'outOfStock';
  title: string;
  products: Product[];
  headerClassName: string;
}

export default function StockLevelsKanbanPage() {
  const { products: allProducts, isLoading } = useData();

  const kanbanColumns = useMemo((): KanbanColumn[] => {
    const inStockProducts: Product[] = [];
    const lowStockProducts: Product[] = [];
    const outOfStockProducts: Product[] = [];

    allProducts.forEach(product => {
      if (product.currentStock === 0) {
        outOfStockProducts.push(product);
      } else if (product.minStockLevel !== undefined && product.currentStock < product.minStockLevel) {
        lowStockProducts.push(product);
      } else {
        inStockProducts.push(product);
      }
    });

    return [
      { 
        id: 'inStock', 
        title: `Còn hàng (${inStockProducts.length})`, 
        products: inStockProducts, 
        headerClassName: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200 border-green-300 dark:border-green-700" 
      },
      { 
        id: 'lowStock', 
        title: `Sắp hết hàng (${lowStockProducts.length})`, 
        products: lowStockProducts, 
        headerClassName: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-200 border-red-300 dark:border-red-700"
      },
      { 
        id: 'outOfStock', 
        title: `Hết hàng (${outOfStockProducts.length})`, 
        products: outOfStockProducts, 
        headerClassName: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700"
      },
    ];
  }, [allProducts]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Báo Cáo Tồn Kho (Kanban)" description="Xem trạng thái tồn kho sản phẩm theo dạng bảng Kanban." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Đang tải cột Còn hàng...", 
            "Đang tải cột Sắp hết...", 
            "Đang tải cột Hết hàng..."
          ].map((title, i) => (
            <Card key={i} className="flex flex-col overflow-hidden">
              <CardHeader className="p-3 border-b">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="p-3 flex-grow space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Báo Cáo Tồn Kho (Kanban)" description="Xem trạng thái tồn kho sản phẩm theo dạng bảng Kanban." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kanbanColumns.map((column) => (
          <div key={column.id} className="flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden" style={{maxHeight: 'calc(100vh - 160px)'}}>
            <CardHeader className={cn("p-3 border-b sticky top-0 bg-card/80 backdrop-blur-sm z-10", column.headerClassName)}>
              <CardTitle className="text-sm font-semibold tracking-wide">{column.title}</CardTitle>
            </CardHeader>
            {/* CardContent applied to ScrollArea parent for padding consistency */}
            <ScrollArea className="flex-grow"> 
              <div className="p-3 space-y-2">
                {column.products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Không có sản phẩm nào.</p>
                ) : (
                  column.products.map(product => (
                    <ProductKanbanCard key={product.id} product={product} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </>
  );
}
