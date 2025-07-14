
"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from 'next/link';
import type { Inspector, DataEntry, DeviceId } from "@/types";
import { DEVICE_OPTIONS, DEVICE_CONFIGS, INSPECTOR_DEVICE_IDS } from "@/config/devices";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { DataEntryForm } from "@/components/dashboard/DataEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getEntries, upsertDataEntry } from '@/lib/db';

function DashboardClientPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  
  const [dataEntries, setDataEntries] = useState<DataEntry[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<DeviceId | undefined>();
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [isConfigCardVisible, setIsConfigCardVisible] = useState(true);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!currentUser) return;

    const loadInitialData = async () => {
      try {
        const entries = await getEntries();
        setDataEntries(entries);
      } catch (error) {
        toast({ title: "Ошибка загрузки данных", description: "Не удалось получить записи из базы данных.", variant: "destructive"});
      }

      setIsConfigCardVisible(true);

      const deviceFromQuery = searchParams.get('device') as DeviceId | null;
      if (deviceFromQuery && Object.keys(DEVICE_CONFIGS).includes(deviceFromQuery)) {
        setSelectedDeviceId(deviceFromQuery);
        setIsConfigCardVisible(false); 
      } else {
        const storedSelectedDevice = localStorage.getItem("datafill-selectedDevice") as DeviceId | null;
        if (storedSelectedDevice && Object.keys(DEVICE_CONFIGS).includes(storedSelectedDevice)) {
          setSelectedDeviceId(storedSelectedDevice);
        } else if (storedSelectedDevice) {
          localStorage.removeItem("datafill-selectedDevice");
        }
      }
      setIsInitialDataLoaded(true);
    };

    loadInitialData();
  }, [currentUser, searchParams, toast]);


  useEffect(() => {
    if (!isInitialDataLoaded) return;
    if (selectedDeviceId) {
      localStorage.setItem("datafill-selectedDevice", selectedDeviceId);
    } else {
      localStorage.removeItem("datafill-selectedDevice");
    }
  }, [selectedDeviceId, isInitialDataLoaded]);


  const handleSaveEntry = useCallback(async (entry: DataEntry, isOverwrite: boolean): Promise<void> => {
    if (!currentUser) {
        toast({ title: "Ошибка", description: "Пользователь не авторизован.", variant: "destructive" });
        return Promise.reject("User not authenticated");
    }
    
    try {
        await upsertDataEntry(entry, currentUser.id);
        const updatedEntries = await getEntries();
        setDataEntries(updatedEntries);
    } catch (error) {
        console.error("Failed to save entry:", error);
        toast({ title: "Ошибка сохранения", description: "Не удалось сохранить запись в базу данных.", variant: "destructive" });
        return Promise.reject(error);
    }
  }, [currentUser, toast]);

  if (authLoading || !isInitialDataLoaded || !currentUser) {
    return (
      <div className="flex min-h-screen bg-muted/50">
        <Skeleton className="h-screen w-64 hidden lg:block" />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex justify-center mb-8">
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">Загрузка данных...</p>
            </div>
          </div>
          <Card className="shadow-lg w-full max-w-2xl mx-auto">
            <CardHeader>
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Skeleton className="h-5 w-1/3 mb-3" />
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  const showDataEntry = selectedDeviceId && !isConfigCardVisible;

  return (
    <div className="flex min-h-screen bg-muted/50">
      <Sidebar currentUser={currentUser} />
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        <h2 className="font-headline text-3xl font-semibold mb-8 text-center">Поверка приборов</h2>

        {showDataEntry ? (
          <div className="animation-fadeInUp">
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => setIsConfigCardVisible(true)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Показать настройки
            </Button>
            <DataEntryForm
              selectedDevice={selectedDeviceId}
              selectedInspector={currentUser}
              onSaveEntry={handleSaveEntry}
              dataEntries={dataEntries}
            />
          </div>
        ) : (
          <div className="w-full max-w-2xl mx-auto relative">
            <Card className="w-full shadow-lg animation-fadeInUp">
              <CardHeader>
                <CardTitle>Настройки</CardTitle>
                <CardDescription>
                  Выбран поверитель: <span className="font-semibold text-primary">{currentUser.name} ({currentUser.role || 'Поверитель'})</span>. 
                  {!selectedDeviceId ? " Выберите тип устройства для начала работы." : " Вы можете изменить тип устройства или начать ввод данных."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-3">Тип устройства</h4>
                  <div className="space-y-4">
                  {DEVICE_OPTIONS.map(option => {
                    const deviceConfig = DEVICE_CONFIGS[option.value as DeviceId];
                    const IconComponent = deviceConfig.Icon;
                    const isSelected = selectedDeviceId === deviceConfig.id;

                    return (
                      <Card
                        key={deviceConfig.id}
                        className={cn(
                          "cursor-pointer hover:shadow-md transition-all duration-200 ease-in-out relative",
                          isSelected ? "border-primary ring-2 ring-primary shadow-md scale-105" : "border-border hover:border-primary/50"
                        )}
                        onClick={() => {
                          setSelectedDeviceId(deviceConfig.id);
                          setIsConfigCardVisible(false); 
                        }}
                      >
                        <CardContent className="p-3 flex items-center space-x-3">
                          <div className={cn(
                            "p-3 rounded-md transition-colors",
                            isSelected ? "bg-primary/10" : "bg-accent/10 group-hover:bg-primary/10"
                          )}>
                            <IconComponent
                              className={cn("h-8 w-8 transition-colors", isSelected ? "text-primary" : "text-primary/80 group-hover:text-primary")}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="font-semibold text-lg">{deviceConfig.name}</p>
                              {deviceConfig.inDevelopment && (
                                <Badge variant="outline" className="ml-2 text-xs border-primary/50 text-primary bg-primary/10">
                                  В разработке
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{deviceConfig.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <Skeleton className="h-screen w-64 hidden lg:block" />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex justify-center mb-8">
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">Загрузка...</p>
            </div>
          </div>
          <Card className="shadow-lg w-full max-w-2xl mx-auto">
            <CardHeader>
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Skeleton className="h-5 w-1/3 mb-3" />
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    }>
      <DashboardClientPage />
    </Suspense>
  );
}
