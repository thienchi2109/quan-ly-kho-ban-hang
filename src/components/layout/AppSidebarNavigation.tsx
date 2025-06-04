
"use client";

import * as React from 'react'; // Added this line
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  sidebarMenuButtonVariants,
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
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();

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

            return link.subLinks ? (
              <AccordionItem value={`item-${index}`} key={link.label} className="border-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                     <UiAccordionTrigger // Removed asChild here
                        className={cn(
                          sidebarMenuButtonVariants({variant: "default", size: "default"}),
                          "justify-between", // Ensure space between content and chevron
                          { "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90": isActiveParent },
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                           <LucideIcon name={link.icon as NavLinkIcon} />
                           <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">
                             {link.label}
                           </span>
                        </div>
                         {/* Chevron will be rendered by UiAccordionTrigger internally */}
                      </UiAccordionTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center"
                                  className={cn("bg-popover text-popover-foreground",
                                               {"hidden": !(sidebarState === 'collapsed' && !isMobile)})}
                  >
                    {link.label}
                  </TooltipContent>
                </Tooltip>
                <AccordionContent className="pb-0 pl-4 group-data-[collapsible=icon]:hidden">
                  <ul className="ml-4 my-1 space-y-1 list-none border-l border-sidebar-border pl-2">
                    {link.subLinks.map((subLink) => (
                      <li key={subLink.href} className="list-none">
                        <Link
                          href={subLink.href}
                          legacyBehavior passHref
                        >
                          <a
                            onClick={handleLinkClick}
                            className={cn(
                              sidebarMenuButtonVariants({variant: "default", size: "sm"}),
                              "pl-3",
                              (pathname === subLink.href || (pathname.startsWith(subLink.href) && subLink.href !== '/inventory')) && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                            )}
                          >
                            <LucideIcon name={subLink.icon as NavLinkIcon} className="h-3.5 w-3.5"/>
                            <span className="group-data-[collapsible=icon]:hidden">{subLink.label}</span>
                          </a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <li key={link.href} className="list-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Link
                      href={link.href}
                      legacyBehavior passHref
                    >
                      <a
                        onClick={handleLinkClick}
                        className={cn(
                          sidebarMenuButtonVariants({variant: "default", size: "default"}),
                          isActiveDirect && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        )}
                      >
                        <LucideIcon name={link.icon as NavLinkIcon} />
                        <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">{link.label}</span>
                      </a>
                    </Link>
                  </TooltipTrigger>
                   <TooltipContent side="right" align="center"
                                  className={cn("bg-popover text-popover-foreground",
                                               {"hidden": !(sidebarState === 'collapsed' && !isMobile)})}
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

