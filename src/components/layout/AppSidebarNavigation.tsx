
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'; // SidebarMenu component itself is not used directly here for structure
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger as UiAccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { navLinks, NavLinkIcon } from '@/lib/types';
import * as Icons from 'lucide-react';

const LucideIcon = ({ name, className }: { name: NavLinkIcon; className?: string }) => {
  const IconComponent = Icons[name as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) {
    return <Icons.HelpCircle className={className} />;
  }
  return <IconComponent className={cn("h-4 w-4", className)} />;
};

export default function AppSidebarNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2 py-4">
      <TooltipProvider delayDuration={0}>
        <Accordion type="multiple" className="w-full">
          {navLinks.map((link, index) => (
            link.subLinks ? (
              <AccordionItem value={`item-${index}`} key={link.label} className="border-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Use the AccordionTrigger from ui/accordion directly, styled to look like a button */}
                    <UiAccordionTrigger
                      className={cn(
                        "p-2 rounded-md text-sm w-full",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline",
                        // Simulate button structure
                        "flex items-center gap-2 justify-start", // Ensure justify-start for proper layout with chevron
                        "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center",
                        {
                          "bg-sidebar-accent text-sidebar-accent-foreground font-medium": link.subLinks.some(subLink => pathname.startsWith(subLink.href))
                        }
                      )}
                    >
                      <LucideIcon name={link.icon as NavLinkIcon} />
                      <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">
                        {link.label}
                      </span>
                      {/* ChevronDown is automatically added by UiAccordionTrigger unless asChild is true on UiAccordionTrigger itself */}
                    </UiAccordionTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" className="bg-popover text-popover-foreground group-data-[collapsible=icon]:block hidden">
                    {link.label}
                  </TooltipContent>
                </Tooltip>
                <AccordionContent className="pb-0 pl-4 group-data-[collapsible=icon]:hidden">
                  <SidebarMenuSub className="ml-2 border-l-sidebar-accent">
                    {link.subLinks.map((subLink) => (
                      <SidebarMenuSubItem key={subLink.href}>
                        <Link href={subLink.href} passHref legacyBehavior>
                          <SidebarMenuSubButton
                            asChild={false} // SidebarMenuSubButton renders its own <a> or <button>
                            isActive={pathname === subLink.href || (pathname.startsWith(subLink.href) && subLink.href !== '/inventory')}
                            className="text-sm"
                          >
                            <LucideIcon name={subLink.icon as NavLinkIcon} className="mr-2" />
                            {subLink.label}
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild={false} // SidebarMenuButton renders its own <button>
                    isActive={pathname === link.href}
                    tooltip={{ children: link.label, className: "bg-popover text-popover-foreground" }}
                  >
                    <LucideIcon name={link.icon as NavLinkIcon} />
                    <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
          ))}
        </Accordion>
      </TooltipProvider>
    </nav>
  );
}

