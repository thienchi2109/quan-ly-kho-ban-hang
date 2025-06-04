
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  // DialogFooter, // Removed as it's handled by children
  // DialogClose // Removed as it's handled by children
} from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button"; // Removed as it's handled by children
import React, { useState, useEffect } from "react";

interface FormModalProps<TFormValues> {
  triggerButton?: React.ReactNode; // Make trigger optional if controlled
  title: string;
  description?: string;
  formId: string;
  children: (closeModal: () => void) => React.ReactNode; // Pass close function to children
  open?: boolean; // New: To control the dialog from outside
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FormModal<TFormValues>({
  triggerButton,
  title,
  description,
  formId,
  children,
  open: openProp, // Renamed for clarity
  defaultOpen = false,
  onOpenChange
}: FormModalProps<TFormValues>) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp! : internalIsOpen;

  // Removed problematic useEffect that was resetting internalIsOpen

  // Effect to handle changes to the controlled 'openProp'
  useEffect(() => {
    if (isControlled) {
      // If parent changes openProp, this ensures the Dialog component itself is aware.
      // The Dialog's own onOpenChange will typically handle calling our handleOpenChange.
    }
  }, [openProp, isControlled]);


  const handleOpenChange = (currentOpenState: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(currentOpenState);
    }
    if (onOpenChange) {
      onOpenChange(currentOpenState);
    }
  };
  
  const closeModal = () => handleOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Only render DialogTrigger if not controlled and triggerButton exists */}
      {!isControlled && triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      
      {/* DialogContent should be rendered based on the 'isOpen' state to allow animations and proper mounting/unmounting */}
      {isOpen && (
        <DialogContent className="sm:max-w-[425px] md:sm:max-w-[600px] lg:md:sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          
          {children(closeModal)} 
          
        </DialogContent>
      )}
    </Dialog>
  );
}

