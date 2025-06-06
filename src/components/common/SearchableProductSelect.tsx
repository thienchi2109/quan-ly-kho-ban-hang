
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

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
    const selectedProduct = products.find(p => p.id === selectedProductId);

    const normalizeString = (str: string | undefined | null): string => {
      if (!str) return "";
      return str
        .normalize("NFD") // Tách chữ cái gốc và dấu
        .replace(/[\u0300-\u036f]/g, "") // Loại bỏ các ký tự dấu
        .toLowerCase() // Chuyển sang chữ thường
        .trim(); // Loại bỏ khoảng trắng thừa
    };

    // Hàm filter cho Command, cmdk sẽ sử dụng hàm này
    const commandFilter = React.useCallback((itemValue: string, search: string): number => {
      const product = products.find(p => p.id === itemValue);
      if (!product) {
        return 0; // Không tìm thấy sản phẩm, không khớp
      }

      const searchTermNormalized = normalizeString(search);

      // Nếu không có chuỗi tìm kiếm (sau khi chuẩn hóa), hiển thị tất cả
      if (!searchTermNormalized) {
        return 1;
      }

      const productNameNormalized = normalizeString(product.name);
      const productSkuNormalized = normalizeString(product.sku); // product.sku có thể là undefined

      if (productNameNormalized.includes(searchTermNormalized) || 
          (productSkuNormalized && productSkuNormalized.includes(searchTermNormalized))) {
        return 1; // Khớp
      }

      return 0; // Không khớp
    }, [products]);


    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between h-10", triggerClassName)}
            disabled={disabled}
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
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command filter={commandFilter}> {/* Sử dụng filter của Command */}
            <CommandInput
              placeholder="Gõ tên hoặc SKU..."
              // Không cần value và onValueChange ở đây, cmdk sẽ tự xử lý
              icon={<Search className="h-4 w-4" />}
            />
            <CommandList>
              <CommandEmpty>
                {products.length === 0 ? "Không có sản phẩm nào." : "Không tìm thấy sản phẩm."}
              </CommandEmpty>
              <CommandGroup>
                {/* Duyệt qua toàn bộ products, Command sẽ lọc dựa trên commandFilter */}
                {products.map((product) => {
                  const isSelected = product.id === selectedProductId;
                  // Sản phẩm bị disable nếu hết hàng (và chưa được chọn) HOẶC đã được chọn ở dòng khác
                  const isDisabledByStock = product.currentStock <= 0 && !isSelected;
                  const isDisabledBySelection = disabledProductIds.includes(product.id) && !isSelected;
                  const itemIsDisabled = isDisabledByStock || isDisabledBySelection;

                  let disabledReason = "";
                  if (isDisabledByStock) disabledReason = " (Hết hàng)";
                  else if (isDisabledBySelection) disabledReason = " (Đã chọn)";

                  return (
                    <CommandItem
                      key={product.id}
                      value={product.id} // value là ID, commandFilter sẽ dùng ID này để lấy product đầy đủ
                      onSelect={() => {
                        if (itemIsDisabled && !isSelected) return; // Không cho chọn nếu disabled (và không phải là item đang selected)
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
      </Popover>
    )
  }
);
SearchableProductSelect.displayName = "SearchableProductSelect";
