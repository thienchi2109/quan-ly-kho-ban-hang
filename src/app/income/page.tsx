
"use client";

import React, { useState, useMemo } from 'react'; // Added useMemo
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IncomeEntrySchema } from '@/lib/schemas';
import type { IncomeEntry, ProductCategory } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ColumnDef, Row, flexRender, VisibilityState } from '@tanstack/react-table'; // Added VisibilityState
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks';
import { PRODUCT_CATEGORIES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import IncomeDetailModal from '@/components/income/IncomeDetailModal';
import { Label } from '@/components/ui/label'; // Added Label
import { useIsMobile } from '@/hooks/use-mobile'; // Added useIsMobile

type IncomeFormValues = Omit<IncomeEntry, 'id'>;

const formatNumericForDisplay = (value: number | string | undefined | null): string => {
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

const parseNumericFromDisplay = (displayValue: string): string => {
  const cleaned = displayValue.replace(/\./g, ''); 
  if (/^\d*$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/[^\d]/g, ''); 
};

export default function IncomePage() {
  const { incomeEntries, addIncomeEntry, deleteIncomeEntry } = useData();
  const { toast } = useToast();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingIncomeEntry, setViewingIncomeEntry] = useState<IncomeEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<ProductCategory | 'all'>('all'); // State for category filter
  const isMobile = useIsMobile(); // Hook to check if mobile
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(IncomeEntrySchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: PRODUCT_CATEGORIES[0],
      description: '',
    },
  });

  React.useEffect(() => {
    if (isMobile) {
      setColumnVisibility({
        description: false, // Hide description on mobile by default
      });
    } else {
      setColumnVisibility({}); // Show all on desktop
    }
  }, [isMobile]);


  const uniqueCategories = useMemo(() => {
    const categories = new Set(incomeEntries.map(entry => entry.category));
    return ['all', ...Array.from(categories)] as const;
  }, [incomeEntries]);

  const displayedIncomeEntries = useMemo(() => {
    if (filterCategory === 'all') {
      return incomeEntries;
    }
    return incomeEntries.filter(entry => entry.category === filterCategory);
  }, [incomeEntries, filterCategory]);

  const onSubmit = async (values: IncomeFormValues, closeModal: () => void) => {
    setIsSubmitting(true);
    const newEntryId = await addIncomeEntry(values);
    if (newEntryId) {
      toast({ title: "Thành công!", description: "Đã thêm khoản thu nhập mới." });
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        category: PRODUCT_CATEGORIES[0],
        description: '',
      });
      closeModal();
    }
    setIsSubmitting(false);
  };

  const handleDelete = (id: string) => {
    deleteIncomeEntry(id);
    toast({ title: "Đã xóa", description: "Đã xóa khoản thu nhập.", variant: "destructive" });
  };
  
  const columns: ColumnDef<IncomeEntry>[] = [
    {
      accessorKey: "date",
      header: "Ngày",
      cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "amount",
      header: "Số Tiền",
      cell: ({ row }) => `${row.getValue<number>("amount").toLocaleString('vi-VN')} đ`,
    },
    {
      accessorKey: "category",
      header: "Danh Mục",
    },
    {
      accessorKey: "description",
      header: "Mô Tả",
      cell: ({ row }) => {
        const description = row.getValue<string | undefined>("description");
        const truncatedDescription = description && description.length > 50 ? `${description.substring(0, 50)}...` : description;
        return truncatedDescription || <span className="text-muted-foreground italic">Không có</span>;
      },
      enableHiding: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setViewingIncomeEntry(row.original)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`khoản thu nhập "${row.original.description || row.original.category}"`}
          />
        </div>
      ),
    },
  ];

  const renderIncomeCard = (row: Row<IncomeEntry>): React.ReactNode => {
    const income = row.original;
    const dateCell = row.getVisibleCells().find(cell => cell.column.id === 'date');
    const amountCell = row.getVisibleCells().find(cell => cell.column.id === 'amount');
    
    return (
      <Card key={income.id} className="w-full">
        <CardHeader className="pb-3 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base mb-1">{income.category}</CardTitle>
            {dateCell && <CardDescription>{flexRender(dateCell.column.columnDef.cell, dateCell.getContext())}</CardDescription>}
          </div>
           <div className="flex gap-1 flex-shrink-0">
             <Button variant="ghost" size="icon" onClick={() => setViewingIncomeEntry(income)} title="Xem chi tiết">
               <Eye className="h-4 w-4" />
             </Button>
            <DeleteConfirmDialog 
              onConfirm={() => handleDelete(income.id)}
              itemName={`khoản thu nhập "${income.description || income.category}"`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm pt-0">
          {amountCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Số tiền:</span>
              <span>{flexRender(amountCell.column.columnDef.cell, amountCell.getContext())}</span>
            </div>
          }
          {income.description && (
            <div>
              <span className="text-muted-foreground font-medium">Mô tả: </span>
              <span>{income.description.length > 60 ? `${income.description.substring(0, 60)}...` : income.description}</span>
            </div>
          )}
           {!income.description && (
             <div>
                <span className="text-muted-foreground font-medium">Mô tả: </span>
                <span className="text-muted-foreground italic">Không có</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Theo Dõi Thu Nhập" description="Quản lý các nguồn thu nhập của bạn.">
         <Button onClick={() => {
            form.reset({
              date: format(new Date(), 'yyyy-MM-dd'),
              amount: 0,
              category: PRODUCT_CATEGORIES[0],
              description: '',
            });
            setIsFormModalOpen(true);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm Mới
        </Button>
      </PageHeader>
       <FormModal<IncomeFormValues>
          title="Thêm Khoản Thu Nhập Mới"
          description="Điền thông tin chi tiết về khoản thu nhập."
          formId="add-income-form"
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4" id="add-income-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10"/>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số Tiền</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0" 
                          {...field} 
                          value={formatNumericForDisplay(field.value)}
                          onChange={e => field.onChange(parseNumericFromDisplay(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh Mục</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô Tả (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Mô tả chi tiết..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {form.reset({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, category: PRODUCT_CATEGORIES[0], description: '' }); closeModal();}}>Hủy</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Lưu
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="category-filter-income">Lọc theo danh mục</Label>
              <Select
                value={filterCategory}
                onValueChange={(value) => setFilterCategory(value as ProductCategory | 'all')}
              >
                <SelectTrigger id="category-filter-income" className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'Tất cả Danh Mục' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable 
            columns={columns} 
            data={displayedIncomeEntries} 
            filterColumn="description" 
            filterPlaceholder="Lọc theo mô tả..."
            renderCardRow={renderIncomeCard}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </CardContent>
      </Card>

      <IncomeDetailModal 
        entry={viewingIncomeEntry} 
        onClose={() => setViewingIncomeEntry(null)} 
      />
    </>
  );
}
