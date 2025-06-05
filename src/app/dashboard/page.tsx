
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/hooks';
import { BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid, Bar, Line, Pie, Cell } from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Package, PlusCircle, PackagePlus, PackageMinus } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const chartDataFormatter = (value: number) => value.toLocaleString('vi-VN') + ' đ';

export default function DashboardPage() {
  const { 
    getTotalIncome, 
    getTotalExpenses, 
    getCategoryTotals, 
    products, 
    incomeEntries, 
    expenseEntries 
  } = useData();

  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();
  const netBalance = totalIncome - totalExpenses;

  const incomeCategories = getCategoryTotals('income');
  const expenseCategories = getCategoryTotals('expense');
  
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.minStockLevel !== undefined && p.currentStock < p.minStockLevel).length;

  const monthlyChartData = useMemo(() => {
    const dataMap: Record<string, { month: string, income: number, expenses: number }> = {};
    
    [...incomeEntries, ...expenseEntries].forEach(entry => {
      const monthKey = format(new Date(entry.date), "yyyy-MM");
      const monthLabel = format(new Date(entry.date), "MMM yyyy", { locale: vi });
      
      if (!dataMap[monthKey]) {
        dataMap[monthKey] = { month: monthLabel, income: 0, expenses: 0 };
      }
      
      if ('category' in entry && incomeEntries.some(ie => ie.id === entry.id)) { 
        dataMap[monthKey].income += entry.amount;
      } else {
        dataMap[monthKey].expenses += entry.amount;
      }
    });

    // Sort data by month key before returning, to ensure chronological order for charts
    return Object.keys(dataMap)
      .sort()
      .map(key => dataMap[key]);
  }, [incomeEntries, expenseEntries]);


  const incomeExpenseChartConfig = {
    income: { label: "Thu Nhập", color: "hsl(var(--chart-1))" },
    expenses: { label: "Chi Phí", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <>
      <PageHeader title="Tổng Quan Tài Chính" description="Tóm tắt tình hình tài chính và kho hàng của bạn." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tác Vụ Nhanh</CardTitle>
          <CardDescription>Truy cập nhanh các chức năng thường dùng.</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/inventory/products" passHref legacyBehavior>
                    <Button asChild size="icon" className="sm:w-auto sm:px-4">
                      <a>
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:ml-2 sm:inline">Thêm Sản Phẩm</span>
                      </a>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Thêm Sản Phẩm</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/inventory/imports" passHref legacyBehavior>
                    <Button asChild size="icon" className="sm:w-auto sm:px-4">
                      <a>
                        <PackagePlus className="h-5 w-5" />
                        <span className="hidden sm:ml-2 sm:inline">Tạo Phiếu Nhập</span>
                      </a>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Tạo Phiếu Nhập</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/inventory/exports" passHref legacyBehavior>
                    <Button asChild size="icon" className="sm:w-auto sm:px-4">
                      <a>
                        <PackageMinus className="h-5 w-5" />
                        <span className="hidden sm:ml-2 sm:inline">Tạo Phiếu Xuất</span>
                      </a>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Tạo Phiếu Xuất</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/income" passHref legacyBehavior>
                    <Button asChild size="icon" className="sm:w-auto sm:px-4">
                      <a>
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:ml-2 sm:inline">Thêm Thu Nhập</span>
                      </a>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Thêm Thu Nhập</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/expenses" passHref legacyBehavior>
                    <Button asChild size="icon" className="sm:w-auto sm:px-4">
                      <a>
                        <PlusCircle className="h-5 w-5" />
                        <span className="hidden sm:ml-2 sm:inline">Thêm Chi Tiêu</span>
                      </a>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Thêm Chi Tiêu</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Thu Nhập</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng thu nhập ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Tiêu</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng chi tiêu ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số Dư Hiện Tại</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netBalance.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-muted-foreground">Thu nhập - Chi tiêu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Tồn Kho</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{lowStockProducts > 0 ? `${lowStockProducts} sản phẩm sắp hết hàng` : "Tất cả sản phẩm đủ hàng"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thu Nhập vs. Chi Phí (Hàng Tháng)</CardTitle>
            <CardDescription>So sánh tổng thu nhập và chi phí qua các tháng.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <ChartContainer config={incomeExpenseChartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={monthlyChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis tickFormatter={chartDataFormatter} />
                  <RechartsTooltip content={<ChartTooltipContent formatter={chartDataFormatter} />} />
                  <Legend />
                  <Bar dataKey="income" fill="var(--color-income)" radius={4} name="Thu Nhập" />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} name="Chi Phí" />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">Chưa có dữ liệu thu nhập/chi phí để vẽ biểu đồ tháng.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Phân Loại Thu Nhập</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {incomeCategories.length > 0 ? (
                <ChartContainer config={{}} className="h-[200px] w-full max-w-xs">
                   <PieChart>
                    <RechartsTooltip content={<ChartTooltipContent formatter={chartDataFormatter} nameKey="name" />} />
                    <Pie data={incomeCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {incomeCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend/>
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground">Chưa có dữ liệu thu nhập.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Phân Loại Chi Tiêu</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
               {expenseCategories.length > 0 ? (
                <ChartContainer config={{}} className="h-[200px] w-full max-w-xs">
                  <PieChart>
                    <RechartsTooltip content={<ChartTooltipContent formatter={chartDataFormatter} nameKey="name" />} />
                    <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                       {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend/>
                  </PieChart>
                </ChartContainer>
              ) : (
                 <p className="text-muted-foreground">Chưa có dữ liệu chi tiêu.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

