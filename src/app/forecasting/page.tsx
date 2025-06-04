"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FinancialForecastApiInputSchema } from '@/lib/schemas';
import type { FinancialForecastInput, FinancialForecastOutput } from '@/ai/flows/financial-forecast';
import { financialForecast } from '@/ai/flows/financial-forecast';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ForecastFormValues = FinancialForecastInput;

export default function ForecastingPage() {
  const { incomeEntries, expenseEntries } = useData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<FinancialForecastOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(FinancialForecastApiInputSchema),
    defaultValues: {
      incomeData: JSON.stringify(incomeEntries.map(e => ({date: e.date, amount: e.amount})), null, 2),
      expenseData: JSON.stringify(expenseEntries.map(e => ({date: e.date, amount: e.amount})), null, 2),
    },
  });
  
  // Update default values when income/expense entries change
  React.useEffect(() => {
    form.reset({
      incomeData: JSON.stringify(incomeEntries.map(e => ({date: e.date, amount: e.amount})), null, 2),
      expenseData: JSON.stringify(expenseEntries.map(e => ({date: e.date, amount: e.amount})), null, 2),
    });
  }, [incomeEntries, expenseEntries, form]);

  const onSubmit = async (values: ForecastFormValues) => {
    setIsLoading(true);
    setForecastResult(null);
    setError(null);
    try {
      // Validate JSON strings before sending
      JSON.parse(values.incomeData);
      JSON.parse(values.expenseData);

      const result = await financialForecast(values);
      setForecastResult(result);
      toast({ title: "Dự báo hoàn tất!", description: "Kết quả dự báo đã được hiển thị." });
    } catch (e: any) {
      console.error("Forecast error:", e);
      let errorMessage = "Đã xảy ra lỗi khi tạo dự báo.";
      if (e instanceof SyntaxError) {
        errorMessage = "Dữ liệu thu nhập hoặc chi phí không đúng định dạng JSON.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      toast({ title: "Lỗi dự báo", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="Công Cụ Dự Báo AI" 
        description="Nhận các đề xuất và dự báo tài chính dựa trên dữ liệu lịch sử của bạn." 
      />
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Nhập Dữ Liệu Dự Báo</CardTitle>
            <CardDescription>
              Cung cấp dữ liệu thu nhập và chi tiêu ở định dạng JSON. 
              Dữ liệu hiện tại của bạn đã được tự động điền.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="incomeData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dữ Liệu Thu Nhập (JSON)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dán dữ liệu JSON thu nhập tại đây" {...field} rows={8} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expenseData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dữ Liệu Chi Tiêu (JSON)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dán dữ liệu JSON chi tiêu tại đây" {...field} rows={8} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Tạo Dự Báo
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Kết Quả Dự Báo</CardTitle>
            <CardDescription>AI sẽ phân tích dữ liệu và đưa ra các nhận định, khuyến nghị.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Đang xử lý dữ liệu và tạo dự báo...</p>
              </div>
            )}
            {error && (
               <Alert variant="destructive">
                 <AlertTitle>Lỗi</AlertTitle>
                 <AlertDescription>{error}</AlertDescription>
               </Alert>
            )}
            {forecastResult && !isLoading && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary font-headline">Tóm Tắt Dự Báo</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{forecastResult.forecastSummary}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-accent font-headline">Khuyến Nghị</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{forecastResult.recommendations}</p>
                </div>
              </div>
            )}
            {!isLoading && !forecastResult && !error && (
              <p className="text-muted-foreground text-center py-10">
                Nhập dữ liệu và nhấn "Tạo Dự Báo" để xem kết quả từ AI.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
