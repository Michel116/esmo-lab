
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Inspector } from '@/types';
import { LayoutDashboard, Ruler, LogOut, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Поверка приборов', icon: LayoutDashboard },
  { href: '/journal', label: 'Журнал', icon: FileText },
  { href: '/metrology', label: 'Метрология', icon: Ruler },
  { href: '/account', label: 'Настройки', icon: Settings },
];

interface SidebarProps {
  currentUser: Inspector | null;
  className?: string;
}

export function Sidebar({ currentUser, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('datafill-currentUser');
    router.push('/login');
  };

  return (
    <aside className={cn("hidden lg:flex h-screen w-64 flex-col border-r bg-card text-card-foreground", className)}>
      <div className="flex h-20 items-center justify-center p-4">
        <Link href="/">
          <AppLogo size="md" />
        </Link>
      </div>
      <div className="px-4 text-center">
        {currentUser && (
          <Card className="bg-transparent border-none shadow-none text-center">
            <CardContent className="p-0">
              <p className="font-semibold text-lg">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser.role}</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Separator className="mx-4 w-auto my-4"/>
      
      <nav className="flex-grow px-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={pathname.startsWith(item.href) ? 'default' : 'ghost'}
              className="justify-start w-full text-base h-12"
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            </Button>
          ))}
      </nav>

      <div className="p-4 border-t">
        <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-500 h-12 text-base">
          <LogOut className="mr-3 h-5 w-5" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}
