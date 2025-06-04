"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

interface FormModalProps<TFormValues> {
  triggerButton: React.ReactNode;
  title: string;
  description?: string;
  formId: string;
  children: (closeModal: () => void) => React.ReactNode; // Pass close function to children
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FormModal<TFormValues>({
  triggerButton,
  title,
  description,
  formId,
  children,
  defaultOpen = false,
  onOpenChange
}: FormModalProps<TFormValues>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };
  
  const closeModal = () => handleOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:sm:max-w-[600px] lg:md:sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        {/* Render children, passing the closeModal function */}
        {children(closeModal)} 
        
        {/* Footer is typically part of the form now, handled by children */}
        {/* <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Hủy</Button>
          </DialogClose>
          <Button type="submit" form={formId}>Lưu</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
