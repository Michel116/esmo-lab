
"use client";

import type { DataEntry, DeviceId, VerifiedAlcoPointData, AlcotestDeviceConfig, StandardDeviceConfig, ThermometerDeviceConfig, ThermometerVerificationPoint, VerifiedThermoPointData, ProtocolTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Download, Info, Trash2, ChevronDown, Check, AlertTriangle, Target, Thermometer as ThermometerIcon, Smartphone as SmartphoneIcon, XCircle, FileText, FileSpreadsheet, Archive } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useMemo, useState } from "react";
import { DEVICE_CONFIGS, INSPECTOR_DEVICE_IDS } from "@/config/devices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";

const formatNumberWithComma = (num?: number | string, digits = 3) => {
    if (num === undefined || num === null) return '-';
    const parsedNum = typeof num === 'string' ? parseFloat(num.replace(',', '.')) : num;
    if (isNaN(parsedNum)) return String(num);
    return parsedNum.toFixed(digits).replace('.', ',');
};
  
export const renderEntryContent = (entry: DataEntry, onDeleteEntry: (id: string) => void, showReadings: boolean = true) => {
    let subDeviceType: DeviceId | undefined = undefined;
    if (INSPECTOR_DEVICE_IDS.includes(entry.deviceType)) {
      subDeviceType = entry.measuredValues.subDeviceType as DeviceId;
    }
    const effectiveDeviceConfig = subDeviceType ? DEVICE_CONFIGS[subDeviceType] : DEVICE_CONFIGS[entry.deviceType];

    const isEffectivelyThermometer = effectiveDeviceConfig?.id === 'thermometer';
    const isEffectivelyAlcotest = effectiveDeviceConfig?.id === 'alcotest';

    const alcoPointsData = isEffectivelyAlcotest ? entry.measuredValues.verifiedAlcoPoints : null;
    const thermoPointsData = isEffectivelyThermometer ? entry.measuredValues.verifiedThermoPoints : null;


    let displayName = entry.deviceName;
    let overallVerdict: string | null = null;
    let pointsCount = 0;
    let isComplete = false;

    if (isEffectivelyAlcotest && alcoPointsData && effectiveDeviceConfig && 'points' in effectiveDeviceConfig) {
      pointsCount = alcoPointsData.length;
      isComplete = pointsCount === (effectiveDeviceConfig as AlcotestDeviceConfig).points.length;
      if (alcoPointsData.every(p => p.verdict === 'Годен')) overallVerdict = "Годен";
      else if (alcoPointsData.some(p => p.verdict === 'Брак')) overallVerdict = "Брак";
      else overallVerdict = "Частично";
    } else if (isEffectivelyThermometer && thermoPointsData && effectiveDeviceConfig && 'points' in effectiveDeviceConfig) {
       pointsCount = thermoPointsData.length;
       isComplete = pointsCount === (effectiveDeviceConfig as ThermometerDeviceConfig).points.length;
      if (thermoPointsData.every(p => p.verdict === 'Годен')) overallVerdict = "Годен";
      else if (thermoPointsData.some(p => p.verdict === 'Брак')) overallVerdict = "Брак";
      else overallVerdict = "Частично";
    } else {
      isComplete = true; // Standard devices are always "complete" after one entry
    }
    
    const zipCode = entry.measuredValues.zipCode;

    return (
      <AccordionItem value={entry.id} key={entry.id} className="border rounded-md shadow-sm bg-card">
        <AccordionTrigger className="p-3 hover:no-underline group">
          <div className="flex justify-between items-center w-full">
            <div className="flex-1 text-left">
              <p className="font-semibold font-code text-primary">{entry.serialNumber}</p>
              <p className="text-xs text-muted-foreground">
                  {displayName}
                  {isEffectivelyAlcotest && pointsCount > 0 ? ` / Точек (алкотестер): ${pointsCount}` : ""}
                  {isEffectivelyThermometer && pointsCount > 0 ? ` / Точек (термометр): ${pointsCount}` : ""}
                   / Поверитель: {entry.inspectorName}
              </p>
              <p className="text-xs text-muted-foreground">
                Запись от: {format(new Date(entry.timestamp), "dd.MM.yy HH:mm", { locale: ru })}
              </p>
            </div>
            <div className="flex items-center">
              {zipCode && (
                <Badge variant="outline" className="mr-3 text-xs border-orange-400 text-orange-600 bg-orange-50">
                  <Archive className="h-3 w-3 mr-1"/> ЗИП: {zipCode}
                </Badge>
              )}
              {overallVerdict && (
                 <Badge variant={overallVerdict === "Годен" ? "default" : (overallVerdict === "Брак" ? "destructive" : "secondary")} className={cn("mr-3 text-xs font-semibold", overallVerdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : (overallVerdict === "Брак" ? "bg-red-100 text-red-700 border-red-300" : "bg-yellow-100 text-yellow-700 border-yellow-300") )}>
                  {overallVerdict.toUpperCase()}
                 </Badge>
              )}
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {isEffectivelyAlcotest && alcoPointsData && alcoPointsData.length > 0 && effectiveDeviceConfig && 'points' in effectiveDeviceConfig ? (
              <div className="space-y-3">
                 <p className="text-sm"><strong>Поверенные точки (Алкотестер):</strong></p>
                 <Table className="text-xs">
                  <TableHeader>
                      <TableRow>
                      <TableHead>Точка (мг/л)</TableHead>
                      {showReadings && <>
                        <TableHead>Изм.1</TableHead>
                        <TableHead>Изм.2</TableHead>
                        <TableHead>Изм.3</TableHead>
                      </>}
                      <TableHead>Среднее</TableHead>
                      <TableHead>Вердикт</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {alcoPointsData.map(point => {
                          const pointConfigAlco = (effectiveDeviceConfig as AlcotestDeviceConfig).points.find(p => p.id === point.pointValue);
                          return (
                          <TableRow key={point.pointValue} className={cn(point.verdict === 'Брак' && 'bg-red-50/50 hover:bg-red-100/50')}>
                              <TableCell className="font-medium">{pointConfigAlco?.label || point.pointValue}</TableCell>
                               {showReadings && <>
                                <TableCell>{formatNumberWithComma(point.readings[0], 3)}</TableCell>
                                <TableCell>{formatNumberWithComma(point.readings[1], 3)}</TableCell>
                                <TableCell>{formatNumberWithComma(point.readings[2], 3)}</TableCell>
                               </>}
                              <TableCell className="font-semibold">{formatNumberWithComma(point.averageReading, 3)}</TableCell>
                              <TableCell>
                              <Badge variant={point.verdict === "Годен" ? "default" : "destructive"} className={cn("text-xs", point.verdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")}>
                                  {point.verdict}
                              </Badge>
                              </TableCell>
                          </TableRow>
                          );
                      })}
                  </TableBody>
                 </Table>
              </div>
            ) : isEffectivelyThermometer && thermoPointsData && thermoPointsData.length > 0 && effectiveDeviceConfig && 'points' in effectiveDeviceConfig ? (
               <div className="space-y-3">
                 <p className="text-sm"><strong>Поверенные точки (Термометр):</strong></p>
                 <Table className="text-xs">
                  <TableHeader>
                      <TableRow>
                      <TableHead>Точка (°C)</TableHead>
                      {showReadings && <>
                        <TableHead>Изм.1 (°C)</TableHead>
                        <TableHead>Изм.2 (°C)</TableHead>
                        <TableHead>Изм.3 (°C)</TableHead>
                      </>}
                      <TableHead>Ср. факт. (°C)</TableHead>
                      <TableHead>Вердикт</TableHead>
                       <TableHead>Время</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {thermoPointsData.map(point => (
                          <TableRow key={point.pointId} className={cn(point.verdict === 'Брак' && 'bg-red-50/50 hover:bg-red-100/50')}>
                              <TableCell className="font-medium">{point.pointLabel}</TableCell>
                              {showReadings && <>
                                <TableCell>{formatNumberWithComma(point.readingsRaw[0],1)}</TableCell>
                                <TableCell>{formatNumberWithComma(point.readingsRaw[1],1)}</TableCell>
                                <TableCell>{formatNumberWithComma(point.readingsRaw[2],1)}</TableCell>
                              </>}
                              <TableCell className="font-semibold">{formatNumberWithComma(point.averageCorrectedTemp,2)}</TableCell>
                              <TableCell>
                                  <Badge variant={point.verdict === "Годен" ? "default" : "destructive"} className={cn("text-xs", point.verdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")}>
                                      {point.verdict}
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{point.timestamp ? format(new Date(point.timestamp), "HH:mm:ss", { locale: ru }) : '-'}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
                 </Table>
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>S/N:</strong> <span className="font-code">{entry.serialNumber}</span></p>
                <p><strong>Поверитель:</strong> {entry.inspectorName}</p>
                <p><strong>Дата записи:</strong> {format(new Date(entry.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru })}</p>
                {effectiveDeviceConfig && 'fields' in effectiveDeviceConfig && (effectiveDeviceConfig as StandardDeviceConfig).fields.map((field) => (
                  <p key={field.id}><strong>{field.label}:</strong> {entry.measuredValues[field.id] !== undefined ? String(entry.measuredValues[field.id]) : '-'}</p>
                ))}
                {Object.keys(entry.measuredValues).filter(k => k !== 'subDeviceType' && k !== 'verifiedAlcoPoints' && k !== 'verifiedThermoPoints').length === 0 && (!isEffectivelyAlcotest && !isEffectivelyThermometer) && <p className="text-muted-foreground mt-2">Дополнительные данные отсутствуют.</p>}
              </div>
            )}
             <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2">
                    {/* Placeholder for future actions */}
                  </div>
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
                          Это действие удалит запись для S/N {entry.serialNumber} ({displayName}) безвозвратно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteEntry(entry.id)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
             </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
}

interface DataTableProps {
  entries: DataEntry[];
  onDeleteEntry: (id: string) => void;
  onClearAllEntries: () => void;
  protocolTemplates: ProtocolTemplate[];
}

interface GroupedEntries { [key: string]: DataEntry[]; }

export function DataTable({ entries, onDeleteEntry, onClearAllEntries, protocolTemplates }: DataTableProps) {
  const { toast } = useToast();

  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const key = entry.deviceType;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {} as GroupedEntries);
  }, [entries]);

  const [activeTab, setActiveTab] = useState<DeviceId | undefined>(() => {
    const initialCounts: Record<DeviceId, number> = {} as Record<DeviceId, number>;
    entries.forEach(entry => {
      initialCounts[entry.deviceType] = (initialCounts[entry.deviceType] || 0) + 1;
    });
    const initialDeviceTabs = Object.keys(DEVICE_CONFIGS)
      .map(key => key as DeviceId)
      .filter(deviceId => initialCounts[deviceId] > 0)
      .sort((a,b) => {
        if (INSPECTOR_DEVICE_IDS.includes(a) && !INSPECTOR_DEVICE_IDS.includes(b)) return -1;
        if (!INSPECTOR_DEVICE_IDS.includes(a) && INSPECTOR_DEVICE_IDS.includes(b)) return 1;
        return (DEVICE_CONFIGS[a]?.name || '').localeCompare(DEVICE_CONFIGS[b]?.name || '');
      });
    return initialDeviceTabs.length > 0 ? initialDeviceTabs[0] : undefined;
  });

  const deviceTabs = useMemo(() => {
    const counts: Record<DeviceId, number> = {} as Record<DeviceId, number>;
    entries.forEach(entry => {
      counts[entry.deviceType] = (counts[entry.deviceType] || 0) + 1;
    });

    return Object.keys(DEVICE_CONFIGS)
      .map(key => key as DeviceId)
      .filter(deviceId => counts[deviceId] > 0 || (deviceId === activeTab && entries.length > 0) )
      .map(deviceId => ({
        value: deviceId,
        label: DEVICE_CONFIGS[deviceId].name,
        count: counts[deviceId] || 0,
      }))
      .sort((a,b) => {
        if (INSPECTOR_DEVICE_IDS.includes(a.value) && !INSPECTOR_DEVICE_IDS.includes(b.value)) return -1;
        if (!INSPECTOR_DEVICE_IDS.includes(a.value) && INSPECTOR_DEVICE_IDS.includes(b.value)) return 1;
        if (INSPECTOR_DEVICE_IDS.includes(a.value) && INSPECTOR_DEVICE_IDS.includes(b.value)) {
             return a.label.localeCompare(b.label);
        }
        return a.label.localeCompare(b.label);
      });
  }, [entries, activeTab]);

  React.useEffect(() => {
    if (deviceTabs.length > 0 && !deviceTabs.find(tab => tab.value === activeTab)) {
      setActiveTab(deviceTabs[0].value);
    } else if (deviceTabs.length === 0 && entries.length === 0) {
      setActiveTab(undefined);
    }
  }, [deviceTabs, activeTab, entries.length]);

  const handleGenerateProtocol = (entry: DataEntry, templateId: string) => {
      const template = protocolTemplates.find(t => t.id === templateId);
      if (!template) {
          toast({ title: "Ошибка", description: "Шаблон не найден.", variant: "destructive"});
          return;
      }

      try {
          const byteCharacters = atob(template.fileContent);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const workbook = XLSX.read(byteArray, { type: 'array', cellStyles: true });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const replacements: Record<string, any> = {
              '{{ПРИБОР}}': entry.deviceName,
              '{{СЕРИЙНЫЙ_НОМЕР}}': entry.serialNumber,
              '{{ДАТА_ПОВЕРКИ}}': format(new Date(entry.timestamp), "dd.MM.yyyy", { locale: ru }),
              '{{ФАМИЛИЯ_ПОВЕРИТЕЛЯ}}': entry.inspectorName,
          };

          const isAlcotest = entry.measuredValues.verifiedAlcoPoints;
          if (isAlcotest) {
              (entry.measuredValues.verifiedAlcoPoints as VerifiedAlcoPointData[]).forEach((point, index) => {
                  const pointIndex = index + 1;
                  replacements[`{{ТОЧКА_${pointIndex}_ЭТАЛОН_MG_L}}`] = formatNumberWithComma(point.referenceMgL, 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ЭТАЛОН_MG_CM3}}`] = formatNumberWithComma(point.referenceMgCm3, 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_1}}`] = formatNumberWithComma(point.readings[0], 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_2}}`] = formatNumberWithComma(point.readings[1], 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_3}}`] = formatNumberWithComma(point.readings[2], 3);
                  replacements[`{{ТОЧКА_${pointIndex}_СРЕДНЕЕ}}`] = formatNumberWithComma(point.averageReading, 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ПРЕДЕЛ_НИЖНИЙ}}`] = formatNumberWithComma(point.lowerLimit, 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ПРЕДЕЛ_ВЕРХНИЙ}}`] = formatNumberWithComma(point.upperLimit, 3);
                  replacements[`{{ТОЧКА_${pointIndex}_ВЫВОД}}`] = point.verdict;
              });
          }
          
          const isThermometer = entry.measuredValues.verifiedThermoPoints;
           if (isThermometer) {
              (entry.measuredValues.verifiedThermoPoints as VerifiedThermoPointData[]).forEach((point, index) => {
                  const pointIndex = index + 1;
                  replacements[`{{ТОЧКА_${pointIndex}_LABEL}}`] = point.pointLabel;
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_1}}`] = formatNumberWithComma(point.readingsRaw[0], 1);
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_2}}`] = formatNumberWithComma(point.readingsRaw[1], 1);
                  replacements[`{{ТОЧКА_${pointIndex}_ИЗМ_3}}`] = formatNumberWithComma(point.readingsRaw[2], 1);
                  replacements[`{{ТОЧКА_${pointIndex}_СРЕДНЕЕ}}`] = formatNumberWithComma(point.averageCorrectedTemp, 2);
                  replacements[`{{ТОЧКА_${pointIndex}_ВЫВОД}}`] = point.verdict;
              });
          }

          for (const cellAddress in worksheet) {
              if (worksheet.hasOwnProperty(cellAddress)) {
                  const cell = worksheet[cellAddress];
                  if (cell && typeof cell.v === 'string') {
                      if (replacements.hasOwnProperty(cell.v)) {
                          cell.v = replacements[cell.v];
                      }
                  }
              }
          }

          const outputWorkbook = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([outputWorkbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Протокол_${entry.serialNumber}_${entry.deviceName}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({ title: "Протокол сгенерирован", description: `Файл для S/N ${entry.serialNumber} готов к скачиванию.` });
      } catch (error) {
          console.error("Ошибка генерации протокола:", error);
          toast({ title: "Ошибка", description: "Не удалось сгенерировать протокол. Проверьте шаблон.", variant: "destructive" });
      }
  };

  const handleExport = () => {
    if (entries.length === 0) {
      toast({ title: "Нет данных", description: "Нет данных для экспорта.", variant: "default" });
      return;
    }
    const wb = XLSX.utils.book_new();

    const processDeviceType = (deviceTypeToProcess: DeviceId, actualEntries: DataEntry[], sheetBaseName: string) => {
      if (actualEntries.length === 0) return;

      let sheetData: any[] = [];
      const isInspectorDevice = INSPECTOR_DEVICE_IDS.includes(deviceTypeToProcess);

      actualEntries.forEach(entry => {
        const subDeviceType = entry.measuredValues.subDeviceType;
        const effectiveDeviceTypeForConfig = isInspectorDevice && subDeviceType ? subDeviceType : deviceTypeToProcess;
        const deviceConfig = DEVICE_CONFIGS[effectiveDeviceTypeForConfig];

        const isAlcotestType = effectiveDeviceTypeForConfig === 'alcotest';
        const isThermometerType = effectiveDeviceTypeForConfig === 'thermometer';

        if (isAlcotestType && deviceConfig && 'points' in deviceConfig) {
          const verifiedPoints = entry.measuredValues.verifiedAlcoPoints || [];
          verifiedPoints.forEach(point => {
            const pointConfigAlco = (deviceConfig as AlcotestDeviceConfig).points.find(p => p.id === point.pointValue);
            sheetData.push({
              'ID Записи Сессии': entry.id,
              'Серийный номер': entry.serialNumber,
              'Имя поверителя': entry.inspectorName,
              'Время общей записи': format(new Date(entry.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru }),
              'Точка поверки (мг/л)': pointConfigAlco?.label || point.pointValue,
              'Эталон (мг/л)': formatNumberWithComma(point.referenceMgL, 3),
              'Эталон (мг/см^3)': formatNumberWithComma(point.referenceMgCm3, 3),
              'Изм. 1': formatNumberWithComma(point.readings[0], 3),
              'Изм. 2': formatNumberWithComma(point.readings[1], 3),
              'Изм. 3': formatNumberWithComma(point.readings[2], 3),
              'Среднее изм. (мг/л)': formatNumberWithComma(point.averageReading, 3),
              'Нижний предел (мг/л)': formatNumberWithComma(point.lowerLimit, 3),
              'Верхний предел (мг/л)': formatNumberWithComma(point.upperLimit, 3),
              'Результат точки': point.verdict,
            });
          });
        } else if (isThermometerType && deviceConfig && 'points' in deviceConfig) {
          const verifiedPoints = entry.measuredValues.verifiedThermoPoints || [];
          verifiedPoints.forEach(point => {
             sheetData.push({
              'ID Записи Сессии': entry.id,
              'Серийный номер': entry.serialNumber,
              'Код ЗИП': entry.measuredValues.zipCode || '-',
              'Имя поверителя': entry.inspectorName,
              'Время общей записи': format(new Date(entry.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru }),
              'Точка поверки (°C)': point.pointLabel,
              'Эталон точки (°C)': formatNumberWithComma(point.referenceTemp, 1),
              'Поправка (°C)': formatNumberWithComma(point.tempCorrection, 1),
              'Изм. 1 (°C)': formatNumberWithComma(point.readingsRaw?.[0], 1),
              'Изм. 2 (°C)': formatNumberWithComma(point.readingsRaw?.[1], 1),
              'Изм. 3 (°C)': formatNumberWithComma(point.readingsRaw?.[2], 1),
              'Изм. 1 (факт. °C)': formatNumberWithComma(point.readingsCorrected?.[0], 2),
              'Изм. 2 (факт. °C)': formatNumberWithComma(point.readingsCorrected?.[1], 2),
              'Изм. 3 (факт. °C)': formatNumberWithComma(point.readingsCorrected?.[2], 2),
              'Среднее факт. (°C)': formatNumberWithComma(point.averageCorrectedTemp, 2),
              'Нижний предел (°C)': formatNumberWithComma(point.lowerLimitPoint,1),
              'Верхний предел (°C)': formatNumberWithComma(point.upperLimitPoint,1),
              'Результат точки': point.verdict,
              'Время точки': point.timestamp ? format(new Date(point.timestamp), "HH:mm:ss", { locale: ru }) : '-',
            });
          });
        } else {
           if (deviceConfig && 'fields' in deviceConfig && (deviceConfig as StandardDeviceConfig).fields.length > 0) {
              const baseData = {
                'ID Записи': entry.id,
                'Серийный номер': entry.serialNumber,
                'Имя поверителя': entry.inspectorName,
                'Время записи': format(new Date(entry.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru }),
              };
              const measuredData = Object.fromEntries(
                  (deviceConfig as StandardDeviceConfig).fields.map(field => {
                    const val = entry.measuredValues[field.id];
                    const formattedVal = field.type === 'number' && val !== undefined ? formatNumberWithComma(val, 2) : (val !== undefined ? String(val) : '-');
                    return [field.label, formattedVal];
                  })
              );
              sheetData.push({ ...baseData, ...measuredData });
           }
        }
      });

      if (sheetData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, sheetBaseName.replace(/[\[\]*?:\/\\]/g, '').substring(0, 30));
      }
    };

    const groupedForExport = entries.reduce((acc, entry) => {
        let key = entry.deviceName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, DataEntry[]>);


    Object.entries(groupedForExport).forEach(([groupName, groupEntries]) => {
        if (groupEntries.length > 0) {
            processDeviceType(groupEntries[0].deviceType, groupEntries, groupName);
        }
    });


    if (wb.SheetNames.length > 0) {
      XLSX.writeFile(wb, `datafill_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Экспорт начат", description: "Данные экспортируются в Excel (.xlsx) файл." });
    } else {
      toast({ title: "Нет данных", description: "Для выбранных фильтров нет данных для экспорта.", variant: "default" });
    }
  };

  const currentDeviceEntries = activeTab ? groupedEntries[activeTab] || [] : [];
  
  const isCurrentTabThermometer = useMemo(() => {
    if (!activeTab) return false;
    const config = DEVICE_CONFIGS[activeTab];
    return config.id === 'thermometer' || (config.id === 'inspector' && currentDeviceEntries.some(e => e.measuredValues.subDeviceType === 'thermometer'));
  }, [activeTab, currentDeviceEntries]);

  const zipEntries = useMemo(() => {
    if (!isCurrentTabThermometer) return {};
    return currentDeviceEntries.reduce((acc, entry) => {
      const zipCode = entry.measuredValues.zipCode;
      if (zipCode) {
        if (!acc[zipCode]) acc[zipCode] = [];
        acc[zipCode].push(entry);
      }
      return acc;
    }, {} as Record<string, DataEntry[]>);
  }, [currentDeviceEntries, isCurrentTabThermometer]);

  const regularEntries = useMemo(() => {
     if (!isCurrentTabThermometer) return currentDeviceEntries;
     return currentDeviceEntries.filter(entry => !entry.measuredValues.zipCode);
  }, [currentDeviceEntries, isCurrentTabThermometer]);
  
  const currentDeviceConfig = activeTab ? DEVICE_CONFIGS[activeTab] : null;
  const currentDeviceName = currentDeviceConfig ? currentDeviceConfig.name : "";

  if (entries.length === 0) {
    return (
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle>Нет данных для отображения</CardTitle>
          <CardDescription>
            Начните с добавления записей через форму ввода на панели управления.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Как только вы добавите данные, они появятся здесь.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderEntry = (entry: DataEntry) => {
    let subDeviceType: DeviceId | undefined = undefined;
    if (INSPECTOR_DEVICE_IDS.includes(entry.deviceType)) {
      subDeviceType = entry.measuredValues.subDeviceType as DeviceId;
    }
    const effectiveDeviceConfig = subDeviceType ? DEVICE_CONFIGS[subDeviceType] : DEVICE_CONFIGS[entry.deviceType];

    const isEffectivelyThermometer = effectiveDeviceConfig?.id === 'thermometer';
    const isEffectivelyAlcotest = effectiveDeviceConfig?.id === 'alcotest';

    const alcoPointsData = isEffectivelyAlcotest ? entry.measuredValues.verifiedAlcoPoints : null;
    const thermoPointsData = isEffectivelyThermometer ? entry.measuredValues.verifiedThermoPoints : null;


    let displayName = entry.deviceName;
    let overallVerdict: string | null = null;
    let pointsCount = 0;
    let isComplete = false;

    if (isEffectivelyAlcotest && alcoPointsData && effectiveDeviceConfig && 'points' in effectiveDeviceConfig) {
      pointsCount = alcoPointsData.length;
      isComplete = pointsCount === (effectiveDeviceConfig as AlcotestDeviceConfig).points.length;
      if (alcoPointsData.every(p => p.verdict === 'Годен')) overallVerdict = "Годен";
      else if (alcoPointsData.some(p => p.verdict === 'Брак')) overallVerdict = "Брак";
      else overallVerdict = "Частично";
    } else if (isEffectivelyThermometer && thermoPointsData && effectiveDeviceConfig && 'points' in effectiveDeviceConfig) {
       pointsCount = thermoPointsData.length;
       isComplete = pointsCount === (effectiveDeviceConfig as ThermometerDeviceConfig).points.length;
      if (thermoPointsData.every(p => p.verdict === 'Годен')) overallVerdict = "Годен";
      else if (thermoPointsData.some(p => p.verdict === 'Брак')) overallVerdict = "Брак";
      else overallVerdict = "Частично";
    } else {
      isComplete = true; // Standard devices are always "complete" after one entry
    }
    
    const zipCode = entry.measuredValues.zipCode;

    return (
      <AccordionItem value={entry.id} key={entry.id} className="border rounded-md shadow-sm bg-card">
        <AccordionTrigger className="p-3 hover:no-underline group">
          <div className="flex justify-between items-center w-full">
            <div className="flex-1 text-left">
              <p className="font-semibold font-code text-primary">{entry.serialNumber}</p>
              <p className="text-xs text-muted-foreground">
                  {displayName}
                  {isEffectivelyAlcotest && pointsCount > 0 ? ` / Точек (алкотестер): ${pointsCount}` : ""}
                  {isEffectivelyThermometer && pointsCount > 0 ? ` / Точек (термометр): ${pointsCount}` : ""}
                   / Поверитель: {entry.inspectorName}
              </p>
              <p className="text-xs text-muted-foreground">
                Запись от: {format(new Date(entry.timestamp), "dd.MM.yy HH:mm", { locale: ru })}
              </p>
            </div>
            <div className="flex items-center">
              {zipCode && (
                <Badge variant="outline" className="mr-3 text-xs border-orange-400 text-orange-600 bg-orange-50">
                  <Archive className="h-3 w-3 mr-1"/> ЗИП: {zipCode}
                </Badge>
              )}
              {overallVerdict && (
                 <Badge variant={overallVerdict === "Годен" ? "default" : (overallVerdict === "Брак" ? "destructive" : "secondary")} className={cn("mr-3 text-xs font-semibold", overallVerdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : (overallVerdict === "Брак" ? "bg-red-100 text-red-700 border-red-300" : "bg-yellow-100 text-yellow-700 border-yellow-300") )}>
                  {overallVerdict.toUpperCase()}
                 </Badge>
              )}
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {isEffectivelyAlcotest && alcoPointsData && alcoPointsData.length > 0 && effectiveDeviceConfig && 'points' in effectiveDeviceConfig ? (
              <div className="space-y-3">
                 <p className="text-sm"><strong>Поверенные точки (Алкотестер):</strong></p>
                 <Table className="text-xs">
                  <TableHeader>
                      <TableRow>
                      <TableHead>Точка (мг/л)</TableHead>
                      <TableHead>Изм.1</TableHead>
                      <TableHead>Изм.2</TableHead>
                      <TableHead>Изм.3</TableHead>
                      <TableHead>Среднее</TableHead>
                      <TableHead>Вердикт</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {alcoPointsData.map(point => {
                          const pointConfigAlco = (effectiveDeviceConfig as AlcotestDeviceConfig).points.find(p => p.id === point.pointValue);
                          return (
                          <TableRow key={point.pointValue} className={cn(point.verdict === 'Брак' && 'bg-red-50/50 hover:bg-red-100/50')}>
                              <TableCell className="font-medium">{pointConfigAlco?.label || point.pointValue}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readings[0], 3)}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readings[1], 3)}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readings[2], 3)}</TableCell>
                              <TableCell className="font-semibold">{formatNumberWithComma(point.averageReading, 3)}</TableCell>
                              <TableCell>
                              <Badge variant={point.verdict === "Годен" ? "default" : "destructive"} className={cn("text-xs", point.verdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")}>
                                  {point.verdict}
                              </Badge>
                              </TableCell>
                          </TableRow>
                          );
                      })}
                  </TableBody>
                 </Table>
              </div>
            ) : isEffectivelyThermometer && thermoPointsData && thermoPointsData.length > 0 && effectiveDeviceConfig && 'points' in effectiveDeviceConfig ? (
               <div className="space-y-3">
                 <p className="text-sm"><strong>Поверенные точки (Термометр):</strong></p>
                 <Table className="text-xs">
                  <TableHeader>
                      <TableRow>
                      <TableHead>Точка (°C)</TableHead>
                      <TableHead>Изм.1 (°C)</TableHead>
                      <TableHead>Изм.2 (°C)</TableHead>
                      <TableHead>Изм.3 (°C)</TableHead>
                      <TableHead>Ср. факт. (°C)</TableHead>
                      <TableHead>Вердикт</TableHead>
                       <TableHead>Время</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {thermoPointsData.map(point => (
                          <TableRow key={point.pointId} className={cn(point.verdict === 'Брак' && 'bg-red-50/50 hover:bg-red-100/50')}>
                              <TableCell className="font-medium">{point.pointLabel}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readingsRaw[0],1)}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readingsRaw[1],1)}</TableCell>
                              <TableCell>{formatNumberWithComma(point.readingsRaw[2],1)}</TableCell>
                              <TableCell className="font-semibold">{formatNumberWithComma(point.averageCorrectedTemp,2)}</TableCell>
                              <TableCell>
                                  <Badge variant={point.verdict === "Годен" ? "default" : "destructive"} className={cn("text-xs", point.verdict === "Годен" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")}>
                                      {point.verdict}
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{point.timestamp ? format(new Date(point.timestamp), "HH:mm:ss", { locale: ru }) : '-'}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
                 </Table>
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>S/N:</strong> <span className="font-code">{entry.serialNumber}</span></p>
                <p><strong>Поверитель:</strong> {entry.inspectorName}</p>
                <p><strong>Дата записи:</strong> {format(new Date(entry.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru })}</p>
                {effectiveDeviceConfig && 'fields' in effectiveDeviceConfig && (effectiveDeviceConfig as StandardDeviceConfig).fields.map((field) => (
                  <p key={field.id}><strong>{field.label}:</strong> {entry.measuredValues[field.id] !== undefined ? String(entry.measuredValues[field.id]) : '-'}</p>
                ))}
                {Object.keys(entry.measuredValues).filter(k => k !== 'subDeviceType' && k !== 'verifiedAlcoPoints' && k !== 'verifiedThermoPoints').length === 0 && (!isEffectivelyAlcotest && !isEffectivelyThermometer) && <p className="text-muted-foreground mt-2">Дополнительные данные отсутствуют.</p>}
              </div>
            )}
             <div className="flex justify-between items-center pt-2">
                  {isComplete && (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => handleGenerateProtocol(entry, value)} disabled={protocolTemplates.length === 0}>
                          <SelectTrigger className="w-[250px] h-9">
                              <SelectValue placeholder="Скачать протокол по шаблону..." />
                          </SelectTrigger>
                          <SelectContent>
                              {protocolTemplates.length > 0 ? (
                                  protocolTemplates.map(template => (
                                      <SelectItem key={template.id} value={template.id}>
                                        <div className="flex items-center gap-2">
                                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                          {template.name}
                                        </div>
                                      </SelectItem>
                                  ))
                              ) : (
                                  <div className="p-2 text-sm text-center text-muted-foreground">
                                    Нет шаблонов.
                                  </div>
                              )}
                          </SelectContent>
                      </Select>
                    </div>
                  )}

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
                          Это действие удалит запись для S/N {entry.serialNumber} ({displayName}) безвозвратно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteEntry(entry.id)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
             </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h3 className="text-2xl font-semibold">
          Собранные данные {currentDeviceName && `(${currentDeviceName})`}
        </h3>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" disabled={entries.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Экспорт в Excel
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={entries.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Очистить все
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие удалит все собранные записи безвозвратно.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAllEntries}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DeviceId)}>
        <TabsList className="mb-4">
          {deviceTabs.map(tab => ( <TabsTrigger key={tab.value} value={tab.value}> {tab.label} ({tab.count}) </TabsTrigger> ))}
        </TabsList>
        {deviceTabs.map(tabInfo => (
          <TabsContent key={tabInfo.value} value={tabInfo.value}>
            {currentDeviceEntries.length > 0 ? (
              <div className="space-y-4">
                 {isCurrentTabThermometer && Object.keys(zipEntries).length > 0 && (
                   <Accordion type="multiple" className="w-full space-y-2">
                      {Object.entries(zipEntries).sort(([a], [b]) => a.localeCompare(b)).map(([code, zipGroupEntries]) => (
                        <AccordionItem value={`zip-${code}`} key={`zip-${code}`} className="border rounded-md shadow-sm bg-orange-50/30 border-orange-200">
                          <AccordionTrigger className="p-3 hover:no-underline group">
                             <div className="flex items-center gap-3">
                                <Archive className="h-5 w-5 text-orange-600"/>
                                <div className="text-left">
                                  <p className="font-semibold text-orange-800">Группа ЗИП: {code}</p>
                                  <p className="text-xs text-orange-700/80">{zipGroupEntries.length} шт.</p>
                                </div>
                             </div>
                             <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:rotate-180" />
                          </AccordionTrigger>
                           <AccordionContent className="p-2 border-t border-orange-200 bg-card">
                             <Accordion type="multiple" className="w-full space-y-2">
                              {zipGroupEntries.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(renderEntry)}
                             </Accordion>
                           </AccordionContent>
                        </AccordionItem>
                      ))}
                   </Accordion>
                 )}
                {isCurrentTabThermometer && Object.keys(zipEntries).length > 0 && regularEntries.length > 0 && <Separator/>}
                
                <Accordion type="multiple" className="w-full space-y-2">
                  {regularEntries.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(renderEntry)}
                </Accordion>
              </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <Info className="mx-auto h-10 w-10 mb-2" />
                    <p>Для устройства "{DEVICE_CONFIGS[tabInfo.value]?.name || tabInfo.value}" нет записей.</p>
                </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
