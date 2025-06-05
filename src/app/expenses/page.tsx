
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpenseEntrySchema } from '@/lib/schemas';
import type { ExpenseEntry, ExpenseCategory } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, ExternalLink, UploadCloud, Camera, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { cn } from '@/lib/utils';

type ExpenseFormValues = Omit<ExpenseEntry, 'id'>;

// Helper function to convert dataURL to File
function dataURLtoFile(dataurl: string, filename: string): File | null {
  const arr = dataurl.split(',');
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) return null;
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}


export default function ExpensesPage() {
  const { expenseEntries, addExpenseEntry, deleteExpenseEntry } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State for camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseEntrySchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      description: '',
      receiptImageUrl: '', // This will be populated after upload
    },
  });

  const resetImageState = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  }, []);

  const resetFormAndImageState = useCallback(() => {
    form.reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: EXPENSE_CATEGORIES[0],
      description: '',
      receiptImageUrl: '',
    });
    resetImageState();
    setIsCameraOpen(false); // Close camera if open
    setHasCameraPermission(null);
  }, [form, resetImageState]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      form.setValue('receiptImageUrl', ''); // Clear any existing URL
      setIsCameraOpen(false); // Close camera if it was open
    }
  };

  const removeSelectedImage = () => {
    resetImageState();
    form.setValue('receiptImageUrl', '');
  };
  
  // Camera Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (!isCameraOpen) {
        if (videoRef.current && videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Không thể truy cập Camera',
          description: 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.',
        });
        setIsCameraOpen(false);
      }
    };

    getCameraPermission();

    return () => { // Cleanup function
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
         videoRef.current.srcObject = null;
      }
    };
  }, [isCameraOpen, toast]);

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const capturedFile = dataURLtoFile(dataUrl, `receipt-${Date.now()}.jpg`);
        if (capturedFile) {
          setImageFile(capturedFile);
          setImagePreview(dataUrl); // Use dataUrl for immediate preview
          form.setValue('receiptImageUrl', ''); // Clear any existing URL
        }
      }
      setIsCameraOpen(false); // Close camera after capture
    }
  };


  const onSubmit = async (values: ExpenseFormValues, closeModal: () => void) => {
    setIsUploading(true);
    let finalReceiptImageUrl = values.receiptImageUrl || '';

    if (imageFile && !values.receiptImageUrl) { // Only upload if no URL is already set (e.g. from editing)
      const fileName = `receipts/${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
      const fileRef = storageRef(storage, fileName);
      const uploadTask = uploadBytesResumable(fileRef, imageFile);

      try {
        finalReceiptImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } catch (error) {
        toast({ title: "Lỗi tải lên", description: "Không thể tải lên hình ảnh biên lai.", variant: "destructive" });
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
    }
    
    const dataToSubmit = { ...values, receiptImageUrl: finalReceiptImageUrl };
    
    await addExpenseEntry(dataToSubmit); // Assuming addExpenseEntry is async or can be awaited
    toast({ title: "Thành công!", description: "Đã thêm khoản chi tiêu mới." });
    
    resetFormAndImageState();
    setIsUploading(false); // Ensure this is reset
    setUploadProgress(null); // Ensure this is reset
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteExpenseEntry(id);
    toast({ title: "Đã xóa", description: "Đã xóa khoản chi tiêu.", variant: "destructive" });
  };
  
  const columns: ColumnDef<ExpenseEntry>[] = [
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
      cell: ({ row }) => row.getValue("description") || <span className="text-muted-foreground italic">Không có</span>,
    },
    {
      accessorKey: "receiptImageUrl",
      header: "Biên Lai",
      cell: ({ row }) => {
        const url = row.getValue<string | undefined>("receiptImageUrl");
        if (url) {
          return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
              <Image src={url} alt="Biên lai" width={32} height={32} className="h-8 w-8 object-cover rounded-sm mr-2" data-ai-hint="receipt document"/>
              Xem <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          );
        }
        return <span className="text-muted-foreground italic">Không có</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <DeleteConfirmDialog 
            onConfirm={() => handleDelete(row.original.id)}
            itemName={`khoản chi tiêu "${row.original.description || row.original.category}"`}
          />
        </div>
      ),
    },
  ];

  const renderExpenseCard = (row: Row<ExpenseEntry>): React.ReactNode => {
    const expense = row.original;
    const actionsCell = row.getVisibleCells().find(cell => cell.column.id === 'actions');
    const dateCell = row.getVisibleCells().find(cell => cell.column.id === 'date');
    const amountCell = row.getVisibleCells().find(cell => cell.column.id === 'amount');
    const receiptCell = row.getVisibleCells().find(cell => cell.column.id === 'receiptImageUrl');
    
    return (
      <Card key={expense.id} className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base mb-1">{expense.category}</CardTitle>
          {dateCell && <CardDescription>{flexRender(dateCell.column.columnDef.cell, dateCell.getContext())}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          {amountCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Số tiền:</span>
              <span>{flexRender(amountCell.column.columnDef.cell, amountCell.getContext())}</span>
            </div>
          }
          {expense.description && (
            <div>
              <span className="text-muted-foreground font-medium">Mô tả: </span>
              <span>{expense.description}</span>
            </div>
          )}
           {!expense.description && (
             <div>
                <span className="text-muted-foreground font-medium">Mô tả: </span>
                <span className="text-muted-foreground italic">Không có</span>
            </div>
          )}
          {receiptCell && (
            <div className="mt-1">
              <span className="text-muted-foreground font-medium">Biên lai: </span>
              {flexRender(receiptCell.column.columnDef.cell, receiptCell.getContext())}
            </div>
          )}
        </CardContent>
        {actionsCell && (
          <CardFooter className="flex justify-end pt-3 pb-3">
            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
          </CardFooter>
        )}
      </Card>
    );
  };


  return (
    <>
      <PageHeader title="Theo Dõi Chi Tiêu" description="Quản lý các khoản chi tiêu của bạn.">
        <Button onClick={() => {
          resetFormAndImageState();
          setIsModalOpen(true);
        }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm Mới
        </Button>
      </PageHeader>
      <FormModal<ExpenseFormValues>
          title="Thêm Khoản Chi Tiêu Mới"
          description="Điền thông tin chi tiết về khoản chi tiêu."
          formId="add-expense-form"
          open={isModalOpen}
          onOpenChange={(isOpen) => {
            setIsModalOpen(isOpen);
            if (!isOpen) {
              resetFormAndImageState(); // Reset if modal is closed externally
              setIsCameraOpen(false); 
            }
          }}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-1" id="add-expense-form">
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
                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
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
                          {EXPENSE_CATEGORIES.map(cat => (
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
                
                {/* Image Upload Section */}
                <FormItem>
                  <FormLabel>Ảnh Biên Lai (tùy chọn)</FormLabel>
                  {!isCameraOpen && (
                    <div className="space-y-3">
                       <div className="flex flex-col sm:flex-row gap-2">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                          <UploadCloud className="mr-2 h-4 w-4" /> Chọn Ảnh
                        </Button>
                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageFileChange}
                          className="hidden"
                          id="receipt-file-upload"
                        />
                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} className="flex-1">
                          <Camera className="mr-2 h-4 w-4" /> Chụp Ảnh
                        </Button>
                      </div>

                      {imagePreview && !isUploading && (
                        <div className="mt-2 relative group w-32 h-32 border rounded-md flex items-center justify-center">
                          <Image src={imagePreview} alt="Xem trước biên lai" layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="receipt preview" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={removeSelectedImage}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {isUploading && uploadProgress !== null && (
                    <div className="mt-2">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-muted-foreground mt-1">Đang tải lên: {uploadProgress?.toFixed(0)}%</p>
                    </div>
                  )}
                </FormItem>

                {/* Camera View Section */}
                {isCameraOpen && (
                  <Card className="mt-2">
                    <CardHeader>
                      <CardTitle className="text-base">Chụp Ảnh Biên Lai</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hasCameraPermission === false && (
                        <Alert variant="destructive">
                          <AlertTitle>Không có quyền truy cập Camera</AlertTitle>
                          <AlertDescription>
                            Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt của bạn để sử dụng tính năng này.
                          </AlertDescription>
                        </Alert>
                      )}
                      {hasCameraPermission === true && (
                        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                      )}
                       {hasCameraPermission === null && (
                        <div className="flex justify-center items-center h-32">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="ml-2 text-muted-foreground">Đang khởi tạo camera...</p>
                        </div>
                      )}
                    </CardContent>
                    {hasCameraPermission === true && (
                      <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCameraOpen(false)}>Hủy</Button>
                        <Button type="button" onClick={handleCaptureImage} disabled={!videoRef.current?.srcObject}>Chụp</Button>
                      </CardFooter>
                    )}
                  </Card>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>

                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { resetFormAndImageState(); closeModal();}}>Hủy</Button>
                    <Button type="submit" disabled={isUploading || (isCameraOpen && hasCameraPermission !== true) }>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>


      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns} 
            data={expenseEntries} 
            filterColumn="description" 
            filterPlaceholder="Lọc theo mô tả..."
            renderCardRow={renderExpenseCard}
          />
        </CardContent>
      </Card>
    </>
  );
}

