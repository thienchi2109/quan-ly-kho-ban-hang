
"use client";

import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/hooks';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, PieChart, Pie, Cell } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent'; // Import Payload
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const chartDataFormatter = (value: number) => value.toLocaleString('vi-VN') + ' đ';

// Hàm định dạng cho từng mục trong tooltip (tương tự trang Dashboard)
const tooltipItemFormatter = (value: number, name: string, props: Payload<number, string> | undefined) => {
    if (!props) return null;
    const formattedValue = chartDataFormatter(value);
    // props.color là màu từ Bar component (ví dụ: var(--color-income))
    // props.payload.fill cũng có thể chứa màu nếu props.color không có.
    const indicatorColor = props.color || (props.payload && (props.payload as any).fill);

    return (
        <div className="flex w-full items-center justify-start gap-1.5 text-sm" style={{ minWidth: '150px' }}>
            {indicatorColor && (
              <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: indicatorColor,
                  marginRight: '4px',
                  flexShrink: 0,
              }} />
            )}
            <span className="text-muted-foreground flex-shrink-0 min-w-[50px]">{name}:</span>
            <span className="font-semibold ml-1 truncate text-right flex-grow">{formattedValue}</span>
        </div>
    );
};


export default function RevenueExpensesPage() {
  const { incomeEntries, expenseEntries, getCategoryTotals } = useData();

  const monthlySummary = useMemo(() => {
    const summary: Record<string, { month: string, income: number, expenses: number, balance: number }> = {};
    
    [...incomeEntries, ...expenseEntries].forEach(entry => {
      const monthKey = format(new Date(entry.date), "yyyy-MM");
      const monthLabel = format(new Date(entry.date), "MMM yyyy", { locale: vi });

      if (!summary[monthKey]) {
        summary[monthKey] = { month: monthLabel, income: 0, expenses: 0, balance: 0 };
      }
      if ('category' in entry && incomeEntries.some(ie => ie.id === entry.id)) { // is IncomeEntry
        summary[monthKey].income += entry.amount;
      } else { // is ExpenseEntry
        summary[monthKey].expenses += entry.amount;
      }
      summary[monthKey].balance = summary[monthKey].income - summary[monthKey].expenses;
    });
    return Object.values(summary).sort((a,b) => a.month.localeCompare(b.month));
  }, [incomeEntries, expenseEntries]);

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  
  const incomeCategories = getCategoryTotals('income');
  const expenseCategories = getCategoryTotals('expense');

  const chartConfig = {
    income: { label: "Thu Nhập", color: "hsl(var(--chart-1))" },
    expenses: { label: "Chi Phí", color: "hsl(var(--chart-2))" },
    balance: { label: "Số Dư", color: "hsl(var(--chart-3))" }
  } satisfies ChartConfig;

  const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


  return (
    <>
      <PageHeader title="Báo Cáo Doanh Thu - Chi Phí" description="Phân tích tổng quan về tình hình tài chính của bạn." />
      
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader><CardTitle>Tổng Thu Nhập</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{totalIncome.toLocaleString('vi-VN')} đ</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tổng Chi Phí</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString('vi-VN')} đ</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Số Dư Ròng</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{netBalance.toLocaleString('vi-VN')} đ</p></CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Biểu Đồ Thu Nhập - Chi Phí - Số Dư Hàng Tháng</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySummary.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart data={monthlySummary} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={chartDataFormatter} />
                <Tooltip content={<ChartTooltipContent formatter={tooltipItemFormatter} />} />
                <Legend />
                <Bar dataKey="income" fill="var(--color-income)" name="Thu Nhập" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" name="Chi Phí" radius={[4, 4, 0, 0]} />
                <Bar dataKey="balance" fill="var(--color-balance)" name="Số Dư" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">Chưa có đủ dữ liệu để hiển thị biểu đồ.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cơ Cấu Thu Nhập</CardTitle>
            <CardDescription>Phân bổ thu nhập theo từng danh mục.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {incomeCategories.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full max-w-md">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent formatter={chartDataFormatter} nameKey="name" />} />
                  <Legend />
                  <Pie data={incomeCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {incomeCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">Chưa có dữ liệu thu nhập.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cơ Cấu Chi Phí</CardTitle>
            <CardDescription>Phân bổ chi phí theo từng danh mục.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {expenseCategories.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px] w-full max-w-md">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent formatter={chartDataFormatter} nameKey="name" />} />
                  <Legend />
                  <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">Chưa có dữ liệu chi phí.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
