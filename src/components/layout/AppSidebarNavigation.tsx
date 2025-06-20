
"use client";

import * as React from 'react'; 
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenuButton, 
  useSidebar
} from '@/components/ui/sidebar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger as UiAccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { navLinks, NavLinkIcon } from '@/lib/types';
import * as Icons from 'lucide-react';

const LucideIcon = ({ name, className }: { name: NavLinkIcon; className?: string }) => {
  const IconComponent = Icons[name as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) {
    return <Icons.AlertCircle className={cn("h-4 w-4", className)} />;
  }
  return <IconComponent className={cn("h-4 w-4", className)} />;
};

export default function AppSidebarNavigation() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state: sidebarState, setOpen } = useSidebar(); // Added setOpen

  const handleLinkClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      <TooltipProvider delayDuration={0}>
        <Accordion type="multiple" className="w-full">
          {navLinks.map((link, index) => {
            const isActiveParent = link.subLinks ? link.subLinks.some(subLink => pathname.startsWith(subLink.href)) : false;
            const isActiveDirect = !link.subLinks && pathname === link.href;
            const isCollapsedAndDesktop = sidebarState === 'collapsed' && !isMobile;

            return link.subLinks ? (
              <AccordionItem value={`item-${index}`} key={link.label} className="border-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                     <UiAccordionTrigger
                        onClick={() => {
                          if (isCollapsedAndDesktop) {
                            setOpen(true); // Expand sidebar if collapsed and an accordion is clicked
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                          "h-8 text-sm", 
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", 
                          "text-[0.95rem] leading-snug", 
                          !isCollapsedAndDesktop && "justify-between", 
                          { "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 data-[state=open]:bg-sidebar-primary data-[state=open]:text-sidebar-primary-foreground": isActiveParent },
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-2 min-w-0",
                          !isCollapsedAndDesktop && "flex-1" 
                        )}>
                           <LucideIcon name={link.icon as NavLinkIcon} />
                           <span className={cn(
                             "min-w-0 truncate",
                             !isCollapsedAndDesktop && "flex-1",
                             isCollapsedAndDesktop && "hidden" 
                           )}>
                             {link.label}
                           </span>
                        </div>
                      </UiAccordionTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center"
                                  className={cn("bg-popover text-popover-foreground",
                                               {"hidden": !isCollapsedAndDesktop})}
                  >
                    {link.label}
                  </TooltipContent>
                </Tooltip>
                {/* AccordionContent is now always rendered, visibility controlled by accordion state & sidebar expansion */}
                <AccordionContent className="pb-0 pl-4"> 
                  <ul className="ml-4 my-1 space-y-1 list-none border-l border-sidebar-border pl-2">
                    {link.subLinks.map((subLink) => (
                      <li key={subLink.href} className="list-none">
                        <SidebarMenuButton 
                          asChild
                          size="sm"
                          isActive={pathname === subLink.href || (pathname.startsWith(subLink.href) && subLink.href !== '/inventory')}
                          onClick={handleLinkClick}
                          className="pl-3"
                        >
                          <Link href={subLink.href}>
                            <LucideIcon name={subLink.icon as NavLinkIcon} className="h-3.5 w-3.5"/>
                            {/* Label visibility handled by SidebarMenuButton for collapsed state */}
                            <span>{subLink.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <li key={link.href} className="list-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      size="default" // Ensure this is "default" or another appropriate size
                      isActive={isActiveDirect}
                      onClick={handleLinkClick}
                      className={cn(
                        "text-[0.95rem] leading-snug",
                      )}
                    >
                      <Link href={link.href}>
                        <LucideIcon name={link.icon as NavLinkIcon} />
                        <span className={cn(
                          "flex-1 min-w-0 truncate",
                           isCollapsedAndDesktop && "hidden" // Label visibility in collapsed mode
                        )}>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                   <TooltipContent side="right" align="center"
                                  className={cn("bg-popover text-popover-foreground",
                                               {"hidden": !isCollapsedAndDesktop})}
                  >
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </Accordion>
      </TooltipProvider>
    </nav>
  );
}

