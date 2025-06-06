
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/hooks';
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Package, PlusCircle, PackagePlus, PackageMinus, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge'; 

const chartDataFormatter = (value: number) => value.toLocaleString('vi-VN') + ' đ';

const tooltipContentFormatter = (value: number, name: string, props: Payload<number, string>) => {
    const formattedValue = chartDataFormatter(value);
    const indicatorColor = props.color || (props.payload && (props.payload as any).fill) || (props.payload && (props.payload as any).stroke);

    return (
        <div className="flex w-full items-center justify-start gap-1.5 text-sm" style={{ minWidth: '150px' }}>
            <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: indicatorColor,
                marginRight: '4px',
                flexShrink: 0,
            }} />
            <span className="text-muted-foreground flex-shrink-0 min-w-[60px]">{name}:</span>
            <span className="font-semibold ml-1 truncate text-right flex-grow">{formattedValue}</span>
        </div>
    );
};

const pieChartTooltipFormatter = (value: number, name: string, props: Payload<number, string>) => {
  const formattedValue = chartDataFormatter(value);
  const indicatorColor = props.color || (props.payload && (props.payload as any).fill);

  return (
      <div className="flex items-center gap-1.5 text-sm">
          <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: indicatorColor,
              marginRight: '2px',
              flexShrink: 0,
          }} />
          <span className="text-muted-foreground">{name}:</span>
          <span className="font-semibold ml-1">{formattedValue}</span>
      </div>
  );
};


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
  // Tính toán số lượng sản phẩm hết hàng và sắp hết hàng
  const numOutOfStock = products.filter(p => p.currentStock === 0).length;
  const numLowStock = products.filter(p => p.currentStock > 0 && p.minStockLevel !== undefined && p.currentStock < p.minStockLevel).length;


  const monthlyChartData = useMemo(() => {
    const dataMap: Record<string, { month: string, income: number, expenses: number, balance: number }> = {};
    
    [...incomeEntries, ...expenseEntries].forEach(entry => {
      const monthKey = format(new Date(entry.date), "yyyy-MM");
      const monthLabel = format(new Date(entry.date), "MMM yyyy", { locale: vi });
      
      if (!dataMap[monthKey]) {
        dataMap[monthKey] = { month: monthLabel, income: 0, expenses: 0, balance: 0 };
      }
      
      if (incomeEntries.some(ie => ie.id === entry.id && 'category' in ie)) { 
        dataMap[monthKey].income += entry.amount;
      } else { 
        dataMap[monthKey].expenses += entry.amount;
      }
      dataMap[monthKey].balance = dataMap[monthKey].income - dataMap[monthKey].expenses;
    });

    return Object.keys(dataMap)
      .sort()
      .map(key => dataMap[key]);
  }, [incomeEntries, expenseEntries]);


  const incomeExpenseChartConfig = {
    income: { label: "Thu Nhập", color: "hsl(var(--chart-1))" },
    expenses: { label: "Chi Phí", color: "hsl(var(--chart-2))" },
    balance: { label: "Lợi Nhuận", color: "hsl(var(--chart-3))" },
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
                        <TrendingUp className="h-5 w-5" />
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
                        <TrendingDown className="h-5 w-5" />
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
            <div className="text-xl font-bold md:text-2xl">{totalIncome.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng thu nhập ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Tiêu</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold md:text-2xl">{totalExpenses.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng chi tiêu ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số Dư Hiện Tại</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold md:text-2xl ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="text-xl font-bold md:text-2xl">{totalProducts}</div>
            <div className="mt-1 space-y-0.5 min-h-[1.2em]">
              {numOutOfStock > 0 && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <Badge variant="destructive" className="mr-1.5 px-1.5 py-0 text-[10px] h-4 leading-snug">HẾT</Badge>
                  {numOutOfStock} sản phẩm hết hàng
                </div>
              )}
              {numLowStock > 0 && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <Badge
                    variant="default"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 mr-1.5 px-1.5 py-0 text-[10px] h-4 leading-snug"
                  >
                    SẮP HẾT
                  </Badge>
                  {numLowStock} sản phẩm sắp hết hàng
                </div>
              )}
              {numOutOfStock === 0 && numLowStock === 0 && (
                <p className="text-xs text-muted-foreground">Tất cả sản phẩm đủ hàng</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Xu Hướng Thu Nhập, Chi Phí & Lợi Nhuận (Hàng Tháng)</CardTitle> 
            <CardDescription>Theo dõi diễn biến của thu nhập, chi phí và lợi nhuận qua các tháng.</CardDescription> 
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <ChartContainer config={incomeExpenseChartConfig} className="h-[270px] sm:h-[300px] w-full">
                <LineChart accessibilityLayer data={monthlyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis tickFormatter={chartDataFormatter} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<ChartTooltipContent formatter={tooltipContentFormatter} />} />
                  <Legend />
                  <Line type="monotone" dataKey="income" strokeWidth={2} stroke="var(--color-income)" name="Thu Nhập" dot={{ r: 4, fill: "var(--color-income)" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expenses" strokeWidth={2} stroke="var(--color-expenses)" name="Chi Phí" dot={{ r: 4, fill: "var(--color-expenses)" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="balance" strokeWidth={2} stroke="var(--color-balance)" name="Lợi Nhuận" dot={{ r: 4, fill: "var(--color-balance)" }} activeDot={{ r: 6 }} />
                </LineChart>
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
                <ChartContainer config={{}} className="h-[220px] w-full max-w-xs">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip content={<ChartTooltipContent formatter={pieChartTooltipFormatter} nameKey="name" />} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: 20}}/>
                      <Pie data={incomeCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58}>
                        {incomeCategories.map((entry, index) => (
                          <Cell key={`cell-income-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                   </ResponsiveContainer>
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
                <ChartContainer config={{}} className="h-[220px] w-full max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip content={<ChartTooltipContent formatter={pieChartTooltipFormatter} nameKey="name" />} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: 20}} />
                      <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58}>
                       {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-expense-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
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

