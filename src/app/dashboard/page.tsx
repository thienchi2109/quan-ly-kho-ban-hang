
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/hooks';
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Package, PlusCircle, PackagePlus, PackageMinus, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { OptimizedChart, useChartData, useChartConfig } from '@/components/ui/optimized-chart';
import { MobileSafeChart, ResponsiveMobileChart, MobileLineChart, MobilePieChart } from '@/components/ui/mobile-safe-chart';

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
  const numOutOfStock = products.filter(p => p.currentStock === 0).length;
  const numLowStock = products.filter(p => p.currentStock > 0 && p.minStockLevel !== undefined && p.currentStock <= p.minStockLevel).length;


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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/sales/orders" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span>Tạo Đơn Hàng</span>
                </a>
              </Button>
            </Link>
            <Link href="/inventory/products" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <PlusCircle className="h-5 w-5 mr-2" />
                  <span>Thêm Sản Phẩm</span>
                </a>
              </Button>
            </Link>

            <Link href="/inventory/imports" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <PackagePlus className="h-5 w-5 mr-2" />
                  <span>Tạo Phiếu Nhập</span>
                </a>
              </Button>
            </Link>

            <Link href="/inventory/exports" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <PackageMinus className="h-5 w-5 mr-2" />
                  <span>Tạo Phiếu Xuất</span>
                </a>
              </Button>
            </Link>

            <Link href="/income" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  <span>Thêm Thu Nhập</span>
                </a>
              </Button>
            </Link>

            <Link href="/expenses" passHref legacyBehavior>
              <Button className="w-full justify-start" variant="outline">
                <a className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2" />
                  <span>Thêm Chi Tiêu</span>
                </a>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Thu Nhập</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalIncome.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng thu nhập ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Tiêu</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalExpenses.toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">Tổng chi tiêu ghi nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số Dư Hiện Tại</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl md:text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="text-xl md:text-2xl font-bold">{totalProducts}</div>
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
          <CardContent className="p-4">
            {monthlyChartData.length > 0 ? (
              <div className="h-[320px] sm:h-[380px] w-full" style={{minHeight: '320px'}}>
                <MobileLineChart config={incomeExpenseChartConfig} className="h-full w-full mobile-chart-responsive">
                  <LineChart
                    accessibilityLayer
                    data={monthlyChartData}
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    width={undefined}
                    height={undefined}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      tickFormatter={chartDataFormatter}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      fontSize={11}
                      width={60}
                    />
                    <RechartsTooltip
                      content={<ChartTooltipContent formatter={tooltipContentFormatter} />}
                      animationDuration={150}
                      isAnimationActive={true}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="income"
                      strokeWidth={2}
                      stroke="var(--color-income)"
                      name="Thu Nhập"
                      dot={{ r: 4, fill: "var(--color-income)", strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      strokeWidth={2}
                      stroke="var(--color-expenses)"
                      name="Chi Phí"
                      dot={{ r: 4, fill: "var(--color-expenses)", strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      strokeWidth={2}
                      stroke="var(--color-balance)"
                      name="Lợi Nhuận"
                      dot={{ r: 4, fill: "var(--color-balance)", strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  </LineChart>
                </MobileLineChart>
              </div>
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
            <CardContent className="p-4">
              {incomeCategories.length > 0 ? (
                <div className="h-[300px] w-full flex justify-center" style={{minHeight: '300px'}}>
                  <MobilePieChart config={{}} className="h-full w-full max-w-md mobile-chart-responsive">
                    <PieChart width={undefined} height={undefined}>
                      <RechartsTooltip
                        content={<ChartTooltipContent formatter={pieChartTooltipFormatter} nameKey="name" />}
                        animationDuration={150}
                        isAnimationActive={true}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconSize={10}
                        wrapperStyle={{paddingLeft: 10, fontSize: '11px'}}
                      />
                      <Pie
                        data={incomeCategories}
                        dataKey="value"
                        nameKey="name"
                        cx="35%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                        strokeWidth={2}
                      >
                        {incomeCategories.map((entry, index) => (
                          <Cell key={`cell-income-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </MobilePieChart>
                </div>
              ) : (
                <p className="text-muted-foreground">Chưa có dữ liệu thu nhập.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Phân Loại Chi Tiêu</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
               {expenseCategories.length > 0 ? (
                <div className="h-[300px] w-full flex justify-center" style={{minHeight: '300px'}}>
                  <MobilePieChart config={{}} className="h-full w-full max-w-md mobile-chart-responsive">
                    <PieChart width={undefined} height={undefined}>
                      <RechartsTooltip
                        content={<ChartTooltipContent formatter={pieChartTooltipFormatter} nameKey="name" />}
                        animationDuration={150}
                        isAnimationActive={true}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconSize={10}
                        wrapperStyle={{paddingLeft: 10, fontSize: '11px'}}
                      />
                      <Pie
                        data={expenseCategories}
                        dataKey="value"
                        nameKey="name"
                        cx="35%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                        strokeWidth={2}
                      >
                        {expenseCategories.map((entry, index) => (
                          <Cell key={`cell-expense-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </MobilePieChart>
                </div>
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
    
