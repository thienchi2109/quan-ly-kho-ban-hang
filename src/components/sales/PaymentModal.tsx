
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
    otherIncomeAmount: number;
    paymentMethod: PaymentMethodType;
    cashReceived?: number;
  }) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

const PaymentFormSchema = z.object({
  discountPercentage: z.preprocess(
    val => parseFloat(String(val)),
    z.number().min(0, "Giảm giá không âm").max(100, "Giảm giá tối đa 100%")
  ).default(0),
  otherIncomeAmount: z.preprocess(
    val => parseFloat(String(val)),
    z.number().min(0, "Thu khác không âm")
  ).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  cashReceived: z.preprocess(
    val => parseFloat(String(val)),
    z.number().min(0, "Tiền khách trả không âm").optional()
  ),
});

type PaymentFormValues = z.infer<typeof PaymentFormSchema>;

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
      otherIncomeAmount: 0,
      paymentMethod: 'Tiền mặt',
      cashReceived: undefined,
    },
  });

  const { watch, setValue } = form;
  const discountPercentage = watch('discountPercentage') || 0;
  const otherIncomeAmount = watch('otherIncomeAmount') || 0;
  const cashReceived = watch('cashReceived');
  const selectedPaymentMethod = watch('paymentMethod');

  const [amountDue, setAmountDue] = useState(orderData.currentOrderTotal);
  const [changeAmount, setChangeAmount] = useState(0);
  const [vietQRUrl, setVietQRUrl] = useState('');

  useEffect(() => {
    form.reset({ // Reset form when orderData changes or modal opens
        discountPercentage: 0,
        otherIncomeAmount: 0,
        paymentMethod: 'Tiền mặt',
        cashReceived: undefined,
    });
  }, [isOpen, orderData, form]);


  useEffect(() => {
    const newAmountDue = (orderData.currentOrderTotal * (1 - discountPercentage / 100)) + otherIncomeAmount;
    setAmountDue(Math.max(0, newAmountDue)); // Ensure amount due is not negative
  }, [orderData.currentOrderTotal, discountPercentage, otherIncomeAmount]);

  useEffect(() => {
    if (selectedPaymentMethod === 'Tiền mặt' && cashReceived !== undefined && cashReceived >= 0) {
      setChangeAmount(Math.max(0, cashReceived - amountDue));
    } else {
      setChangeAmount(0);
    }
  }, [cashReceived, amountDue, selectedPaymentMethod]);

  useEffect(() => {
    if (selectedPaymentMethod === 'Chuyển khoản' && amountDue > 0) {
      const shopName = "Maimiel Shop"; // Replace with your actual shop name
      const addInfoRaw = `TT DH ${orderData.customerName || 'KhachLe'} ${new Date().getTime().toString().slice(-5)}`; // Example, make unique
      const accountNameRaw = "Maimiel"; // Replace
      const bankId = "VCB"; // Example: Vietcombank
      const accountNumber = "0111000317652"; // Replace

      const qr = `https://img.vietqr.io/image/${bankId}-${accountNumber}-print.png?amount=${Math.round(amountDue)}&addInfo=${encodeURIComponent(addInfoRaw)}&accountName=${encodeURIComponent(accountNameRaw)}`;
      setVietQRUrl(qr);
    } else {
      setVietQRUrl('');
    }
  }, [selectedPaymentMethod, amountDue, orderData.customerName]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (values.paymentMethod === 'Tiền mặt' && (values.cashReceived === undefined || values.cashReceived < amountDue)) {
        form.setError('cashReceived', { type: 'manual', message: 'Số tiền khách trả phải lớn hơn hoặc bằng số tiền cần trả.' });
        return;
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Giảm giá (%)</ShadcnFormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={(field.value === undefined || field.value === null || field.value === '' || (typeof field.value === 'number' && isNaN(field.value))) ? '' : String(field.value)}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherIncomeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <ShadcnFormLabel>Thu khác (đ)</ShadcnFormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={(field.value === undefined || field.value === null || field.value === '' || (typeof field.value === 'number' && isNaN(field.value))) ? '' : String(field.value)}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4 p-3 bg-muted rounded-md">
                <Label className="text-base font-semibold">Khách cần trả:</Label>
                <p className="text-2xl font-bold text-primary">{amountDue.toLocaleString('vi-VN')} đ</p>
              </div>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <ShadcnFormLabel className="text-base">Phương thức thanh toán</ShadcnFormLabel>
                    <FormControl>
                      <Tabs defaultValue="Tiền mặt" className="w-full" onValueChange={(value) => field.onChange(value as PaymentMethodType)}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="Tiền mặt">Tiền mặt</TabsTrigger>
                          <TabsTrigger value="Chuyển khoản">Chuyển khoản</TabsTrigger>
                        </TabsList>
                        <TabsContent value="Tiền mặt" className="mt-4">
                          <FormField
                            control={form.control}
                            name="cashReceived"
                            render={({ field: cashField }) => (
                              <FormItem>
                                <ShadcnFormLabel>Tiền khách trả (đ)</ShadcnFormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...cashField}
                                    value={(cashField.value === undefined || cashField.value === null || (typeof cashField.value === 'number' && isNaN(cashField.value))) ? '' : String(cashField.value)}
                                    onChange={e => {
                                      const rawValue = e.target.value;
                                      if (rawValue === '') {
                                        cashField.onChange(undefined);
                                      } else {
                                        const numValue = parseFloat(rawValue);
                                        cashField.onChange(isNaN(numValue) ? undefined : numValue);
                                      }
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
                    <Button type="submit" disabled={isSubmitting || (selectedPaymentMethod === 'Tiền mặt' && (cashReceived === undefined || cashReceived < amountDue))}>
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

