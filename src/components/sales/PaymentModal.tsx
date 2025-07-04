
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { OrderDataForPayment, PaymentMethod as PaymentMethodType } from '@/lib/types';
import { PAYMENT_METHODS } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel as ShadcnFormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrderDataForPayment;
  onConfirmPayment: (paymentDetails: {
    discountPercentage: number;
    directDiscountAmount: number;
    otherIncomeAmount: number;
    paymentMethod: PaymentMethodType;
    cashReceived?: number;
    finalAmount: number; // Add finalAmount here
  }) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

const PaymentFormSchema = z.object({
  discountPercentage: z.preprocess(
    val => (val === "" || val === undefined || val === null) ? 0 : parseFloat(String(val)),
    z.number().min(0, "Giảm giá không âm").max(100, "Giảm giá tối đa 100%")
  ).default(0),
  directDiscountAmount: z.preprocess(
    val => (val === "" || val === undefined || val === null) ? 0 : parseFloat(String(val).replace(/\./g, '')),
    z.number().min(0, "Giảm giá không âm")
  ).default(0),
  otherIncomeAmount: z.preprocess(
    val => (val === "" || val === undefined || val === null) ? 0 : parseFloat(String(val).replace(/\./g, '')),
    z.number().min(0, "Thu khác không âm")
  ).default(0),
  finalAmount: z.preprocess(
    val => (val === "" || val === undefined || val === null) ? 0 : parseFloat(String(val).replace(/\./g, '')),
    z.number().min(0, "Tổng thanh toán không âm")
  ),
  paymentMethod: z.enum(PAYMENT_METHODS),
  cashReceived: z.preprocess(
    val => (val === "" || val === undefined || val === null) ? undefined : parseFloat(String(val).replace(/\./g, '')),
    z.number().min(0, "Tiền khách trả không âm").optional()
  ),
}).refine(data => data.directDiscountAmount === 0 || data.discountPercentage === 0, {
  message: "Chỉ có thể áp dụng một trong hai: Giảm giá (%) hoặc Giảm trực tiếp (đ).",
  path: ["directDiscountAmount"],
});

type PaymentFormValues = z.infer<typeof PaymentFormSchema>;

const formatNumericForDisplay = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
    return '';
  }
  if (typeof value === 'number' && value === 0 && String(value) === '0') return '0'; // Handle explicit 0

  const numStr = String(value).replace(/\./g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) {
    return String(value); // Return original if not a parseable number after cleaning
  }
  return num.toLocaleString('vi-VN');
};

const parseNumericFromDisplay = (displayValue: string): string => {
  const cleaned = String(displayValue).replace(/\./g, '');
  if (/^\d*$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/[^\d]/g, '');
};

const formatNumberInputValue = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
        return '';
    }
    if (value === 0) return ''; // Show placeholder if 0
    return String(value); // For input value, don't format with thousand separators initially
};

const parseNumberInputValue = (value: string): number | '' => {
    const cleaned = String(value).replace(/\./g, '');
    if (cleaned === '') return '';
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num;
};


export default function PaymentModal({
  isOpen,
  onClose,
  orderData,
  onConfirmPayment,
  onBack,
  isSubmitting,
}: PaymentModalProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: {
      discountPercentage: 0,
      directDiscountAmount: 0,
      otherIncomeAmount: 0,
      paymentMethod: 'Tiền mặt',
      cashReceived: undefined,
      finalAmount: 0,
    },
  });

  const { watch, setValue, control, handleSubmit, setError, clearErrors, formState: { errors } } = form;
  
  // Watched values from the form
  const watchedDiscountPercentage = watch('discountPercentage');
  const watchedDirectDiscountAmount = watch('directDiscountAmount');
  const watchedOtherIncomeAmount = watch('otherIncomeAmount');
  const watchedFinalAmount = watch('finalAmount');
  const watchedCashReceived = watch('cashReceived');
  const selectedPaymentMethod = watch('paymentMethod');

  const [changeAmount, setChangeAmount] = useState(0);
  const [vietQRUrl, setVietQRUrl] = useState('');

  useEffect(() => {
    // Ensure watched values are treated as numbers for calculation
    const numDiscountPercent = parseFloat(String(watchedDiscountPercentage)) || 0;
    const numDirectDiscount = parseFloat(String(watchedDirectDiscountAmount).replace(/\./g, '')) || 0;
    const numOtherIncome = parseFloat(String(watchedOtherIncomeAmount).replace(/\./g, '')) || 0;

    const discountFromPercentage = orderData.currentOrderTotal * (numDiscountPercent / 100);
    const newAmountDue = orderData.currentOrderTotal - discountFromPercentage - numDirectDiscount + numOtherIncome;
    
    setValue('finalAmount', Math.max(0, newAmountDue));
  }, [orderData.currentOrderTotal, watchedDiscountPercentage, watchedDirectDiscountAmount, watchedOtherIncomeAmount, setValue]);
  
  
  useEffect(() => {
    form.reset({
        discountPercentage: 0,
        directDiscountAmount: 0,
        otherIncomeAmount: 0,
        paymentMethod: 'Tiền mặt',
        cashReceived: undefined,
        finalAmount: orderData.currentOrderTotal
    });
  }, [isOpen, orderData, form]);

  useEffect(() => {
    const numCashReceived = parseFloat(String(watchedCashReceived).replace(/\./g, '')) || 0;
    const numFinalAmount = parseFloat(String(watchedFinalAmount).replace(/\./g, '')) || 0;
    if (selectedPaymentMethod === 'Tiền mặt' && numCashReceived >= 0) {
      setChangeAmount(Math.max(0, numCashReceived - numFinalAmount));
    } else {
      setChangeAmount(0);
    }
  }, [watchedCashReceived, watchedFinalAmount, selectedPaymentMethod]);

  useEffect(() => {
    const numFinalAmount = parseFloat(String(watchedFinalAmount).replace(/\./g, '')) || 0;
    if (selectedPaymentMethod === 'Chuyển khoản' && numFinalAmount > 0) {
      const shopName = "Maimiel Shop";
      const addInfoRaw = `TT DH ${orderData.customerName || 'KhachLe'} ${new Date().getTime().toString().slice(-5)}`;
      const accountNameRaw = "Maimiel";
      const bankId = "VCB";
      const accountNumber = "0111000317652";
      const qr = `https://img.vietqr.io/image/${bankId}-${accountNumber}-print.png?amount=${Math.round(numFinalAmount)}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;
      setVietQRUrl(qr);
    } else {
      setVietQRUrl('');
    }
  }, [selectedPaymentMethod, watchedFinalAmount, orderData.customerName]);
  
  useEffect(() => {
    if (selectedPaymentMethod === 'Chuyển khoản') {
      clearErrors('cashReceived');
    }
  }, [selectedPaymentMethod, clearErrors]);


  const onSubmit = async (values: PaymentFormValues) => {
    const numFinalAmount = values.finalAmount || 0;
    // Values from form submit (already processed by Zod) are numbers or undefined
    if (values.paymentMethod === 'Tiền mặt' && numFinalAmount > 0) {
      if (values.cashReceived === undefined) {
        setError('cashReceived', { type: 'manual', message: 'Vui lòng nhập số tiền khách trả.' });
        return;
      }
      if (values.cashReceived < numFinalAmount) {
        setError('cashReceived', { type: 'manual', message: 'Số tiền khách trả phải lớn hơn hoặc bằng số tiền cần trả.' });
        return;
      }
    }
    await onConfirmPayment(values);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Thanh Toán Đơn Hàng</DialogTitle>
          <DialogDescription>
            Tổng tiền hàng: {orderData.currentOrderTotal.toLocaleString('vi-VN')} đ.
            Điều chỉnh giảm giá, thu khác và chọn phương thức thanh toán.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-250px)] pr-5 -mr-2">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Giảm giá (%)</ShadcnFormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          {...field}
                          value={formatNumberInputValue(field.value)}
                          onChange={e => field.onChange(parseNumberInputValue(e.target.value))}
                          disabled={!!watchedDirectDiscountAmount}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={control}
                  name="directDiscountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Giảm trực tiếp (đ)</ShadcnFormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          {...field}
                          value={formatNumericForDisplay(field.value)}
                          onChange={e => field.onChange(parseNumericFromDisplay(e.target.value))}
                          disabled={!!watchedDiscountPercentage}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="otherIncomeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Thu khác (đ)</ShadcnFormLabel>
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
              </div>

               <FormField
                  control={control}
                  name="finalAmount"
                  render={({ field }) => (
                    <FormItem className="mt-4 p-3 bg-muted rounded-md">
                      <ShadcnFormLabel className="text-base font-semibold">Khách cần trả (có thể sửa):</ShadcnFormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          {...field}
                          value={formatNumericForDisplay(field.value)}
                          onChange={e => field.onChange(parseNumericFromDisplay(e.target.value))}
                          className="text-2xl font-bold text-primary h-auto p-1 border-2 border-transparent focus-visible:border-primary bg-transparent focus-visible:ring-0 shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <ShadcnFormLabel className="text-base">Phương thức thanh toán</ShadcnFormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as PaymentMethodType)}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          {PAYMENT_METHODS.map(method => (
                            <TabsTrigger key={method} value={method}>{method}</TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsContent value="Tiền mặt" className="mt-4">
                          <FormField
                            control={control}
                            name="cashReceived"
                            render={({ field: cashField }) => (
                              <FormItem>
                                <ShadcnFormLabel>Tiền khách trả (đ)</ShadcnFormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    {...cashField}
                                    value={formatNumericForDisplay(cashField.value)}
                                    onChange={e => {
                                      const parsed = parseNumericFromDisplay(e.target.value);
                                      cashField.onChange(parsed === '' ? undefined : parsed);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="mt-2">
                            <Label>Tiền thối lại:</Label>
                            <p className="text-lg font-semibold">{changeAmount.toLocaleString('vi-VN')} đ</p>
                          </div>
                        </TabsContent>
                        <TabsContent value="Chuyển khoản" className="mt-4 flex flex-col items-center">
                          {vietQRUrl ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-2">Quét mã VietQR để thanh toán</p>
                              <Image
                                src={vietQRUrl}
                                alt="VietQR Code"
                                width={250}
                                height={250}
                                className="rounded-md border"
                                data-ai-hint="payment QR code"
                              />
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Không thể tạo mã QR (số tiền cần trả phải lớn hơn 0).</p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <DialogFooter className="pt-6 gap-2 sm:justify-between">
                <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Quay Lại
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        (selectedPaymentMethod === 'Tiền mặt' && (watchedFinalAmount || 0) > 0 && (watchedCashReceived === undefined || (parseFloat(String(watchedCashReceived).replace(/\./g, '')) || 0) < (watchedFinalAmount || 0)))
                      }
                    >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <DollarSign className="mr-2 h-4 w-4" /> Xác Nhận Thanh Toán
                    </Button>
                </div>
            </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
