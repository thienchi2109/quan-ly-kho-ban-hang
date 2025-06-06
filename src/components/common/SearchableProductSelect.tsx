
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
    const [internalSearchValue, setInternalSearchValue] = React.useState("")

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const displayedProducts = React.useMemo(() => {
      if (!internalSearchValue) {
        return products;
      }
      const searchTerm = internalSearchValue.toLowerCase();
      return products.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const skuMatch = product.sku ? product.sku.toLowerCase().includes(searchTerm) : false;
        return nameMatch || skuMatch;
      });
    }, [products, internalSearchValue]);

    return (
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setInternalSearchValue(""); // Reset search on close
        }
      }}>
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
          <Command>
            <CommandInput
              placeholder="Gõ tên hoặc SKU..."
              value={internalSearchValue}
              onValueChange={setInternalSearchValue}
              icon={<Search className="h-4 w-4" />}
            />
            <CommandList>
              <CommandEmpty>
                {internalSearchValue
                  ? "Không tìm thấy sản phẩm."
                  : (products.length === 0 ? "Không có sản phẩm nào." : "Gõ để tìm sản phẩm...")}
              </CommandEmpty>
              <CommandGroup>
                {displayedProducts.map((product) => {
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
                      value={product.id} // Important: cmdk uses this for its internal value handling
                      onSelect={() => { // Use onSelect on CommandItem for selection logic
                        if (itemIsDisabled && !isSelected) return;
                        onProductSelect(product.id === selectedProductId ? undefined : product.id)
                        setOpen(false)
                        setInternalSearchValue("") // Reset search on select
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

