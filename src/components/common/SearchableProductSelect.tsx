
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Camera as CameraIcon, XCircle } from "lucide-react" // Added CameraIcon, XCircle

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Product } from "@/lib/types"
import { useToast } from "@/hooks/use-toast" // Added useToast
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Added Alert components

interface SearchableProductSelectProps {
  products: Array<Product & { currentStock: number }>;
  selectedProductId: string | undefined;
  onProductSelect: (productId: string | undefined) => void;
  disabledProductIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

export const SearchableProductSelect = React.forwardRef<HTMLButtonElement, SearchableProductSelectProps>(
  ({
    products,
    selectedProductId,
    onProductSelect,
    disabledProductIds = [],
    placeholder = "Tìm sản phẩm...",
    disabled = false,
    triggerClassName,
  }, ref) => {
    const [open, setOpen] = React.useState(false)
    const { toast } = useToast(); // For displaying messages

    // Camera State
    const [isCameraScanning, setIsCameraScanning] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [cameraError, setCameraError] = React.useState<string | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    // const canvasRef = React.useRef<HTMLCanvasElement>(null); // Might be needed by some scanning libraries

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const normalizeString = (str: string | undefined | null): string => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    const commandFilter = React.useCallback((itemValue: string, search: string): number => {
      const product = products.find(p => p.id === itemValue);
      if (!product) {
        return 0;
      }
      const searchTermNormalized = normalizeString(search);
      if (!searchTermNormalized) {
        return 1;
      }
      const productNameNormalized = normalizeString(product.name);
      const productSkuNormalized = normalizeString(product.sku);

      if (productNameNormalized.includes(searchTermNormalized) ||
          (productSkuNormalized && productSkuNormalized.includes(searchTermNormalized))) {
        return 1;
      }
      return 0;
    }, [products]);

    const toggleCameraScanning = () => {
      if (isCameraScanning) {
        setIsCameraScanning(false);
        setHasCameraPermission(null);
        setCameraError(null);
      } else {
        setIsCameraScanning(true);
      }
    };

    React.useEffect(() => {
      let stream: MediaStream | null = null;

      const startCamera = async () => {
        setHasCameraPermission(null); // Reset permission status
        setCameraError(null);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error: any) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          let errMsg = 'Không thể truy cập camera.';
          if (error.name === 'NotAllowedError') {
            errMsg = 'Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.';
          } else if (error.name === 'NotFoundError') {
            errMsg = 'Không tìm thấy thiết bị camera phù hợp.';
          }
          setCameraError(errMsg);
          toast({ variant: 'destructive', title: 'Lỗi Camera', description: errMsg });
          setIsCameraScanning(false); // Turn off scanning mode on error
        }
      };

      const stopCamera = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current && videoRef.current.srcObject) {
           try {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
           } catch (e) { console.warn("Error stopping video tracks:", e)}
           videoRef.current.srcObject = null;
        }
      };

      if (isCameraScanning) {
        startCamera();
      } else {
        stopCamera();
      }

      return () => { // Cleanup function
        stopCamera();
      };
    }, [isCameraScanning, toast]);

    // This function will be called by your chosen scanning library
    const handleScannedSku = (scannedSku: string) => {
      const normalizedScannedSku = normalizeString(scannedSku);
      const foundProduct = products.find(p => p.sku && normalizeString(p.sku) === normalizedScannedSku);

      if (foundProduct) {
        if (disabledProductIds.includes(foundProduct.id) || foundProduct.currentStock <= 0) {
            toast({ title: "Sản phẩm không hợp lệ", description: `Sản phẩm ${foundProduct.name} đã được chọn hoặc hết hàng.`, variant: "default" });
        } else {
            onProductSelect(foundProduct.id);
            setOpen(false); // Close the product selection popover
            toast({ title: "Đã chọn sản phẩm", description: `Đã tự động chọn: ${foundProduct.name} từ mã SKU.` });
        }
      } else {
        toast({ title: "Không tìm thấy sản phẩm", description: `Không tìm thấy sản phẩm với SKU: ${scannedSku}`, variant: "destructive" });
        // Optionally, you could try to set the command input's value to the scannedSku here
        // This is tricky with cmdk, might need to manage CommandInput value separately if desired
      }
      setIsCameraScanning(false); // Close camera view after attempting to process SKU
    };


    return (
      <Popover open={open} onOpenChange={(newOpenState) => {
        setOpen(newOpenState);
        if (!newOpenState) { // If popover is closing, ensure camera is also off
            setIsCameraScanning(false);
        }
      }}>
        <div className="flex items-center gap-2">
          <PopoverTrigger asChild className="flex-grow">
            <Button
              ref={ref}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between h-10", triggerClassName)}
              disabled={disabled || isCameraScanning} // Disable button if camera is scanning
            >
              {selectedProduct
                ? (
                    <span className="truncate">
                      {selectedProduct.name} (Tồn: {selectedProduct.currentStock})
                    </span>
                  )
                : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleCameraScanning}
            className="h-10 w-10 flex-shrink-0"
            aria-label={isCameraScanning ? "Đóng Camera" : "Mở Camera Quét Mã"}
            disabled={disabled && !isCameraScanning} // Disable if main select is disabled, unless camera is already open
          >
            {isCameraScanning ? <XCircle className="h-5 w-5" /> : <CameraIcon className="h-5 w-5" />}
          </Button>
        </div>

        {isCameraScanning && (
          <div className="mt-2 p-3 border rounded-md shadow-md bg-background">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted mb-2" autoPlay playsInline muted />
            {hasCameraPermission === false && cameraError && (
              <Alert variant="destructive" className="mb-2">
                <AlertTitle>Lỗi Camera</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}
             {hasCameraPermission === null && !cameraError && (
                <p className="text-sm text-muted-foreground text-center">Đang khởi tạo camera...</p>
            )}
            <div className="text-center text-sm p-2 border rounded-md bg-muted">
              <p className="font-semibold mb-1">TODO: Tích hợp thư viện quét mã vạch/QR code tại đây.</p>
              <p className="text-xs text-muted-foreground">Hướng camera vào mã SKU. Khi thư viện quét thành công, gọi hàm <code>handleScannedSku(decodedSku)</code> với mã SKU đã giải mã.</p>
            </div>
             <Button type="button" variant="outline" onClick={toggleCameraScanning} className="w-full mt-2">
                Hủy Quét
            </Button>
          </div>
        )}

        {!isCameraScanning && ( // Only show popover content if camera is not scanning
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command filter={commandFilter}>
              <CommandInput
                placeholder="Gõ tên hoặc SKU..."
                icon={<Search className="h-4 w-4" />}
              />
              <CommandList>
                <CommandEmpty>
                  {products.length === 0 ? "Không có sản phẩm nào." : "Không tìm thấy sản phẩm."}
                </CommandEmpty>
                <CommandGroup>
                  {products.map((product) => {
                    const isSelected = product.id === selectedProductId;
                    const isDisabledByStock = product.currentStock <= 0 && !isSelected;
                    const isDisabledBySelection = disabledProductIds.includes(product.id) && !isSelected;
                    const itemIsDisabled = isDisabledByStock || isDisabledBySelection;

                    let disabledReason = "";
                    if (isDisabledByStock) disabledReason = " (Hết hàng)";
                    else if (isDisabledBySelection) disabledReason = " (Đã chọn)";

                    return (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => {
                          if (itemIsDisabled && !isSelected) return;
                          onProductSelect(product.id === selectedProductId ? undefined : product.id)
                          setOpen(false)
                        }}
                        disabled={itemIsDisabled && !isSelected}
                        className={cn((itemIsDisabled && !isSelected) && "opacity-50 cursor-not-allowed")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 truncate">
                          {product.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            (SKU: {product.sku || "N/A"}, Tồn: {product.currentStock}{disabledReason})
                          </span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
            </PopoverContent>
        )}
      </Popover>
    )
  }
);
SearchableProductSelect.displayName = "SearchableProductSelect";

