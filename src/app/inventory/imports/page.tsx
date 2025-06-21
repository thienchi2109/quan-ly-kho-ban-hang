
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InventoryTransactionSchema } from '@/lib/schemas';
import type { InventoryTransaction, Product } from '@/lib/types';
import { useData } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/components/common/FormModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef, Row, flexRender } from '@tanstack/react-table';
import { format, parse, isValid as isValidDate } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PlusCircle, Loader2, ImagePlus, UploadCloud, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogFooterComponent } from '@/components/ui/dialog'; // Renamed DialogFooter to avoid conflict
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';
import { extractImportNoteInfo, ExtractImportNoteOutput } from '@/ai/flows/extract-import-note-flow';
import { Skeleton } from '@/components/ui/skeleton';

type ImportFormValues = Omit<InventoryTransaction, 'id' | 'type'>;

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

// Simple fuzzy search (can be improved with libraries like fuse.js if needed)
const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
};

const fuzzyMatchProduct = (productNameGuess: string, products: Product[]): Product | undefined => {
  if (!productNameGuess || products.length === 0) return undefined;
  const normalizedGuess = normalizeString(productNameGuess);
  
  // Prioritize SKU match if guess looks like an SKU (e.g., alphanumeric, short)
  const potentialSkuMatch = products.find(p => p.sku && normalizeString(p.sku) === normalizedGuess);
  if (potentialSkuMatch) return potentialSkuMatch;

  let bestMatch: Product | undefined = undefined;
  let highestScore = 0.7; // Threshold to consider a match

  for (const product of products) {
    const normalizedProductName = normalizeString(product.name);
    // Check for inclusion, simple but effective for partial matches
    if (normalizedProductName.includes(normalizedGuess) || normalizedGuess.includes(normalizedProductName)) {
      // Basic scoring: longer match is better
      const score = Math.max(normalizedGuess.length, normalizedProductName.length) > 0 ?
                    (Math.min(normalizedGuess.length, normalizedProductName.length) / Math.max(normalizedGuess.length, normalizedProductName.length)) : 0;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = product;
      }
    }
  }
  return bestMatch;
};


export default function ImportsPage() {
  const { products, inventoryTransactions, addInventoryTransaction, getProductById } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedImageDataUri, setSelectedImageDataUri] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiCameraOpen, setAiCameraOpen] = useState(false);
  const [aiHasCameraPermission, setAiHasCameraPermission] = useState<boolean | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const aiCanvasRef = useRef<HTMLCanvasElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const importTransactions = inventoryTransactions.filter(t => t.type === 'import');

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(InventoryTransactionSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      relatedParty: '',
      notes: '',
    },
  });

  const resetAiImportModalState = useCallback(() => {
    setSelectedImagePreview(null);
    setSelectedImageDataUri(null);
    setAiCameraOpen(false);
    setAiHasCameraPermission(null);
    if (aiFileInputRef.current) {
      aiFileInputRef.current.value = "";
    }
  }, []);

  const handleAiImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImageDataUri(reader.result as string);
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAiCameraOpen(false);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (!aiCameraOpen) {
        if (aiVideoRef.current && aiVideoRef.current.srcObject) {
          (aiVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          aiVideoRef.current.srcObject = null;
        }
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setAiHasCameraPermission(true);
        if (aiVideoRef.current) {
          aiVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing AI camera:', error);
        setAiHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Không thể truy cập Camera',
          description: 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.',
        });
        setAiCameraOpen(false);
      }
    };
    getCameraPermission();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (aiVideoRef.current && aiVideoRef.current.srcObject) {
         (aiVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
         aiVideoRef.current.srcObject = null;
      }
    };
  }, [aiCameraOpen, toast]);

  const handleAiCaptureImage = () => {
    if (aiVideoRef.current && aiCanvasRef.current) {
      const video = aiVideoRef.current;
      const canvas = aiCanvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelectedImageDataUri(dataUrl);
        setSelectedImagePreview(dataUrl);
      }
      setAiCameraOpen(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImageDataUri) {
      toast({ title: "Chưa chọn ảnh", description: "Vui lòng chọn hoặc chụp ảnh phiếu nhập kho.", variant: "destructive" });
      return;
    }
    setIsAiProcessing(true);
    try {
      const result: ExtractImportNoteOutput = await extractImportNoteInfo({ imageDataUri: selectedImageDataUri });
      
      // Reset form before populating
      form.reset({
        productId: '', // Will be set based on AI results if possible
        quantity: 1,
        date: result.date && isValidDate(parse(result.date, 'yyyy-MM-dd', new Date())) ? result.date : format(new Date(), 'yyyy-MM-dd'),
        relatedParty: result.supplierName || '',
        notes: '', // Start with empty notes, append AI notes later
      });

      // Populate form fields
      if (result.date && isValidDate(parse(result.date, 'yyyy-MM-dd', new Date()))) {
        form.setValue('date', result.date);
      }
      if (result.supplierName) {
        form.setValue('relatedParty', result.supplierName);
      }
      
      let aiGeneratedNotes = result.notes || '';

      if (result.items && result.items.length > 0) {
        const firstAiItem = result.items[0]; 
        const matchedProduct = fuzzyMatchProduct(firstAiItem.productNameGuess, products);

        if (matchedProduct) {
          form.setValue('productId', matchedProduct.id);
          form.setValue('quantity', firstAiItem.quantity > 0 ? firstAiItem.quantity : 1);
          
          // Add a note about the AI suggestion if it's used
          aiGeneratedNotes += `${aiGeneratedNotes ? '\n\n' : ''}--- AI gợi ý sản phẩm ---\nTên SP (AI): ${firstAiItem.productNameGuess}\nSố lượng (AI): ${firstAiItem.quantity}`;
          
          if (result.items.length > 1) {
            aiGeneratedNotes += "\n\nAI cũng nhận diện các sản phẩm khác (kiểm tra và thêm thủ công nếu cần):";
            result.items.slice(1).forEach(item => {
              aiGeneratedNotes += `\n- ${item.productNameGuess} (SL: ${item.quantity})`;
            });
          }
        } else {
           // If no match, put all AI items into notes for manual entry
           aiGeneratedNotes += `${aiGeneratedNotes ? '\n\n' : ''}--- AI gợi ý sản phẩm (Không tìm thấy sản phẩm khớp, vui lòng chọn thủ công) ---\n`;
           result.items.forEach(item => {
             aiGeneratedNotes += `Tên SP (AI): ${item.productNameGuess}, Số lượng (AI): ${item.quantity}\n`;
           });
        }
      }
      form.setValue('notes', aiGeneratedNotes.trim());

      toast({ title: "AI đã phân tích xong!", description: "Thông tin đã được điền vào form. Vui lòng kiểm tra và xác nhận." });
      setIsAiImportModalOpen(false); // Close AI modal
      resetAiImportModalState();
      setIsModalOpen(true); // Open the main import form modal

    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      toast({ title: "Lỗi Phân Tích Ảnh", description: error.message || "Không thể phân tích ảnh.", variant: "destructive" });
    } finally {
      setIsAiProcessing(false);
    }
  };


  const onSubmit = async (values: ImportFormValues, closeModal: () => void) => {
    setIsSubmitting(true);
    const result = await addInventoryTransaction({ ...values, type: 'import' });
    if (result === null) {
      toast({ title: "Thành công!", description: "Đã ghi nhận phiếu nhập kho." });
      form.reset({
        productId: '',
        quantity: 1,
        date: format(new Date(), 'yyyy-MM-dd'),
        relatedParty: '',
        notes: '',
      });
      closeModal();
    } else {
      toast({ title: "Lỗi!", description: result, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const columns: ColumnDef<InventoryTransaction>[] = [
    {
      accessorKey: "date",
      header: "Ngày Nhập",
      cell: ({ row }) => format(parse(row.getValue("date"), 'yyyy-MM-dd', new Date()), "dd/MM/yyyy", { locale: vi }),
    },
    {
      accessorKey: "productId",
      header: "Sản Phẩm",
      cell: ({ row }) => getProductById(row.getValue("productId"))?.name || "Không rõ",
    },
    {
      accessorKey: "quantity",
      header: "Số Lượng",
    },
    {
      accessorKey: "relatedParty",
      header: "Nhà Cung Cấp",
      cell: ({ row }) => row.getValue("relatedParty") || <span className="text-muted-foreground italic">N/A</span>,
    },
    {
      accessorKey: "notes",
      header: "Ghi Chú",
      cell: ({ row }) => {
        const notes = row.getValue<string | undefined>("notes");
        const truncatedNotes = notes && notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
        return truncatedNotes || <span className="text-muted-foreground italic">N/A</span>;
      },
    },
  ];

  const renderImportCard = (row: Row<InventoryTransaction>): React.ReactNode => {
    const transaction = row.original;
    const productCell = row.getVisibleCells().find(cell => cell.column.id === 'productId');
    const dateCell = row.getVisibleCells().find(cell => cell.column.id === 'date');
    const quantityCell = row.getVisibleCells().find(cell => cell.column.id === 'quantity');
    const relatedPartyCell = row.getVisibleCells().find(cell => cell.column.id === 'relatedParty');
    const notesCell = row.getVisibleCells().find(cell => cell.column.id === 'notes');

    return (
      <Card key={transaction.id} className="w-full">
        <CardHeader className="pb-3">
          {productCell && <CardTitle className="text-base mb-1">{flexRender(productCell.column.columnDef.cell, productCell.getContext())}</CardTitle>}
          {dateCell && <CardDescription>Ngày nhập: {flexRender(dateCell.column.columnDef.cell, dateCell.getContext())}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm pt-0">
          {quantityCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Số lượng:</span>
              <span>{flexRender(quantityCell.column.columnDef.cell, quantityCell.getContext())}</span>
            </div>
          }
          {relatedPartyCell && 
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Nhà cung cấp:</span>
              <span>{flexRender(relatedPartyCell.column.columnDef.cell, relatedPartyCell.getContext())}</span>
            </div>
          }
          {notesCell && (
            <div>
              <span className="text-muted-foreground font-medium">Ghi chú: </span>
              {flexRender(notesCell.column.columnDef.cell, notesCell.getContext())}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Nhập Kho" description="Ghi nhận các giao dịch nhập hàng vào kho.">
         <Button onClick={() => {
           form.reset({
            productId: '',
            quantity: 1,
            date: format(new Date(), 'yyyy-MM-dd'),
            relatedParty: '',
            notes: '',
           });
           setIsModalOpen(true);
         }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Tạo Phiếu Nhập
        </Button>
        <Button variant="outline" onClick={() => { resetAiImportModalState(); setIsAiImportModalOpen(true); }}>
          <ImagePlus className="mr-2 h-4 w-4" /> Nhập liệu AI từ ảnh
        </Button>
      </PageHeader>
      <FormModal<ImportFormValues>
          title="Tạo Phiếu Nhập Kho"
          description="Điền thông tin chi tiết về lô hàng nhập."
          formId="add-import-form"
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        >
          {(closeModal) => (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, closeModal))} className="space-y-4 mt-4 max-h-[75vh] overflow-y-auto p-1" id="add-import-form">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày Nhập</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-10"/>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sản Phẩm</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name} ({product.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số Lượng Nhập</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="relatedParty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nhà Cung Cấp (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên nhà cung cấp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi Chú (tùy chọn)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Thông tin thêm về lô hàng, hoặc gợi ý từ AI..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {form.reset({ productId: '', quantity: 1, date: format(new Date(), 'yyyy-MM-dd'), relatedParty: '', notes: '' }); closeModal();}}>Hủy</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Lưu Phiếu Nhập
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </FormModal>

      {/* AI Import Dialog */}
      <Dialog open={isAiImportModalOpen} onOpenChange={(isOpen) => {
        setIsAiImportModalOpen(isOpen);
        if (!isOpen) resetAiImportModalState();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhập Liệu AI Từ Ảnh Phiếu Nhập Kho</DialogTitle>
            <DialogDescription>
              Chọn hoặc chụp ảnh phiếu nhập kho viết tay. AI sẽ cố gắng trích xuất thông tin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {!aiCameraOpen && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => aiFileInputRef.current?.click()} className="flex-1">
                    <UploadCloud className="mr-2 h-4 w-4" /> Chọn Ảnh Từ Máy
                  </Button>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={aiFileInputRef}
                    onChange={handleAiImageFileChange}
                    className="hidden"
                    id="ai-receipt-file-upload"
                  />
                  <Button type="button" variant="outline" onClick={() => setAiCameraOpen(true)} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" /> Chụp Ảnh
                  </Button>
                </div>
                {selectedImagePreview && !isAiProcessing && (
                  <div className="mt-2 relative w-full p-2 border rounded-md flex flex-col items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">Ảnh đã chọn:</p>
                    <Image src={selectedImagePreview} alt="Xem trước phiếu nhập" width={400} height={300} style={{ objectFit: 'contain', maxHeight: '300px', width: 'auto' }} className="rounded-md border" data-ai-hint="handwritten note"/>
                  </div>
                )}
              </div>
            )}

            {isAiProcessing && (
               <div className="flex flex-col items-center justify-center space-y-2 p-6">
                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
                 <p className="text-muted-foreground">AI đang phân tích ảnh, vui lòng đợi...</p>
                 <Skeleton className="h-4 w-3/4 mt-2" />
                 <Skeleton className="h-4 w-1/2" />
               </div>
            )}

            {aiCameraOpen && (
              <Card className="mt-2">
                <CardHeader><CardTitle className="text-base">Chụp Ảnh Phiếu Nhập</CardTitle></CardHeader>
                <CardContent className="relative">
                  <video ref={aiVideoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                  {aiHasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/90 rounded-md p-4">
                      <Alert variant="destructive">
                        <AlertTitle>Không có quyền truy cập Camera</AlertTitle>
                        <AlertDescription>Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.</AlertDescription>
                      </Alert>
                    </div>
                  )}
                  {aiHasCameraPermission === null && (
                     <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/90 rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-2 text-muted-foreground mt-2">Đang khởi tạo camera...</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAiCameraOpen(false)}>Hủy</Button>
                  <Button type="button" onClick={handleAiCaptureImage} disabled={aiHasCameraPermission !== true}>Chụp</Button>
                </CardFooter>
              </Card>
            )}
            <canvas ref={aiCanvasRef} className="hidden"></canvas>
          </div>
          <DialogFooterComponent>
            <Button type="button" variant="outline" onClick={() => { setIsAiImportModalOpen(false); resetAiImportModalState(); }} disabled={isAiProcessing}>
              Đóng
            </Button>
            <Button type="button" onClick={handleAnalyzeImage} disabled={!selectedImageDataUri || isAiProcessing || aiCameraOpen}>
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Phân Tích Ảnh
            </Button>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>


      <Card>
        <CardContent className="pt-6">
          <DataTable 
            columns={columns} 
            data={importTransactions} 
            filterColumn="productId" 
            filterPlaceholder="Lọc theo sản phẩm..."
            renderCardRow={renderImportCard}
          />
        </CardContent>
      </Card>
    </>
  );
}

