
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataEntry } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Loader2, Archive, ChevronDown, Info, ArrowLeft, Smartphone, PcCase, ArrowRight, Trash2, ExternalLink, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { getEntries, deleteDataEntry, upsertDataEntry } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type MetrologyView = 'main' | 'zip';

export default function MetrologyPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [view, setView] = useState<MetrologyView>('main');


  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const allEntries = await getEntries();
      setEntries(allEntries);
    } catch (error) {
      toast({ title: "Ошибка загрузки", description: "Не удалось получить данные.", variant: "destructive" });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const handleDeleteEntry = async (id: string) => {
    const entryToDelete = entries.find(entry => entry.id === id);
    if (!entryToDelete) return;
    try {
      await deleteDataEntry(id);
      toast({ title: "Запись удалена", description: `Запись для S/N ${entryToDelete.serialNumber} удалена.`});
      fetchData(); 
    } catch(error) {
       toast({ title: "Ошибка удаления", description: "Не удалось удалить запись.", variant: "destructive"});
    }
  };

  const handleToggleArshinVerified = async (entry: DataEntry) => {
    if (!currentUser) return;
    const updatedEntry = {
      ...entry,
      measuredValues: {
        ...entry.measuredValues,
        arshinVerified: !entry.measuredValues.arshinVerified,
      }
    };

    try {
      await upsertDataEntry(updatedEntry, currentUser.id);
      fetchData();
      toast({
        title: "Статус обновлен",
        description: `Статус 'В Аршине' для S/N ${entry.serialNumber} был изменен.`,
      });
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить статус.", variant: "destructive" });
    }
  };

  const handleCheckArshin = (serialNumber: string) => {
    const arshinSearchUrl = `https://fgis.gost.ru/fundmetrology/cm/results?search=${encodeURIComponent(serialNumber)}`;
    window.open(arshinSearchUrl, '_blank');
  };

  const zipThermometers = useMemo(() => {
    return entries.filter(entry => 
        (entry.deviceType === 'thermometer' || entry.measuredValues.subDeviceType === 'thermometer') 
        && entry.measuredValues.zipCode);
  }, [entries]);

  const groupedZipEntries = useMemo(() => {
    return zipThermometers.reduce((acc, entry) => {
      const zipCode = entry.measuredValues.zipCode as string;
      if (!acc[zipCode]) {
        acc[zipCode] = [];
      }
      acc[zipCode].push(entry);
      return acc;
    }, {} as Record<string, DataEntry[]>);
  }, [zipThermometers]);

  const renderEntryContent = (entry: DataEntry) => {
    return (
        <AccordionItem value={entry.id} key={entry.id} className="border rounded-md shadow-sm bg-card">
            <AccordionTrigger className="p-3 hover:no-underline group">
                <div className="flex justify-between items-center w-full">
                    <div className="flex-1 text-left">
                        <p className="font-semibold font-code text-primary">{entry.serialNumber}</p>
                        <p className="text-xs text-muted-foreground">{entry.deviceName}</p>
                        <p className="text-xs text-muted-foreground">
                            Запись от: {format(new Date(entry.timestamp), "dd.MM.yy HH:mm", { locale: ru })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                         {entry.measuredValues.arshinVerified ? (
                          <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> В Аршине
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="border-red-400/50 bg-red-50 text-red-600">
                             <AlertCircle className="h-3 w-3 mr-1" /> Требует подтверждения
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-[#6293dd] text-[#6293dd] bg-[#6293dd]/10">
                            <Archive className="h-3 w-3 mr-1"/> ЗИП: {entry.measuredValues.zipCode}
                        </Badge>
                        <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border-t">
                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-2">
                       <Button
                          variant={entry.measuredValues.arshinVerified ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleToggleArshinVerified(entry)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {entry.measuredValues.arshinVerified ? "Отменить подтверждение" : "Подтвердить занесение в Аршин"}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckArshin(entry.serialNumber)}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Проверить в Аршин
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Удалить
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Это действие удалит запись для S/N {entry.serialNumber} безвозвратно.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>Удалить</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
  };


  if (authLoading || !currentUser || isDataLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-6 bg-background">
            <AppLogo size="lg" />
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">Загрузка данных метрологии...</p>
            </div>
        </div>
    );
  }

  const renderZipView = () => {
    const unverifiedCounts = Object.entries(groupedZipEntries).reduce((acc, [code, entries]) => {
      acc[code] = entries.filter(e => !e.measuredValues.arshinVerified).length;
      return acc;
    }, {} as Record<string, number>);

    return (
     <div className="max-w-6xl mx-auto animation-fadeInUp">
        <Button
            variant="outline"
            className="mb-4"
            onClick={() => setView('main')}
            >
            <ArrowLeft className="mr-2 h-4 w-4" /> Назад к выбору
        </Button>
        <div className="flex items-center gap-3 mb-8 justify-center md:justify-start">
            <h2 className="font-headline text-3xl font-semibold">Приборы ЗИП</h2>
        </div>
        {Object.keys(groupedZipEntries).length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedZipEntries).sort(([a], [b]) => a.localeCompare(b)).map(([code, zipGroupEntries]) => (
                <AccordionItem value={`zip-${code}`} key={`zip-${code}`} className="border rounded-md shadow-sm bg-[#6293dd]/10 border-[#6293dd]/30">
                    <AccordionTrigger className="p-3 hover:no-underline group">
                        <div className="flex items-center gap-3">
                        <Archive className="h-5 w-5 text-[#6293dd]"/>
                        <div className="text-left">
                            <p className="font-semibold text-[#0f3a7e]">Группа ЗИП Термометров: {code}</p>
                            <p className="text-xs text-[#6293dd]/80">{zipGroupEntries.length} шт.</p>
                        </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {unverifiedCounts[code] > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Bell className="h-5 w-5 text-red-500 animate-pulse" />
                                    <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                      {unverifiedCounts[code]}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{unverifiedCounts[code]} термометр(ов) требует подтверждения.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            )}
                            <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-2 border-t border-[#6293dd]/30 bg-card">
                        <Accordion type="multiple" className="w-full space-y-2">
                        {zipGroupEntries
                            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map(entry => renderEntryContent(entry))
                        }
                        </Accordion>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        ) : (
             <Card className="shadow-lg mt-6">
                <CardHeader>
                <CardTitle>Приборы ЗИП не найдены</CardTitle>
                <CardDescription>
                    Для добавления прибора в ЗИП, воспользуйтесь соответствующей функцией при поверке термометра.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Info className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                    Как только вы добавите термометр в ЗИП, он появится здесь.
                    </p>
                </div>
                </CardContent>
            </Card>
        )}
    </div>
  )};

  const renderMainView = () => (
     <div className="max-w-2xl mx-auto animation-fadeInUp">
        <div className="flex items-center gap-3 mb-8 justify-center md:justify-start">
            <h2 className="font-headline text-3xl font-semibold">Метрология</h2>
            <Badge variant="outline">В разработке</Badge>
        </div>
        <div className="space-y-4">
             <Card className="shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setView('zip')}>
                <CardContent className="p-4 flex items-center space-x-4">
                     <div className="p-3 bg-primary/10 rounded-full">
                        <Smartphone className="h-8 w-8 text-primary"/>
                     </div>
                     <div className="flex-1">
                        <p className="font-semibold text-xl">Приборы ЗИП</p>
                        <p className="text-sm text-muted-foreground">Просмотр и управление термометрами, добавленными в запасной фонд.</p>
                        <div className="text-sm text-primary font-medium mt-2 flex items-center">
                            Перейти к ЗИП <ArrowRight className="ml-1 h-4 w-4"/>
                        </div>
                     </div>
                </CardContent>
             </Card>
             <Card className="shadow-lg cursor-not-allowed opacity-60">
                <CardContent className="p-4 flex items-center space-x-4">
                     <div className="p-3 bg-muted rounded-full">
                        <PcCase className="h-8 w-8 text-muted-foreground"/>
                     </div>
                     <div className="flex-1">
                        <p className="font-semibold text-xl">Комплексная поверка</p>
                        <p className="text-sm text-muted-foreground">Просмотр сводных данных по комплексным поверкам (в разработке).</p>
                        <div className="text-sm text-muted-foreground font-medium mt-2 flex items-center">
                            Перейти <ArrowRight className="ml-1 h-4 w-4"/>
                        </div>
                     </div>
                </CardContent>
             </Card>
        </div>
     </div>
  );


  return (
    <div className="flex min-h-screen bg-muted/50">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {view === 'main' ? renderMainView() : renderZipView()}
      </main>
    </div>
  );
}
