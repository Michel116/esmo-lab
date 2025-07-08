
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Inspector, DataEntry, ProtocolTemplate } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataTable } from '@/components/dashboard/DataTable';
import { Loader2, FileUp, Trash2, FileSpreadsheet, Download, HelpCircle, ChevronDown } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { getEntries, deleteDataEntry, clearAllEntries, getProtocolTemplates, addProtocolTemplate, deleteProtocolTemplate } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

export default function JournalPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [dataEntries, setDataEntries] = useState<DataEntry[]>([]);
  const [protocolTemplates, setProtocolTemplates] = useState<ProtocolTemplate[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isTemplatesVisible, setIsTemplatesVisible] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [entries, templates] = await Promise.all([
        getEntries(),
        getProtocolTemplates()
      ]);
      setDataEntries(entries);
      setProtocolTemplates(templates);
    } catch (error) {
      toast({ title: "Ошибка загрузки данных", description: "Не удалось получить данные журнала.", variant: "destructive"});
    } finally {
      setIsDataLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    fetchData();
  }, [currentUser, fetchData]);

  const handleDeleteEntry = async (id: string) => {
    const entryToDelete = dataEntries.find(entry => entry.id === id);
    if (!entryToDelete) return;
    try {
      await deleteDataEntry(id);
      await fetchData();
      toast({ title: "Запись удалена", description: `Запись для S/N ${entryToDelete.serialNumber} удалена.`});
    } catch(error) {
       toast({ title: "Ошибка удаления", description: "Не удалось удалить запись.", variant: "destructive"});
    }
  };

  const handleClearAllEntries = async () => {
    try {
      await clearAllEntries();
      await fetchData();
      toast({ title: "Все записи очищены", description: "Все собранные данные были удалены."});
    } catch(error) {
      toast({ title: "Ошибка", description: "Не удалось очистить журнал.", variant: "destructive"});
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        toast({ title: "Неверный формат", description: "Пожалуйста, загрузите файл в формате .xlsx", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        const newTemplateData: Omit<ProtocolTemplate, 'id'> = {
            name: file.name,
            fileContent: fileContent.split(',')[1], // get base64 part
        };
        try {
          await addProtocolTemplate(newTemplateData);
          await fetchData();
          toast({ title: "Шаблон загружен", description: `Файл "${file.name}" успешно добавлен.` });
        } catch(error) {
          toast({ title: "Ошибка загрузки", description: "Не удалось сохранить шаблон.", variant: "destructive" });
        }
    };
    reader.onerror = () => {
        toast({ title: "Ошибка чтения", description: "Не удалось прочитать файл.", variant: "destructive" });
    }
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const templateToDelete = protocolTemplates.find(t => t.id === id);
    if (!templateToDelete) return;
    try {
      await deleteProtocolTemplate(id);
      await fetchData();
      toast({ title: "Шаблон удален", description: `Шаблон "${templateToDelete.name}" был удален.` });
    } catch(error) {
      toast({ title: "Ошибка удаления", description: "Не удалось удалить шаблон.", variant: "destructive"});
    }
  };

  const handleDownloadTemplate = (template: ProtocolTemplate) => {
    try {
        const byteCharacters = atob(template.fileContent);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = template.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Загрузка начата", description: `Файл "${template.name}" скачивается.` });
    } catch (error) {
        console.error("Ошибка скачивания шаблона:", error);
        toast({ title: "Ошибка", description: "Не удалось скачать шаблон.", variant: "destructive" });
    }
  };


  if (authLoading || !currentUser || isDataLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-6 bg-background">
            <AppLogo size="lg" />
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">Загрузка журнала...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/50">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
                <DataTable 
                    entries={dataEntries} 
                    onDeleteEntry={handleDeleteEntry} 
                    onClearAllEntries={handleClearAllEntries} 
                    protocolTemplates={protocolTemplates}
                />
            </div>
            <div className="xl:col-span-1">
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start w-full">
                            <div>
                                <CardTitle>Шаблоны протоколов</CardTitle>
                                <CardDescription>Загрузите и управляйте шаблонами .xlsx для генерации протоколов.</CardDescription>
                            </div>
                            <div className="flex items-center">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="link" className="text-orange-500 hover:text-foreground/80 p-0 h-auto">
                                            <span>Инструкция</span>
                                            <HelpCircle className="h-4 w-4 ml-1" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Инструкция по созданию шаблонов</DialogTitle>
                                            <DialogDescription>
                                                {'Используйте эти формулы в ячейках вашего Excel-файла. Программа автоматически заменит их на данные из программы.'}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="h-96 pr-4">
                                            <div className="space-y-4 py-4 text-sm">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Общие формулы (для всех приборов)</h4>
                                                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ПРИБОР}}'}</code> — Название прибора (напр.,Термометры).</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{СЕРИЙНЫЙ_НОМЕР}}'}</code> — Серийный номер устройства.</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ДАТА_ПОВЕРКИ}}'}</code> — Дата и время завершения поверки.</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ФАМИЛИЯ_ПОВЕРИТЕЛЯ}}'}</code> — Фамилия сотрудника.</li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Формула для Термометров</h4>
                                                    <p className="text-muted-foreground">Для каждой точки поверки (от 1 до 3) используйте соответствующий номер в формуле (напр., _1 для первой, _2 для второй, и т.д)</p>
                                                    <ul className="list-disc space-y-1 pl-5 mt-1 text-muted-foreground">
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_1}}'}</code> — 1 измерение (введенное значение)</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_2}}'}</code> — 2 измерение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_3}}'}</code> — 3 измерение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_СРЕДНЕЕ}}'}</code> — Рассчитанная средняя температура (с поправкой)</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ВЫВОД}}'}</code> — Вердикт для точки ("Годен" / "Брак")</li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">Формулы для Алкотестеров</h4>
                                                    <p className="text-muted-foreground">Для каждой точки поверки (от 1 до 6) используйте соответствующий номер в формуле.</p>
                                                    <ul className="list-disc space-y-1 pl-5 mt-1 text-muted-foreground">
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ЭТАЛОН_MG_L}}'}</code> — Эталонное значение в мг/л.</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_1}}'}</code> — 1 измерение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_2}}'}</code> — 2 измерение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ИЗМ_3}}'}</code> — 3 измерение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_СРЕДНЕЕ}}'}</code> — Рассчитанное среднее значение</li>
                                                        <li><code className="font-code bg-muted px-1 py-0.5 rounded text-foreground">{'{{ТОЧКА_1_ВЫВОД}}'}</code> — Вердикт для точки ("Годен" / "Брак")</li>
                                                    </ul>
                                                </div>
                                                <div className="border-t pt-4 space-y-4">
                                                    <div>
                                                        <div className="text-muted-foreground">
                                                            <strong>Пример:</strong>
                                                            <div>
                                                                {' Разберем пример: если нам нужно, чтобы в шаблоне автоматически определялся прибор, вставляем в ячейку данную формулу — {{ПРИБОР}} — и загружаем в программу.'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Separator />
                                                    <div>
                                                        <div className="text-muted-foreground">
                                                            <strong className="text-orange-500">Важно:</strong>
                                                            <div>
                                                                {' вписывайте метки в ячейки именно так, как они показаны, включая двойные скобки. '}
                                                                {'Можите их просто скопировать.'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="my-4">
                                                    <Image
                                                        src="/journal-info.webp"
                                                        alt="Пример шаблона Excel"
                                                        width={450}
                                                        height={300}
                                                        className="rounded-md border"
                                                    />
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="icon" onClick={() => setIsTemplatesVisible(!isTemplatesVisible)}>
                                    <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", isTemplatesVisible && "rotate-180")} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    {isTemplatesVisible && (
                        <CardContent className="space-y-4 pt-4 border-t animation-fadeInUp">
                            <input type="file" ref={fileInputRef} onChange={handleTemplateUpload} accept=".xlsx" style={{ display: 'none' }} />
                            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                               <FileUp className="mr-2 h-4 w-4" /> Загрузить шаблон
                            </Button>
                            <ScrollArea className="h-64 border rounded-md p-2">
                                 {protocolTemplates.length > 0 ? (
                                    <ul className="space-y-1">
                                        {protocolTemplates.map(template => (
                                        <li key={template.id} className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded-sm text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                                                <span className="truncate" title={template.name}>{template.name}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadTemplate(template)}>
                                                    <Download className="h-3 w-3 text-muted-foreground" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Вы уверены, что хотите удалить шаблон "{template.name}"? Это действие необратимо.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Удалить</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </li>
                                        ))}
                                    </ul>
                                    ) : (
                                    <p className="text-center text-sm text-muted-foreground py-4">Нет загруженных шаблонов.</p>
                                    )}
                            </ScrollArea>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
