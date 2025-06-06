
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

export function SearchableProductSelect({
  products,
  selectedProductId,
  onProductSelect,
  disabledProductIds = [],
  placeholder = "Tìm sản phẩm...",
  disabled = false,
  triggerClassName,
}: SearchableProductSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Filter products based on search value for display
  const filteredProducts = React.useMemo(() => {
    if (!searchValue) {
      return products;
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [products, searchValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
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
            value={searchValue}
            onValueChange={setSearchValue}
            icon={<Search className="h-4 w-4" />} 
          />
          <CommandList>
            <CommandEmpty>{searchValue ? "Không tìm thấy sản phẩm." : "Gõ để tìm kiếm..."}</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => {
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
                    onSelect={(currentValue) => {
                      if (itemIsDisabled && !isSelected) return; // Prevent selection of disabled items unless it's already selected
                                                                // (to allow deselecting it)
                      onProductSelect(product.id === selectedProductId ? undefined : product.id)
                      setOpen(false)
                      setSearchValue("") // Reset search on select
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
