
"use client";

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
import { ChevronDown } from 'lucide-react';

const LucideIcon = ({ name, className }: { name: NavLinkIcon; className?: string }) => {
  const IconComponent = Icons[name as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) {
    return <Icons.HelpCircle className={cn("h-4 w-4", className)} />;
  }
  return <IconComponent className={cn("h-4 w-4", className)} />;
};

export default function AppSidebarNavigation() {
  const pathname = usePathname();
  const { isMobile, state: sidebarState } = useSidebar();

  return (
    <nav className="flex flex-col gap-2 px-2 py-4">
      <TooltipProvider delayDuration={0}>
        <Accordion type="multiple" className="w-full">
          {navLinks.map((link, index) => {
            const isActiveParent = link.subLinks ? link.subLinks.some(subLink => pathname.startsWith(subLink.href)) : false;
            const isActiveDirect = pathname === link.href;

            return link.subLinks ? (
              <AccordionItem value={`item-${index}`} key={link.label} className="border-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <UiAccordionTrigger
                      asChild={true}
                      className={cn(
                        sidebarMenuButtonVariants({variant: "default", size: "default"}),
                        "justify-between",
                        // This targets the SVG inside the div that UiAccordionTrigger's asChild will pass props to.
                        // It assumes the div gets data-state="open".
                        "[&[data-state=open]>div[data-orientation=vertical]>svg:last-of-type]:rotate-180",
                        { "bg-sidebar-primary text-sidebar-primary-foreground font-medium": isActiveParent }
                      )}
                    >
                      {/* Single div child for UiAccordionTrigger when asChild is true */}
                      <div className="flex items-center justify-between w-full" data-orientation="vertical">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <LucideIcon name={link.icon as NavLinkIcon} />
                          <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">
                            {link.label}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            "group-data-[collapsible=icon]:hidden"
                          )}
                        />
                      </div>
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
                  <ul className="ml-2 border-l-sidebar-accent list-none">
                    {link.subLinks.map((subLink) => (
                      <li key={subLink.href} className="list-none">
                        <Link href={subLink.href} legacyBehavior={false}>
                          <a // This 'a' tag will be styled like SidebarMenuSubButton
                            href={subLink.href}
                            data-sidebar="menu-sub-button"
                            data-size="md" // Corresponds to text-sm
                            data-active={pathname === subLink.href || (pathname.startsWith(subLink.href) && subLink.href !== '/inventory')}
                            className={cn(
                              "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                              "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                              "text-sm", // Explicitly text-sm for 'md' size
                              "group-data-[collapsible=icon]:hidden"
                            )}
                          >
                            <LucideIcon name={subLink.icon as NavLinkIcon} className="mr-2" />
                            {subLink.label}
                          </a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ) : ( // Non-accordion item
              <li key={link.href} className="list-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        sidebarMenuButtonVariants({variant: "default", size: "default"}),
                        isActiveDirect && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      )}
                    >
                      <LucideIcon name={link.icon as NavLinkIcon} />
                      <span className="flex-1 min-w-0 truncate group-data-[collapsible=icon]:hidden">{link.label}</span>
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
