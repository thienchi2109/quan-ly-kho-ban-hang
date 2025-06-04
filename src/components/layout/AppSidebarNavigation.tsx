"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { navLinks, NavLinkIcon } from '@/lib/types';
import * as Icons from 'lucide-react';

const LucideIcon = ({ name, className }: { name: NavLinkIcon; className?: string }) => {
  const IconComponent = Icons[name as keyof typeof Icons] as React.ElementType;
  if (!IconComponent) {
    // Fallback icon or handle error
    return <Icons.HelpCircle className={className} />;
  }
  return <IconComponent className={cn("h-4 w-4", className)} />;
};

export default function AppSidebarNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2 py-4">
      <Accordion type="multiple" className="w-full">
        {navLinks.map((link, index) => (
          link.subLinks ? (
            <AccordionItem value={`item-${index}`} key={link.label} className="border-none">
              <AccordionTrigger className="p-0 hover:no-underline">
                <SidebarMenuButton 
                  asChild={false} 
                  className="w-full justify-start"
                  isActive={link.subLinks.some(subLink => pathname.startsWith(subLink.href))}
                  tooltip={{children: link.label, className: "bg-popover text-popover-foreground"}}
                >
                  <LucideIcon name={link.icon as NavLinkIcon} />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{link.label}</span>
                </SidebarMenuButton>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pl-4 group-data-[collapsible=icon]:hidden">
                <SidebarMenuSub className="ml-2 border-l-sidebar-accent">
                  {link.subLinks.map((subLink) => (
                    <SidebarMenuSubItem key={subLink.href}>
                      <Link href={subLink.href} passHref legacyBehavior>
                        <SidebarMenuSubButton
                          asChild={false}
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
                  asChild={false}
                  isActive={pathname === link.href}
                  tooltip={{children: link.label, className: "bg-popover text-popover-foreground"}}
                >
                  <LucideIcon name={link.icon as NavLinkIcon} />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        ))}
      </Accordion>
    </nav>
  );
}
