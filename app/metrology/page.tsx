
'use client';

import { useState, useEffect } from 'react';
import type { Inspector } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, PcCase, ArrowRight } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Badge } from '@/components/ui/badge';

export default function MetrologyPage() {
  const { currentUser, isLoading: authLoading } = useAuth();

  if (authLoading || !currentUser) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-6 bg-background">
            <AppLogo size="lg" />
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">Загрузка...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/50">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8 justify-center md:justify-start">
                <h2 className="font-headline text-3xl font-semibold">Метрология</h2>
                <Badge variant="outline" className="text-sm border-primary/50 text-primary bg-primary/10">В разработке</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Smartphone className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Приборы ЗИП</CardTitle>
                                <CardDescription>Описание</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <div className="p-6 pt-0 mt-auto">
                         <Button variant="outline" className="w-full" disabled>
                            Перейти к ЗИП <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <PcCase className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Комплексная поверка</CardTitle>
                                <CardDescription>Описание</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                     <div className="p-6 pt-0 mt-auto">
                        <Button variant="outline" className="w-full" disabled>
                            Начать поверку <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
