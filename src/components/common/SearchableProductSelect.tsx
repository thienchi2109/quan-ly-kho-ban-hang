
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
import { useToast } from "@/hooks/use-toast"

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
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();

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
        return 1; // Show all if search is empty
      }
      const productNameNormalized = normalizeString(product.name);
      const productSkuNormalized = normalizeString(product.sku);

      if (productNameNormalized.includes(searchTermNormalized) ||
          (productSkuNormalized && productSkuNormalized.includes(searchTermNormalized))) {
        return 1; // Match
      }
      return 0; // No match
    }, [products, normalizeString]);


    const handleCommandValueChange = (searchValue: string) => {
      const normalizedSearchValue = normalizeString(searchValue);
      if (!normalizedSearchValue) return; // Don't auto-select on empty input

      const matchedProduct = products.find(p => {
        const normalizedSku = normalizeString(p.sku);
        return normalizedSku && normalizedSku === normalizedSearchValue &&
               p.currentStock > 0 &&
               !disabledProductIds.includes(p.id);
      });

      if (matchedProduct) {
        onProductSelect(matchedProduct.id);
        setOpen(false);
        toast({
          title: "Đã chọn sản phẩm",
          description: `Đã tự động chọn: ${matchedProduct.name} từ mã SKU: ${searchValue}.`
        });
      }
      // If no exact SKU match, the commandFilter will handle displaying potential matches
      // for name or partial SKU for manual selection.
    };

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
            {selectedProductId && products.find(p => p.id === selectedProductId)
              ? (
                  <span className="truncate">
                    {products.find(p => p.id === selectedProductId)?.name} (Tồn: {products.find(p => p.id === selectedProductId)?.currentStock})
                  </span>
                )
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command filter={commandFilter} onValueChange={handleCommandValueChange}>
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
                      value={product.id} // This value is used by commandFilter and onValueChange implicitly
                      onSelect={(currentValue) => { // currentValue is product.id
                        if (itemIsDisabled && !isSelected) return;
                        onProductSelect(currentValue === selectedProductId ? undefined : currentValue)
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
