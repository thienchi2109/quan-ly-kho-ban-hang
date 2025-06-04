"use client";

import PageHeader from '@/components/PageHeader';
import { useData } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product } from '@/lib/types';
import Image from 'next/image';

export default function StockLevelsPage() {
  const { products } = useData(); // products here already have currentStock calculated by context

  return (
    <>
      <PageHeader title="Báo Cáo Tồn Kho" description="Xem số lượng tồn kho hiện tại của tất cả sản phẩm." />
      
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Tồn Kho Sản Phẩm</CardTitle>
          <CardDescription>
            Số liệu được cập nhật tự động sau mỗi giao dịch nhập hoặc xuất kho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ảnh</TableHead>
                  <TableHead>Tên Sản Phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Đơn Vị</TableHead>
                  <TableHead className="text-right">Tồn Kho Ban Đầu</TableHead>
                  <TableHead className="text-right">Tồn Kho Hiện Tại</TableHead>
                  <TableHead className="text-right">Tồn Tối Thiểu</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Chưa có sản phẩm nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product: Product) => (
                    <TableRow key={product.id} className={
                      product.minStockLevel !== undefined && product.currentStock < product.minStockLevel 
                        ? "bg-red-500/10 hover:bg-red-500/20" 
                        : product.currentStock === 0 ? "bg-yellow-500/10 hover:bg-yellow-500/20" : ""
                    }>
                      <TableCell>
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="h-10 w-10 object-cover rounded-sm" data-ai-hint="product item" />
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded-sm flex items-center justify-center text-xs">N/A</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || 'N/A'}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right">{product.initialStock}</TableCell>
                      <TableCell className="text-right font-semibold">{product.currentStock}</TableCell>
                      <TableCell className="text-right">{product.minStockLevel ?? 'N/A'}</TableCell>
                      <TableCell>
                        {product.minStockLevel !== undefined && product.currentStock < product.minStockLevel ? (
                          <span className="text-red-600 font-medium">Sắp hết hàng</span>
                        ) : product.currentStock === 0 ? (
                          <span className="text-yellow-600 font-medium">Hết hàng</span>
                        ) : (
                          <span className="text-green-600 font-medium">Còn hàng</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
