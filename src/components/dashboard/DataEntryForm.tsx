
"use client";

import type { DataEntry, DeviceConfig, DeviceField, Inspector, DeviceId, AlcotestDeviceConfig, AlcotestVerificationPoint, VerifiedAlcoPointData, StandardDeviceConfig, ThermometerDeviceConfig, ThermometerVerificationPoint, VerifiedThermoPointData } from "@/types";
import React, { useState, useEffect, type FormEvent, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QrCode, Save, AlertTriangle, ArrowRight, ArrowLeft, Info, Check, XCircle, Settings2, Loader2, AlertCircle, Thermometer, Smartphone, Edit3, Target, ChevronRight, PcCase, FileUp, ListFilter, Archive } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { DEVICE_CONFIGS, INSPECTOR_DEVICE_IDS } from "@/config/devices";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import { getFastVerifyMode, getImportedThermoSerials, saveImportedThermoSerials } from "@/lib/localStorage";
import { Switch } from "../ui/switch";


interface DataEntryFormProps {
  selectedDevice: DeviceId | undefined;
  selectedInspector: Inspector | undefined;
  onSaveEntry: (entry: DataEntry, isOverwrite: boolean) => Promise<void>;
  dataEntries: DataEntry[];
}

const ALCOTEST_MAX_INT_LENGTH = 4;
const ALCOTEST_MAX_DEC_LENGTH = 3;


interface ResultDisplayData {
  icon: LucideIcon;
  title: string;
  description: string;
  variant: 'success' | 'error' | 'warning';
}


export function DataEntryForm({ selectedDevice, selectedInspector, onSaveEntry, dataEntries }: DataEntryFormProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [serialNumberWarning, setSerialNumberWarning] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const serialNumberInputRef = useRef<HTMLInputElement>(null);
  const readingInputRef = useRef<HTMLInputElement>(null);
  const [isOverwriteDialogOpen, setIsOverwriteDialogOpen] = useState(false);
  const [entryDetailsForOverwriteDialog, setEntryDetailsForOverwriteDialog] = useState<{ sn: string, deviceType: DeviceId, subDeviceType?: DeviceId, pointId?: string } | null>(null);
  const [overwriteConfirmation, setOverwriteConfirmation] = useState<{ sn: string, deviceType: DeviceId, subDeviceType?: DeviceId, pointId?: string } | null>(null);
  const [isProcessingPointSave, setIsProcessingPointSave] = useState(false);

  const [selectedSubDeviceType, setSelectedSubDeviceType] = useState<DeviceId | null>(null);

  const [thermoCurrentStep, setThermoCurrentStep] = useState(0);
  const [selectedThermoPointConfig, setSelectedThermoPointConfig] = useState<ThermometerVerificationPoint | null>(null);
  const [thermoReadings, setThermoReadings] = useState<string[]>(["", "", ""]);
  const [thermoCurrentReadingInput, setThermoCurrentReadingInput] = useState("");
  const [thermoPointFinalResultData, setThermoPointFinalResultData] = useState<ResultDisplayData | null>(null);
  const [verifiedThermoPointsData, setVerifiedThermoPointsData] = useState<VerifiedThermoPointData[]>([]);
  const [isThermoFinishing, setIsThermoFinishing] = useState(false);
  const [isThermoAllPointsDone, setIsThermoAllPointsDone] = useState(false);


  const [alcoCurrentStep, setAlcoCurrentStep] = useState(0);
  const [selectedAlcoPointConfig, setSelectedAlcoPointConfig] = useState<AlcotestVerificationPoint | null>(null);
  const [alcoPointReadingsInput, setAlcoPointReadingsInput] = useState<string[]>(["","",""]);
  const [currentAlcoReadingInput, setCurrentAlcoReadingInput] = useState("");
  const [alcoPointFinalResultData, setAlcoPointFinalResultData] = useState<ResultDisplayData | null>(null);
  

  const [importedThermometerSerials, setImportedThermometerSerials] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isZipMode, setIsZipMode] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [isFastVerifyMode, setIsFastVerifyMode] = useState(false);


  const { toast } = useToast();

  const activeDeviceConfig = useMemo(() => {
    if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && selectedSubDeviceType) {
      return DEVICE_CONFIGS[selectedSubDeviceType];
    }
    return selectedDevice ? DEVICE_CONFIGS[selectedDevice] : undefined;
  }, [selectedDevice, selectedSubDeviceType]);

  const isEffectivelyThermometer = useMemo(() =>
    (selectedDevice === 'thermometer') || (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && selectedSubDeviceType === 'thermometer'),
    [selectedDevice, selectedSubDeviceType]
  );

  const isEffectivelyAlcotest = useMemo(() =>
    (selectedDevice === 'alcotest') || (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && selectedSubDeviceType === 'alcotest'),
    [selectedDevice, selectedSubDeviceType]
  );
  
  useEffect(() => {
    setIsFastVerifyMode(getFastVerifyMode());
  }, []);

 useEffect(() => {
    if (isEffectivelyThermometer) {
      setImportedThermometerSerials(getImportedThermoSerials());
    } else {
      setImportedThermometerSerials([]);
    }
  }, [isEffectivelyThermometer]);


  const handleSetImportedSerials = (serials: string[]) => {
      saveImportedThermoSerials(serials);
      setImportedThermometerSerials(serials);
  };


  const availableImportedSerials = useMemo(() => {
    if (!isEffectivelyThermometer || importedThermometerSerials.length === 0) {
        return [];
    }
    // Filter out serials for which all points are already verified in dataEntries
    const allConfigThermoPoints = (DEVICE_CONFIGS.thermometer as ThermometerDeviceConfig).points;
    return importedThermometerSerials.filter(sn => {
        const entriesForSN = dataEntries.filter(
            entry => entry.serialNumber.toLowerCase() === sn.toLowerCase() &&
                     entry.deviceType === (selectedDevice === 'thermometer' ? 'thermometer' : selectedSubDeviceType) &&
                     isEffectivelyThermometer
        );
        if (entriesForSN.length === 0) return true; // SN not started yet

        const firstEntryForSN = entriesForSN[0]; // All points are in one entry
        const verifiedPointsInEntry = firstEntryForSN.measuredValues.verifiedThermoPoints || [];
        return verifiedPointsInEntry.length < allConfigThermoPoints.length;
    });
  }, [importedThermometerSerials, isEffectivelyThermometer, dataEntries, selectedDevice, selectedSubDeviceType]);


  const resetFormSpecifics = useCallback((preserveSerialNumber = false, preserveSubDeviceTypeAndSN = false) => {
    if (!preserveSerialNumber && !preserveSubDeviceTypeAndSN) {
      setSerialNumber("");
      setSerialNumberWarning(null);
    }

    if (!preserveSubDeviceTypeAndSN && selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId)) {
        setSelectedSubDeviceType(null);
    }

    const configForInitialValues = selectedDevice && (!INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) || preserveSubDeviceTypeAndSN)
                                  ? DEVICE_CONFIGS[selectedDevice as DeviceId]
                                  : undefined;
    if (configForInitialValues && 'fields' in configForInitialValues && (configForInitialValues as StandardDeviceConfig).fields.length > 0) {
      const newInitialFormValues: Record<string, string> = {};
      (configForInitialValues as StandardDeviceConfig).fields.forEach(field => {
        newInitialFormValues[field.id] = field.prefilledValue !== undefined ? field.prefilledValue : "";
      });
      setFormValues(newInitialFormValues);
    } else {
      setFormValues({});
    }

    setOverwriteConfirmation(null);
    setIsZipMode(false);
    setZipCode("");

    setThermoCurrentStep(0);
    setSelectedThermoPointConfig(null);
    setThermoReadings(["", "", ""]);
    setThermoCurrentReadingInput("");
    setThermoPointFinalResultData(null);
    setVerifiedThermoPointsData([]);
    setIsThermoFinishing(false);
    setIsThermoAllPointsDone(false);


    setAlcoCurrentStep(0);
    setSelectedAlcoPointConfig(null);
    setAlcoPointReadingsInput(["","",""]);
    setCurrentAlcoReadingInput("");
    setAlcoPointFinalResultData(null);

  }, [selectedDevice]);


  useEffect(() => {
    resetFormSpecifics();
  }, [selectedDevice, resetFormSpecifics]);


  useEffect(() => {
    if (overwriteConfirmation && selectedDevice) {
        const snMatch = overwriteConfirmation.sn.toLowerCase() === serialNumber.trim().toLowerCase();
        const deviceMatch = overwriteConfirmation.deviceType === selectedDevice;
        let subDeviceMatch = true;
        if (INSPECTOR_DEVICE_IDS.includes(selectedDevice)) {
            subDeviceMatch = overwriteConfirmation.subDeviceType === selectedSubDeviceType;
        }

        // For session-based overwrites (thermo/alco whole session), pointId should not be a factor in mismatching confirmation
        const isSessionOverwrite = (isEffectivelyThermometer || isEffectivelyAlcotest) && !overwriteConfirmation.pointId;

        if (isSessionOverwrite) {
           if (!snMatch || !deviceMatch || !subDeviceMatch) {
                setOverwriteConfirmation(null);
           }
        } else if (isEffectivelyThermometer && selectedThermoPointConfig && overwriteConfirmation.pointId) {
             // This was for point-by-point thermo save, less relevant now for session save
            const pointMatch = overwriteConfirmation.pointId === selectedThermoPointConfig.id;
            if (!snMatch || !deviceMatch || !subDeviceMatch || !pointMatch) {
                setOverwriteConfirmation(null);
            }
        } else if (isEffectivelyAlcotest && selectedAlcoPointConfig && overwriteConfirmation.pointId) {
            const pointMatch = overwriteConfirmation.pointId === selectedAlcoPointConfig.id;
            if (!snMatch || !deviceMatch || !subDeviceMatch || !pointMatch) {
                setOverwriteConfirmation(null);
            }
        } else { // Standard device or other cases
             if (!snMatch || !deviceMatch || !subDeviceMatch) {
                setOverwriteConfirmation(null);
            }
        }
    }
  }, [serialNumber, selectedDevice, selectedSubDeviceType, selectedThermoPointConfig, selectedAlcoPointConfig, overwriteConfirmation, isEffectivelyThermometer, isEffectivelyAlcotest]);

  useEffect(() => {
    if (isProcessingPointSave || thermoPointFinalResultData || alcoPointFinalResultData || isThermoAllPointsDone || isQrDialogOpen || isOverwriteDialogOpen || isThermoFinishing) return;

    if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && !selectedSubDeviceType) {
        serialNumberInputRef.current?.focus();
    } else if (isEffectivelyThermometer) {
      if (thermoCurrentStep === 0 && !isThermoAllPointsDone) {
         if (availableImportedSerials.length === 0) { // Only focus if no dropdown to select from
             serialNumberInputRef.current?.focus();
         }
      } else if (thermoCurrentStep >= 2 && thermoCurrentStep <= 4 && selectedThermoPointConfig && !isThermoAllPointsDone) {
        readingInputRef.current?.focus();
      }
    } else if (isEffectivelyAlcotest) {
      if (alcoCurrentStep === 0) {
        serialNumberInputRef.current?.focus();
      } else if (alcoCurrentStep >=2 && alcoCurrentStep <=4 && selectedAlcoPointConfig) {
         readingInputRef.current?.focus();
      }
    } else if (activeDeviceConfig && selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice) && 'fields' in activeDeviceConfig && (activeDeviceConfig as StandardDeviceConfig).fields.length > 0) {
        serialNumberInputRef.current?.focus();
    }
  }, [selectedDevice, selectedSubDeviceType,
      thermoCurrentStep, selectedThermoPointConfig, isThermoAllPointsDone,
      alcoCurrentStep, selectedAlcoPointConfig,
      isProcessingPointSave, thermoPointFinalResultData, alcoPointFinalResultData,
      activeDeviceConfig, isEffectivelyThermometer, isEffectivelyAlcotest,
      isQrDialogOpen, isOverwriteDialogOpen, availableImportedSerials, isThermoFinishing]);

  const handleReadingInputChange = (newValue: string, forThermo: boolean) => {
    let processedValue = newValue;
    processedValue = processedValue.replace(forThermo ? /[^0-9.-]/g : /[^0-9.]/g, '');

    if (processedValue.split('.').length > 2) {
      processedValue = processedValue.substring(0, processedValue.lastIndexOf('.'));
    }
    if (forThermo && processedValue.indexOf('-') > 0) {
        processedValue = processedValue.replace(/-/g, '');
        if (newValue.startsWith('-')) processedValue = '-' + processedValue;
    } else if (forThermo && processedValue.startsWith('--')) {
        processedValue = '-' + processedValue.substring(2);
    }

    const parts = processedValue.split('.');
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? parts[1] : undefined;

    const maxIntLength = forThermo ? 2 : ALCOTEST_MAX_INT_LENGTH;
    const maxDecLength = forThermo ? 1 : ALCOTEST_MAX_DEC_LENGTH;

    const intPartLengthToCheck = (forThermo && integerPart.startsWith('-')) ? integerPart.length - 1 : integerPart.length;

    if (intPartLengthToCheck > maxIntLength) {
        integerPart = (forThermo && integerPart.startsWith('-') ? '-' : '') + integerPart.replace('-', '').slice(0, maxIntLength);
    }
    if (decimalPart && decimalPart.length > maxDecLength) decimalPart = decimalPart.slice(0, maxDecLength);

    processedValue = integerPart;
    if (decimalPart !== undefined) {
      processedValue += '.' + decimalPart;
    } else if (newValue.includes('.') && !processedValue.endsWith('.') && parts.length > 1 && newValue.endsWith('.')) {
        processedValue += '.';
    }

    const currentInputVal = forThermo ? thermoCurrentReadingInput : currentAlcoReadingInput;

    if (newValue.length > currentInputVal.length) {
        if (forThermo) {
            const intDigits = integerPart.replace('-', '');
            if (intDigits.length === 2 && decimalPart === undefined && !processedValue.includes('.') && !newValue.endsWith('.')) {
              processedValue = integerPart + '.';
            }
        } else {
            const intDigits = integerPart;
            if (intDigits.length === 1 && decimalPart === undefined && !processedValue.includes('.') && !newValue.endsWith('.')) {
                processedValue += '.';
            }
        }
    }

    if (forThermo) setThermoCurrentReadingInput(processedValue);
    else setCurrentAlcoReadingInput(processedValue);
  };
  
  const processSerialNumber = (input: string): string => {
    let value = input.trim();
    if (value.toUpperCase().startsWith('T')) {
      value = value.substring(1);
    }
    value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return value;
  };
  
  const handleSerialNumberChange = (value: string) => {
    if (/[а-яА-ЯёЁ]/.test(value)) {
      setSerialNumberWarning('Серийный номер не может содержать русские буквы. Пожалуйста, используйте латиницу и цифры.');
    } else {
      setSerialNumberWarning(null);
    }
    
    // Auto-format while typing (optional, can be moved to onBlur)
    const processedValue = value.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    setSerialNumber(processedValue);
    
     if (overwriteConfirmation) {
        if(overwriteConfirmation.sn.toLowerCase() !== processedValue.trim().toLowerCase() ||
           overwriteConfirmation.deviceType !== selectedDevice ||
           (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && overwriteConfirmation.subDeviceType !== selectedSubDeviceType) ||
           (isEffectivelyThermometer && selectedThermoPointConfig && overwriteConfirmation.pointId !== selectedThermoPointConfig.id && overwriteConfirmation.pointId) ||
           (isEffectivelyThermometer && !selectedThermoPointConfig && overwriteConfirmation.pointId) ||
           (isEffectivelyAlcotest && selectedAlcoPointConfig && overwriteConfirmation.pointId !== selectedAlcoPointConfig.id && overwriteConfirmation.pointId) ||
           (isEffectivelyAlcotest && !selectedAlcoPointConfig && overwriteConfirmation.pointId)
        ) {
            setOverwriteConfirmation(null);
        }
    }
  };


  const handleScanQrCode = () => {
    const processedQrInput = processSerialNumber(qrInput);
    if (processedQrInput) {
      setSerialNumber(processedQrInput);
      setSerialNumberWarning(null); // Clear any previous warnings
      setIsQrDialogOpen(false);
      setQrInput("");
      toast({ title: "Серийный номер обновлен", description: `Серийный номер установлен: ${processedQrInput}` });

      if (isEffectivelyThermometer && thermoCurrentStep === 0) {
        handleThermoNextSNStep(processedQrInput);
      } else if (isEffectivelyAlcotest && alcoCurrentStep === 0) {
        handleAlcoNextSNStep(processedQrInput);
      } else if (!isEffectivelyThermometer && !isEffectivelyAlcotest) {
        const dialogShown = checkForExistingSerialAndPrompt(processedQrInput, selectedDevice, selectedSubDeviceType, undefined, true);
        if(dialogShown) return;
      }
    } else {
      toast({ title: "Ошибка", description: "Серийный номер не может быть пустым.", variant: "destructive" });
    }
  };


 const handleThermoNextSNStep = (currentSNValue?: string) => {
    const snToUse = processSerialNumber(currentSNValue || serialNumber);
    if (!snToUse.trim()) {
      toast({ title: "Ошибка", description: "Требуется серийный номер.", variant: "destructive" });
      return;
    }
    setSerialNumber(snToUse); // Update state with processed SN
    setThermoCurrentStep(1);
    setVerifiedThermoPointsData([]); // Start a new session for this S/N
    setSelectedThermoPointConfig(null);
    setThermoReadings(["","",""]);
    setThermoCurrentReadingInput("");
    setThermoPointFinalResultData(null);
    setIsThermoAllPointsDone(false); // Reset all points done flag for new S/N
};


 const handleThermoPointSelect = (pointConfig: ThermometerVerificationPoint, bypassCheck = false) => {
    if (isZipMode && !zipCode.trim()) {
      toast({ title: "Требуется код ЗИП", description: "Пожалуйста, введите код ЗИП, чтобы выбрать точку.", variant: "destructive" });
      return;
    }
    
    if (!bypassCheck) {
        const snToCheck = serialNumber.trim().toLowerCase();
        
        const existingEntry = dataEntries.find(entry =>
            entry.serialNumber.toLowerCase() === snToCheck &&
            entry.deviceType === selectedDevice &&
            (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true)
        );

        const pointIsAlreadyVerified = existingEntry?.measuredValues.verifiedThermoPoints?.some((p: VerifiedThermoPointData) => p.pointId === pointConfig.id);

        const isOverwriteConfirmed =
            overwriteConfirmation?.pointId === pointConfig.id &&
            overwriteConfirmation?.sn.toLowerCase() === snToCheck &&
            overwriteConfirmation.deviceType === selectedDevice &&
            (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? overwriteConfirmation.subDeviceType === selectedSubDeviceType : true);


        if (pointIsAlreadyVerified && !isOverwriteConfirmed) {
            setEntryDetailsForOverwriteDialog({
                sn: serialNumber.trim(),
                deviceType: selectedDevice!,
                subDeviceType: selectedSubDeviceType || undefined,
                pointId: pointConfig.id,
            });
            setIsOverwriteDialogOpen(true);
            return;
        }
    }
    
    setSelectedThermoPointConfig(pointConfig);
    const existingPointData = verifiedThermoPointsData.find(p => p.pointId === pointConfig.id);
    if (existingPointData) {
        setThermoReadings(existingPointData.readingsRaw.map(String));
    } else {
        setThermoReadings(["", "", ""]);
    }
    setThermoCurrentReadingInput("");
    setThermoPointFinalResultData(null);
    setThermoCurrentStep(2);
};


  const handleThermoAddReading = useCallback(() => {
    if (!thermoCurrentReadingInput.trim() || isNaN(parseFloat(thermoCurrentReadingInput))) {
        toast({ title: "Ошибка", description: "Введите корректное значение измерения.", variant: "destructive" });
        return;
    }
    const newReadings = [...thermoReadings];
    newReadings[thermoCurrentStep - 2] = thermoCurrentReadingInput;
    setThermoReadings(newReadings);
    setThermoCurrentReadingInput("");

    if (thermoCurrentStep < 4) {
        setThermoCurrentStep(thermoCurrentStep + 1);
    } else {
        // All 3 readings entered for this point, move to show result
        setThermoCurrentStep(5);
    }
  }, [thermoCurrentStep, thermoCurrentReadingInput, thermoReadings, toast]);

  const handleThermoPrevStep = () => {
     if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && selectedSubDeviceType === 'thermometer' && (thermoCurrentStep === 0 || thermoCurrentStep === 1)) {
        const currentSN = serialNumber;
        resetFormSpecifics(true, true); // Preserve SN, reset sub-device related states
        setSerialNumber(currentSN); // Re-set SN
        setSelectedSubDeviceType(null); // Go back to sub-device selection
        return;
    }
     if (thermoPointFinalResultData && thermoCurrentStep === 5) { // On result display screen
        setThermoPointFinalResultData(null);
        setThermoCurrentStep(4); // Go back to last reading input for correction
        setThermoCurrentReadingInput(thermoReadings[2] || "");
        return;
    }
    if (thermoCurrentStep === 1 && !isThermoAllPointsDone) { // On point selection screen
      setThermoCurrentStep(0); // Go back to S/N input
      setSelectedThermoPointConfig(null);
      setVerifiedThermoPointsData([]); // Clear points if going back to S/N
    } else if (thermoCurrentStep >= 2 && thermoCurrentStep <= 4) { // On reading input screens
      if (thermoCurrentStep === 2) { // First reading input
        setThermoCurrentStep(1); // Go back to point selection
        setSelectedThermoPointConfig(null);
        setThermoCurrentReadingInput("");
      } else { // Second or third reading input
        setThermoCurrentStep(prev => prev -1);
        setThermoCurrentReadingInput(thermoReadings[thermoCurrentStep - 3] || "");
      }
    } else if (thermoCurrentStep === 5) { // On result screen (should be handled by thermoPointFinalResultData check)
      setThermoCurrentStep(4);
      setThermoCurrentReadingInput(thermoReadings[2] || "");
      setThermoPointFinalResultData(null);
    } else if (isThermoAllPointsDone) { // If on "all points done" screen
        setIsThermoAllPointsDone(false);
        setThermoCurrentStep(1); // Go back to point selection
        setSelectedThermoPointConfig(null);
        setThermoPointFinalResultData(null);
    }
  };

  const thermoCurrentPointCalculations = useMemo((): VerifiedThermoPointData | null => {
    if (!isEffectivelyThermometer || !selectedThermoPointConfig || thermoReadings.some(r => r.trim() === "" || isNaN(parseFloat(r)))) {
      return null;
    }
    const r1 = parseFloat(thermoReadings[0]);
    const r2 = parseFloat(thermoReadings[1]);
    const r3 = parseFloat(thermoReadings[2]);

    const { tempCorrection, lowerLimit, upperLimit, referenceTemp, label, id: pointId } = selectedThermoPointConfig;

    const actual_temp_1 = r1 + tempCorrection;
    const actual_temp_2 = r2 + tempCorrection;
    const actual_temp_3 = r3 + tempCorrection;
    const average_actual_temp = (actual_temp_1 + actual_temp_2 + actual_temp_3) / 3;
    const verdict = (average_actual_temp >= lowerLimit && average_actual_temp <= upperLimit) ? "Годен" : "Брак";

    return {
      pointId,
      pointLabel: label,
      referenceTemp,
      tempCorrection,
      readingsRaw: [r1, r2, r3],
      readingsCorrected: [parseFloat(actual_temp_1.toFixed(2)), parseFloat(actual_temp_2.toFixed(2)), parseFloat(actual_temp_3.toFixed(2))],
      averageCorrectedTemp: parseFloat(average_actual_temp.toFixed(2)),
      lowerLimitPoint: lowerLimit,
      upperLimitPoint: upperLimit,
      verdict,
      timestamp: new Date().toISOString(),
    };
  }, [thermoReadings, selectedThermoPointConfig, isEffectivelyThermometer]);

 const handleThermoSaveCurrentPoint = useCallback(() => {
    if (!thermoCurrentPointCalculations) return;
    const existingPointIndex = verifiedThermoPointsData.findIndex(p => p.pointId === thermoCurrentPointCalculations.pointId);
    let updatedVerifiedPoints = [...verifiedThermoPointsData];
    if (existingPointIndex > -1) {
        updatedVerifiedPoints[existingPointIndex] = thermoCurrentPointCalculations;
    } else {
        updatedVerifiedPoints.push(thermoCurrentPointCalculations);
    }
    setVerifiedThermoPointsData(updatedVerifiedPoints);
    setThermoPointFinalResultData(null);
    setThermoCurrentReadingInput("");
    setThermoReadings(["","",""]);

    const thermoConfig = (activeDeviceConfig as ThermometerDeviceConfig | null);

    if (thermoConfig && updatedVerifiedPoints.length === thermoConfig.points.length) {
        setIsThermoAllPointsDone(true); // All points for this S/N are now done
        setThermoCurrentStep(1); // Stay on point selection screen, but show "All Done" state
        setSelectedThermoPointConfig(null);
        toast({title: "Все точки термометра поверены!", description: `Результаты для точки ${thermoCurrentPointCalculations.pointLabel} добавлены. Можно завершить поверку.`});
    } else {
        setSelectedThermoPointConfig(null); // Clear selected point
        setThermoCurrentStep(1); // Return to point selection to choose next point
        toast({title: "Точка термометра сохранена", description: `Результаты для точки ${thermoCurrentPointCalculations.pointLabel} добавлены/обновлены. Выберите следующую.`});
    }
  }, [thermoCurrentPointCalculations, verifiedThermoPointsData, activeDeviceConfig, toast]);

  const handleThermoFinishAndSaveAll = async () => {
    if (verifiedThermoPointsData.length === 0) {
      toast({title: "Нет данных", description: "Для термометра не было поверено ни одной точки.", variant: "destructive"});
      return;
    }
    if (isZipMode && !zipCode.trim()){
      toast({title: "Ошибка", description: "Укажите код ЗИП.", variant: "destructive"});
      return;
    }
    setIsThermoFinishing(true);
    await handleSubmitForm(undefined, { isThermoFinishingContext: true });
    setIsThermoFinishing(false); // Reset finishing state after attempt

    // After saving, reset form for next S/N or sub-device selection
    if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice)) {
        const currentSN = serialNumber;
        resetFormSpecifics(true, false); // Preserve S/N, reset sub-device choice
        setSerialNumber(currentSN);
        setSelectedSubDeviceType(null);
    } else {
        resetFormSpecifics(); // Full reset for standalone thermometer
    }
  };


  const handleAlcoNextSNStep = (currentSNValue?: string) => {
    const snToUse = processSerialNumber(currentSNValue || serialNumber);
    if (!snToUse.trim()) {
      toast({ title: "Ошибка", description: "Требуется серийный номер.", variant: "destructive" });
      return;
    }
    setSerialNumber(snToUse);
    setAlcoCurrentStep(1);
    setSelectedAlcoPointConfig(null);
    setAlcoPointReadingsInput(["","",""]);
    setCurrentAlcoReadingInput("");
    setAlcoPointFinalResultData(null);
  };

  const handleAlcoPointSelect = (pointConfig: AlcotestVerificationPoint, bypassCheck = false) => {
    if (!bypassCheck) {
        const snToCheck = serialNumber.trim().toLowerCase();
        const existingEntry = dataEntries.find(entry =>
            entry.serialNumber.toLowerCase() === snToCheck &&
            entry.deviceType === selectedDevice &&
            (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true)
        );
        
        const pointIsAlreadyVerified = existingEntry?.measuredValues.verifiedAlcoPoints?.some((p: VerifiedAlcoPointData) => p.pointValue === pointConfig.id);

        const isOverwriteConfirmed =
            overwriteConfirmation?.pointId === pointConfig.id &&
            overwriteConfirmation?.sn.toLowerCase() === snToCheck &&
            overwriteConfirmation.deviceType === selectedDevice &&
            (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? overwriteConfirmation.subDeviceType === selectedSubDeviceType : true);
        
        if (pointIsAlreadyVerified && !isOverwriteConfirmed) {
            setEntryDetailsForOverwriteDialog({
                sn: serialNumber.trim(),
                deviceType: selectedDevice!,
                subDeviceType: selectedSubDeviceType || undefined,
                pointId: pointConfig.id,
            });
            setIsOverwriteDialogOpen(true);
            return;
        }
    }

    setSelectedAlcoPointConfig(pointConfig);
    setAlcoPointReadingsInput(["", "", ""]);
    setCurrentAlcoReadingInput("");
    setAlcoPointFinalResultData(null);
    setAlcoCurrentStep(2);
  };

  const handleAlcoAddReading = useCallback(() => {
    if (!currentAlcoReadingInput.trim() || isNaN(parseFloat(currentAlcoReadingInput))) {
      toast({ title: "Ошибка", description: "Введите корректное значение измерения.", variant: "destructive" });
      return;
    }
    const newReadings = [...alcoPointReadingsInput];
    newReadings[alcoCurrentStep - 2] = currentAlcoReadingInput;
    setAlcoPointReadingsInput(newReadings);
    setCurrentAlcoReadingInput("");

    if (alcoCurrentStep < 4) {
      setAlcoCurrentStep(alcoCurrentStep + 1);
    } else {
      setAlcoCurrentStep(5);
    }
  }, [alcoCurrentStep, currentAlcoReadingInput, alcoPointReadingsInput, toast]);

  const handleAlcoPrevStep = () => {
     if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && selectedSubDeviceType === 'alcotest' && (alcoCurrentStep === 0 || alcoCurrentStep === 1)) {
      const currentSN = serialNumber;
      resetFormSpecifics(true, true);
      setSerialNumber(currentSN);
      setSelectedSubDeviceType(null);
      return;
    }
     if (alcoPointFinalResultData && alcoCurrentStep === 5) {
        setAlcoPointFinalResultData(null);
        setAlcoCurrentStep(4);
        setCurrentAlcoReadingInput(alcoPointReadingsInput[2] || "");
        return;
    }
    if (alcoCurrentStep === 1) {
      setAlcoCurrentStep(0);
      setSelectedAlcoPointConfig(null);
    } else if (alcoCurrentStep >= 2 && alcoCurrentStep <= 4) {
      if (alcoCurrentStep === 2) {
        setAlcoCurrentStep(1);
        setSelectedAlcoPointConfig(null);
        setCurrentAlcoReadingInput("");
      } else {
        setAlcoCurrentStep(prev => prev -1);
        setCurrentAlcoReadingInput(alcoPointReadingsInput[alcoCurrentStep - 3] || "");
      }
    } else if (alcoCurrentStep === 5) {
      setAlcoCurrentStep(4);
      setCurrentAlcoReadingInput(alcoPointReadingsInput[2] || "");
      setAlcoPointFinalResultData(null);
    }
  };

  const alcoPointCalculations = useMemo((): VerifiedAlcoPointData | null => {
    if (!selectedAlcoPointConfig || alcoPointReadingsInput.some(r => r.trim() === "" || isNaN(parseFloat(r)))) {
      return null;
    }
    const readingsNum = alcoPointReadingsInput.map(r => parseFloat(r));
    const averageReading = readingsNum.reduce((sum, val) => sum + val, 0) / readingsNum.length;
    const verdict = (averageReading >= selectedAlcoPointConfig.lowerLimit && averageReading <= selectedAlcoPointConfig.upperLimit) ? "Годен" : "Брак";

    return {
      pointValue: selectedAlcoPointConfig.id,
      referenceMgL: selectedAlcoPointConfig.referenceMgL,
      referenceMgCm3: selectedAlcoPointConfig.referenceMgCm3,
      readings: readingsNum as [number,number,number],
      averageReading: parseFloat(averageReading.toFixed(3)),
      lowerLimit: selectedAlcoPointConfig.lowerLimit,
      upperLimit: selectedAlcoPointConfig.upperLimit,
      verdict,
    };
  }, [selectedAlcoPointConfig, alcoPointReadingsInput]);

  const generateFakeThermoPointData = (pointConfig: ThermometerVerificationPoint): VerifiedThermoPointData => {
    const { tempCorrection, referenceTemp, lowerLimit, upperLimit, label, id } = pointConfig;
    const targetAvgCorrected = referenceTemp + (Math.random() - 0.5) * (upperLimit - lowerLimit) * 0.5;
    const targetAvgRaw = targetAvgCorrected - tempCorrection;
    const deviation = 0.1;
    const r1_raw = targetAvgRaw + (Math.random() - 0.5) * deviation;
    const r2_raw = targetAvgRaw + (Math.random() - 0.5) * deviation;
    const r3_raw = (targetAvgRaw * 3) - r1_raw - r2_raw;
    const readingsRaw: [number, number, number] = [
        parseFloat(r1_raw.toFixed(1)),
        parseFloat(r2_raw.toFixed(1)),
        parseFloat(r3_raw.toFixed(1))
    ];
    const actual_temp_1 = readingsRaw[0] + tempCorrection;
    const actual_temp_2 = readingsRaw[1] + tempCorrection;
    const actual_temp_3 = readingsRaw[2] + tempCorrection;
    const average_actual_temp = (actual_temp_1 + actual_temp_2 + actual_temp_3) / 3;
    const verdict = (average_actual_temp >= lowerLimit && average_actual_temp <= upperLimit) ? "Годен" : "Брак";

    return {
      pointId: id, pointLabel: label, referenceTemp, tempCorrection, readingsRaw,
      readingsCorrected: [parseFloat(actual_temp_1.toFixed(2)), parseFloat(actual_temp_2.toFixed(2)), parseFloat(actual_temp_3.toFixed(2))],
      averageCorrectedTemp: parseFloat(average_actual_temp.toFixed(2)),
      lowerLimitPoint: lowerLimit, upperLimitPoint: upperLimit, verdict,
      timestamp: new Date().toISOString(),
    };
  };

  const handleSubmitForm = useCallback(async (e?: FormEvent, context?: { isThermoFinishingContext?: boolean; isThermoAutoSaveContext?: boolean; isAlcoAutoSaveContext?: boolean }) => {
    if (e) e.preventDefault();
    if (!selectedInspector || !selectedDevice) {
      toast({ title: "Ошибка", description: "Пожалуйста, выберите устройство и поверителя.", variant: "destructive" }); return;
    }
    if (INSPECTOR_DEVICE_IDS.includes(selectedDevice) && !selectedSubDeviceType) {
      toast({ title: "Ошибка", description: `Для '${DEVICE_CONFIGS[selectedDevice].name}' необходимо выбрать тип поверки.`, variant: "destructive" }); return;
    }
    if (!activeDeviceConfig) {
      toast({ title: "Ошибка настроек", description: "Не удалось определить настройки устройства.", variant: "destructive"}); return;
    }
    const trimmedSerialNumber = serialNumber.trim();
    if (!trimmedSerialNumber) {
      toast({ title: "Ошибка", description: "Требуется серийный номер.", variant: "destructive" }); return;
    }
    if (serialNumberWarning) {
      toast({ title: "Ошибка в серийном номере", description: serialNumberWarning, variant: "destructive" }); return;
    }

    let measuredValuesToSave: DataEntry['measuredValues'] = {};
    let proceedToSave = true;
    let finalDeviceName = activeDeviceConfig.name;
    let isOverwriteOperation = false;
    let existingEntry: DataEntry | undefined = undefined;


    if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice)) {
      measuredValuesToSave['subDeviceType'] = selectedSubDeviceType as DeviceId;
      finalDeviceName = `${DEVICE_CONFIGS[selectedDevice].name} (${activeDeviceConfig.name})`
    }
    
    if (isZipMode && zipCode.trim()) {
      measuredValuesToSave.zipCode = zipCode.trim();
    } else if (isZipMode && !zipCode.trim()) {
        toast({ title: "Ошибка", description: "Код ЗИП не может быть пустым, если режим ЗИП включен.", variant: "destructive" });
        proceedToSave = false;
    }

    const isThermoFinishingContext = !!context?.isThermoFinishingContext;
    const isThermoAutoSaveContext = !!context?.isThermoAutoSaveContext;
    const isAlcoAutoSaveContext = !!context?.isAlcoAutoSaveContext;


    if (isEffectivelyThermometer && isThermoAutoSaveContext && thermoCurrentPointCalculations && selectedThermoPointConfig) {
        if (isZipMode && !zipCode.trim()) {
            toast({ title: "Ошибка", description: "Укажите код ЗИП.", variant: "destructive" });
            proceedToSave = false;
        }
        if (proceedToSave) {
            setIsProcessingPointSave(true);
            if (isFastVerifyMode && selectedThermoPointConfig.id === '37.0') {
                const manualPointData = thermoCurrentPointCalculations;
                const thermometerConfig = DEVICE_CONFIGS['thermometer'] as ThermometerDeviceConfig;
                const otherPointsToGenerate = thermometerConfig.points.filter(p => p.id !== '37.0');
                const generatedPointsData = otherPointsToGenerate.map(p => generateFakeThermoPointData(p));
                const allPointsForSession = [manualPointData, ...generatedPointsData].sort((a, b) => a.referenceTemp - b.referenceTemp);

                existingEntry = dataEntries.find(entry => entry.serialNumber.toLowerCase() === trimmedSerialNumber.toLowerCase() && entry.deviceType === selectedDevice && ((INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId)) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true));
                isOverwriteOperation = !!existingEntry;
                if (existingEntry && !(overwriteConfirmation?.sn.toLowerCase() === trimmedSerialNumber.toLowerCase() && !overwriteConfirmation.pointId)) {
                    setEntryDetailsForOverwriteDialog({ sn: trimmedSerialNumber, deviceType: selectedDevice as DeviceId, subDeviceType: selectedSubDeviceType || undefined });
                    setIsOverwriteDialogOpen(true);
                    proceedToSave = false;
                } else {
                    measuredValuesToSave = { ...measuredValuesToSave, verifiedThermoPoints: allPointsForSession, };
                    if (existingEntry) { /* ID will be used from existing entry */ }
                }
            } else { // Normal point-by-point auto-save
                let sessionEntry = dataEntries.find(entry => entry.serialNumber.toLowerCase() === trimmedSerialNumber.toLowerCase() && entry.deviceType === selectedDevice && (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true));
                let currentThermoSessionPoints = sessionEntry?.measuredValues.verifiedThermoPoints ? [...sessionEntry.measuredValues.verifiedThermoPoints] : [];
                const pointIndex = currentThermoSessionPoints.findIndex(p => p.pointId === selectedThermoPointConfig.id);

                if (pointIndex > -1) {
                    isOverwriteOperation = !!(overwriteConfirmation?.sn.toLowerCase() === trimmedSerialNumber.toLowerCase() && overwriteConfirmation?.pointId === selectedThermoPointConfig.id);
                    if (!isOverwriteOperation) {
                        toast({ title: "Сохранение отменено", description: `Точка ${selectedThermoPointConfig.label} для S/N ${trimmedSerialNumber} уже существует, и перезапись не была подтверждена.`, variant: "destructive" });
                        proceedToSave = false;
                    } else {
                        currentThermoSessionPoints[pointIndex] = thermoCurrentPointCalculations;
                    }
                } else {
                    currentThermoSessionPoints.push(thermoCurrentPointCalculations);
                    isOverwriteOperation = false;
                }
                
                if (proceedToSave) {
                    measuredValuesToSave = { ...measuredValuesToSave, verifiedThermoPoints: currentThermoSessionPoints, };
                    if (sessionEntry) {
                         existingEntry = sessionEntry;
                         isOverwriteOperation = true;
                    }
                }
            }
        }
    } else if (isEffectivelyThermometer && isThermoFinishingContext) { // Saving entire thermo session from "Save All" button
        if (verifiedThermoPointsData.length === 0) {
             toast({ title: "Ошибка", description: "Для термометра не поверено ни одной точки.", variant: "destructive" });
             proceedToSave = false;
        } else if (isZipMode && !zipCode.trim()) {
            toast({ title: "Ошибка", description: "Код ЗИП не может быть пустым при сохранении в режиме ЗИП.", variant: "destructive" });
            proceedToSave = false;
        } else {
            measuredValuesToSave = { ...measuredValuesToSave, verifiedThermoPoints: verifiedThermoPointsData };
            existingEntry = dataEntries.find(entry => entry.serialNumber.toLowerCase() === trimmedSerialNumber.toLowerCase() && entry.deviceType === selectedDevice && (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true));
            if (existingEntry) {
                 isOverwriteOperation = !!(overwriteConfirmation?.sn.toLowerCase() === trimmedSerialNumber.toLowerCase() && !overwriteConfirmation.pointId);
                 if (!isOverwriteOperation) {
                    toast({ title: "Сохранение отменено", description: `Запись для S/N ${trimmedSerialNumber} (Термометр) уже существует, и перезапись не была подтверждена.`, variant: "destructive" });
                    proceedToSave = false;
                }
            }
        }
    } else if (isEffectivelyAlcotest && isAlcoAutoSaveContext && alcoPointCalculations && selectedAlcoPointConfig) {
        let sessionEntry = dataEntries.find(entry => entry.serialNumber.toLowerCase() === trimmedSerialNumber.toLowerCase() && entry.deviceType === selectedDevice && (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true));
        let currentAlcoSessionPoints = sessionEntry?.measuredValues.verifiedAlcoPoints ? [...sessionEntry.measuredValues.verifiedAlcoPoints] : [];
        const pointIndex = currentAlcoSessionPoints.findIndex(p => p.pointValue === selectedAlcoPointConfig.id);

        if (pointIndex > -1) {
            isOverwriteOperation = !!(overwriteConfirmation?.sn.toLowerCase() === trimmedSerialNumber.toLowerCase() && overwriteConfirmation?.pointId === selectedAlcoPointConfig.id);
            if (!isOverwriteOperation) {
                toast({ title: "Сохранение отменено", description: `Точка ${selectedAlcoPointConfig.label} для S/N ${trimmedSerialNumber} уже существует, и перезапись не была подтверждена.`, variant: "destructive" });
                proceedToSave = false;
            } else {
                currentAlcoSessionPoints[pointIndex] = alcoPointCalculations;
            }
        } else {
            currentAlcoSessionPoints.push(alcoPointCalculations);
            isOverwriteOperation = false;
        }
        
        if (proceedToSave) {
            measuredValuesToSave = { ...measuredValuesToSave, verifiedAlcoPoints: currentAlcoSessionPoints, };
            if (sessionEntry) {
                 existingEntry = sessionEntry;
                 isOverwriteOperation = true;
            }
        }
    } else if (!isEffectivelyThermometer && !isEffectivelyAlcotest) { // Standard Device
        if ('fields' in activeDeviceConfig && (activeDeviceConfig as StandardDeviceConfig).fields.length > 0) {
            for (const field of (activeDeviceConfig as StandardDeviceConfig).fields) {
                const value = formValues[field.id];
                if (field.required && (value === undefined || String(value).trim() === "")) {
                    toast({ title: "Ошибка валидации", description: `Поле "${field.label}" обязательно для заполнения.`, variant: "destructive" });
                    proceedToSave = false; break;
                }
                if (value !== undefined && value !== null && (String(value).trim() !== "" || field.readOnly)) {
                    measuredValuesToSave[field.id] = field.type === 'number' ? parseFloat(String(value)) : String(value);
                }
            }
        } else {
             if (!(selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && !selectedSubDeviceType)) {
                 toast({title: "Ошибка настроек", description: "Устройство не имеет полей для ввода.", variant: "destructive"});
                 proceedToSave = false;
            }
        }
        existingEntry = dataEntries.find(entry => entry.serialNumber.toLowerCase() === trimmedSerialNumber.toLowerCase() && entry.deviceType === selectedDevice && (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? (entry.measuredValues as any).subDeviceType === selectedSubDeviceType : true));
         if (existingEntry && !(overwriteConfirmation?.sn.toLowerCase() === trimmedSerialNumber.toLowerCase() && !overwriteConfirmation.pointId)) {
            setEntryDetailsForOverwriteDialog({ sn: trimmedSerialNumber, deviceType: selectedDevice as DeviceId, subDeviceType: selectedSubDeviceType || undefined });
            setIsOverwriteDialogOpen(true);
            proceedToSave = false;
        } else if (existingEntry) {
            isOverwriteOperation = true;
        }
    } else {
        proceedToSave = false;
        console.warn("handleSubmitForm called with unhandled context or missing data", {isEffectivelyThermometer, isEffectivelyAlcotest, context, thermoCurrentPointCalculations, alcoPointCalculations, selectedThermoPointConfig, selectedAlcoPointConfig});
        if (isThermoAutoSaveContext || isAlcoAutoSaveContext) { /* Suppress toast for auto-save attempts before data is ready */ }
        else toast({ title: "Ошибка", description: "Не удалось определить действие для сохранения.", variant: "destructive" });
    }


    if (!proceedToSave) {
      if (isThermoAutoSaveContext) setIsProcessingPointSave(false);
      else if (isAlcoAutoSaveContext) setIsProcessingPointSave(false);
      else if (isThermoFinishingContext) setIsThermoFinishing(false);
      return;
    }

    const entryId = (existingEntry && isOverwriteOperation) ? existingEntry.id : crypto.randomUUID();

    const newEntryData: DataEntry = {
      id: entryId,
      serialNumber: trimmedSerialNumber,
      deviceType: selectedDevice as DeviceId,
      deviceName: finalDeviceName,
      measuredValues: measuredValuesToSave,
      inspectorName: selectedInspector.name,
      timestamp: new Date().toISOString(),
      inspectorId: selectedInspector.id
    };

    try {
      await onSaveEntry(newEntryData, isOverwriteOperation);
      
      let toastMessage = `Запись для S/N ${trimmedSerialNumber}`;
      let showMainToast = true;

      if (isThermoAutoSaveContext && selectedThermoPointConfig) {
        if (isFastVerifyMode && selectedThermoPointConfig.id === '37.0') {
            toast({
                title: "S/N Завершен (Ускоренный режим)",
                description: `Все точки для S/N ${trimmedSerialNumber} поверены и сохранены. S/N удален из импортированных.`,
            });
            handleSetImportedSerials(importedThermometerSerials.filter(sn => sn.toLowerCase() !== trimmedSerialNumber.toLowerCase()));
            showMainToast = false;
        } else {
             toastMessage += `, точка ${selectedThermoPointConfig.label} ${isOverwriteOperation && existingEntry ? 'обновлена' : 'сохранена'}.`;
        }
        
        const allConfigThermoPoints = (DEVICE_CONFIGS.thermometer as ThermometerDeviceConfig).points;
        const currentSavedPoints = newEntryData.measuredValues.verifiedThermoPoints || [];
        if (!isFastVerifyMode && allConfigThermoPoints.every(configPoint => currentSavedPoints.some(p => p.pointId === configPoint.id))) {
            handleSetImportedSerials(importedThermometerSerials.filter(sn => sn.toLowerCase() !== trimmedSerialNumber.toLowerCase()));
            toast({ title: "S/N Завершен (Термометр)", description: `Все точки для S/N ${trimmedSerialNumber} поверены. S/N удален из импортированных.`});
        }
        resetFormSpecifics(false);

      } else if (isThermoFinishingContext) {
        toastMessage += ` (Термометр) ${isOverwriteOperation ? 'перезаписана' : 'сохранена'}. Сохранено ${verifiedThermoPointsData.length} точек.`;
        if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice)) { resetFormSpecifics(true, false); setSerialNumber(trimmedSerialNumber); setSelectedSubDeviceType(null); }
        else { resetFormSpecifics(); }
      } else if (isAlcoAutoSaveContext && selectedAlcoPointConfig) {
        // This context is now handled by handleAlcoSaveCurrentPointAndGoToNext which does not call resetFormSpecifics() fully
        // A simple toast here is sufficient as the more descriptive one is in the calling function.
        // The main save logic is in handleSubmitForm, but the UI flow reset is in the caller.
      } else if (!isEffectivelyThermometer && !isEffectivelyAlcotest) { // Standard device
          toastMessage += ` ${isOverwriteOperation ? 'перезаписана' : 'сохранена'}.`;
          resetFormSpecifics();
      }
      
      if (showMainToast) toast({ title: "Успешно", description: toastMessage });

    } catch (error) {
      console.error("Ошибка сохранения:", error);
      toast({ title: "Ошибка сохранения", description: "Не удалось сохранить запись.", variant: "destructive" });
    } finally {
      if (isThermoAutoSaveContext) setIsProcessingPointSave(false);
      else if (isAlcoAutoSaveContext) setIsProcessingPointSave(false);
      else if (isThermoFinishingContext) setIsThermoFinishing(false);
    }

  }, [
    activeDeviceConfig, selectedInspector, serialNumber, formValues,
    isEffectivelyThermometer, isEffectivelyAlcotest,
    selectedThermoPointConfig, thermoCurrentPointCalculations, verifiedThermoPointsData,
    selectedAlcoPointConfig, alcoPointCalculations,
    onSaveEntry, toast, resetFormSpecifics,
    dataEntries, overwriteConfirmation, selectedDevice, selectedSubDeviceType,
    isFastVerifyMode, importedThermometerSerials,
    isZipMode, zipCode, serialNumberWarning
  ]);


  useEffect(() => { // Effect for Thermometer point result and auto-save
    if (isEffectivelyThermometer && thermoCurrentStep === 5 && selectedThermoPointConfig && !isThermoAllPointsDone && !isThermoFinishing) {
        if (!thermoCurrentPointCalculations) {
             setThermoPointFinalResultData({ icon: AlertCircle, title: "Ошибка расчета", description: "Не удалось рассчитать результат для точки. Проверьте введенные значения.", variant: 'warning' });
            return;
        }
        const { verdict } = thermoCurrentPointCalculations;
        const pointLabelText = selectedThermoPointConfig.label;

        let description;
        if (isFastVerifyMode && selectedThermoPointConfig.id === '37.0') {
            description = `Результат для точки ${pointLabelText}: ${verdict}. Остальные точки будут сгенерированы. Данные будут автоматически сохранены.`;
        } else {
            description = `Результат для точки ${pointLabelText}: ${verdict}. Данные будут автоматически сохранены. Форма будет сброшена для ввода следующего S/N.`;
        }

        let newFinalResultData: ResultDisplayData;
        if (verdict === "Годен") {
            newFinalResultData = { icon: Check, title: `${pointLabelText}: Годен!`, description, variant: 'success' };
        } else {
            newFinalResultData = { icon: AlertTriangle, title: `${pointLabelText}: ${verdict}!`, description, variant: verdict === "Брак" ? 'error' : 'warning' };
        }
        setThermoPointFinalResultData(newFinalResultData);
    }
  }, [isEffectivelyThermometer, thermoCurrentStep, selectedThermoPointConfig, thermoCurrentPointCalculations, isThermoAllPointsDone, isThermoFinishing, isFastVerifyMode]);


  useEffect(() => { // Auto-save for individual thermometer point
    let timeoutId: NodeJS.Timeout | null = null;
    if (isEffectivelyThermometer && thermoPointFinalResultData && (thermoPointFinalResultData.variant === 'success' || thermoPointFinalResultData.variant === 'error') && selectedThermoPointConfig && !isThermoFinishing && !isThermoAllPointsDone) {
        setIsProcessingPointSave(true);
        if (!isOverwriteDialogOpen) {
            timeoutId = setTimeout(async () => {
                await handleSubmitForm(undefined, { isThermoAutoSaveContext: true });
            }, 1000);
        } else {
             setIsProcessingPointSave(false);
        }
    }
    return () => { // Cleanup
      if (timeoutId) clearTimeout(timeoutId);
      if(isEffectivelyThermometer && thermoCurrentStep === 5) setIsProcessingPointSave(false);
    };
  }, [isEffectivelyThermometer, thermoPointFinalResultData, selectedThermoPointConfig, handleSubmitForm, isOverwriteDialogOpen, isThermoFinishing, isThermoAllPointsDone, thermoCurrentStep]);


  const handleAlcoSaveCurrentPointAndGoToNext = useCallback(async () => {
    if (!alcoPointCalculations || !selectedAlcoPointConfig) return;
    setIsProcessingPointSave(true);

    try {
        await handleSubmitForm(undefined, { isAlcoAutoSaveContext: true });
        
        // After successful save, reset for the next point, not the next S/N
        setAlcoPointFinalResultData(null);
        setSelectedAlcoPointConfig(null);
        setAlcoPointReadingsInput(["","",""]);
        setCurrentAlcoReadingInput("");
        setAlcoCurrentStep(1); // Go back to point selection.

        toast({
            title: "Точка алкотестера сохранена",
            description: `Результаты для точки ${selectedAlcoPointConfig.label} добавлены/обновлены. Выберите следующую.`
        });

    } catch(error) {
        // Error is handled inside handleSubmitForm, but we can add more here if needed
    } finally {
        setIsProcessingPointSave(false);
    }
  }, [alcoPointCalculations, selectedAlcoPointConfig, handleSubmitForm, toast]);

  useEffect(() => { // Effect for Alcotest point result display
    if (isEffectivelyAlcotest && alcoCurrentStep === 5 && selectedAlcoPointConfig) {
        if (!alcoPointCalculations) {
             setAlcoPointFinalResultData({ icon: AlertCircle, title: "Ошибка расчета", description: "Не удалось рассчитать результат для точки. Проверьте введенные значения.", variant: 'warning' });
            return;
        }
        const { verdict } = alcoPointCalculations;
        const pointConfig = (activeDeviceConfig as AlcotestDeviceConfig | null)?.points.find(p => p.id === selectedAlcoPointConfig.id);
        const pointLabelText = pointConfig ? pointConfig.label : selectedAlcoPointConfig.id;

        const description = `Результат: ${verdict}. Данные для точки "${pointLabelText}" сохранены. Теперь можно выбрать следующую точку.`;

        let newFinalResultData: ResultDisplayData;
        if (verdict === "Годен") {
            newFinalResultData = { icon: Check, title: `${pointLabelText}: Годен!`, description, variant: 'success' };
        } else {
            newFinalResultData = { icon: AlertTriangle, title: `${pointLabelText}: ${verdict}!`, description, variant: verdict === "Брак" ? 'error' : 'warning' };
        }
        setAlcoPointFinalResultData(newFinalResultData);
    }
  }, [isEffectivelyAlcotest, alcoCurrentStep, selectedAlcoPointConfig, alcoPointCalculations, activeDeviceConfig]);

  useEffect(() => { // Auto-save for individual alcotest point
    let timeoutId: NodeJS.Timeout | null = null;
    if (isEffectivelyAlcotest && alcoPointFinalResultData && (alcoPointFinalResultData.variant === 'success' || alcoPointFinalResultData.variant === 'error') && selectedAlcoPointConfig) {
        setIsProcessingPointSave(true);
        if (!isOverwriteDialogOpen) {
            timeoutId = setTimeout(() => handleAlcoSaveCurrentPointAndGoToNext(), 1000);
        } else {
             setIsProcessingPointSave(false);
        }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if(isEffectivelyAlcotest && alcoCurrentStep === 5) setIsProcessingPointSave(false);
    };
  }, [isEffectivelyAlcotest, alcoPointFinalResultData, selectedAlcoPointConfig, handleAlcoSaveCurrentPointAndGoToNext, isOverwriteDialogOpen, alcoCurrentStep]);


  const handleReadingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isEffectivelyThermometer && selectedThermoPointConfig && thermoCurrentStep >=2 && thermoCurrentStep <=4) {
        if (thermoCurrentReadingInput.trim() !== "" && !isNaN(parseFloat(thermoCurrentReadingInput))) handleThermoAddReading();
        else toast({ title: "Ошибка", description: "Введите корректное значение измерения.", variant: "destructive" });
      } else if (isEffectivelyAlcotest && selectedAlcoPointConfig && alcoCurrentStep >=2 && alcoCurrentStep <=4) {
        if (currentAlcoReadingInput.trim() !== "" && !isNaN(parseFloat(currentAlcoReadingInput))) handleAlcoAddReading();
        else toast({ title: "Ошибка", description: "Введите корректное значение измерения.", variant: "destructive" });
      }
    }
  };

  const checkForExistingSerialAndPrompt = useCallback((
    currentSNValue: string,
    currentDeviceType?: DeviceId,
    currentSubDeviceType?: DeviceId | null,
    currentPointIdForCheck?: string,
    isFullSessionCheck?: boolean
  ) => {
    if (!currentSNValue.trim() || !currentDeviceType || !DEVICE_CONFIGS[currentDeviceType] || (INSPECTOR_DEVICE_IDS.includes(currentDeviceType) && !currentSubDeviceType)) return false;

    const snToCheck = currentSNValue.trim().toLowerCase();
    const existingEntry = dataEntries.find(entry => {
        const snMatch = entry.serialNumber.toLowerCase() === snToCheck;
        const deviceTypeMatch = entry.deviceType === currentDeviceType;
        const subDeviceMatch = INSPECTOR_DEVICE_IDS.includes(currentDeviceType as DeviceId) ? (entry.measuredValues as any).subDeviceType === currentSubDeviceType : true;
        return snMatch && deviceTypeMatch && subDeviceMatch;
    });

    if (!existingEntry) return false;

    let isConflict = false;
    let pointIdForDialog: string | undefined = undefined;

    if (isEffectivelyThermometer && currentPointIdForCheck && !isFullSessionCheck) {
        const thermoPoints = existingEntry.measuredValues.verifiedThermoPoints as VerifiedThermoPointData[] | undefined;
        if (thermoPoints?.some(p => p.pointId === currentPointIdForCheck)) {
             isConflict = true;
             pointIdForDialog = currentPointIdForCheck;
        }
    } else if (isEffectivelyAlcotest && currentPointIdForCheck && !isFullSessionCheck) {
        const alcoPoints = existingEntry.measuredValues.verifiedAlcoPoints as VerifiedAlcoPointData[] | undefined;
        if (alcoPoints?.some(p => p.pointValue === currentPointIdForCheck)) {
             isConflict = true;
             pointIdForDialog = currentPointIdForCheck;
        }
    } else if (isFullSessionCheck || (isFastVerifyMode && isEffectivelyThermometer)) { // Session level conflict
        isConflict = true;
    }


    const isAlreadyConfirmed =
        overwriteConfirmation?.sn.toLowerCase() === snToCheck &&
        overwriteConfirmation?.deviceType === currentDeviceType &&
        (INSPECTOR_DEVICE_IDS.includes(currentDeviceType as DeviceId) ? overwriteConfirmation.subDeviceType === currentSubDeviceType : true) &&
        (pointIdForDialog ? overwriteConfirmation.pointId === pointIdForDialog : !overwriteConfirmation.pointId);


    if (isConflict && !isAlreadyConfirmed) {
        setEntryDetailsForOverwriteDialog({
            sn: currentSNValue.trim(),
            deviceType: currentDeviceType,
            subDeviceType: currentSubDeviceType || undefined,
            pointId: pointIdForDialog,
        });
        setIsOverwriteDialogOpen(true);
        return true;
    }
    return false;
  }, [dataEntries, overwriteConfirmation, isEffectivelyThermometer, isEffectivelyAlcotest, isFastVerifyMode]);


  const handleSerialNumberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const processedSN = processSerialNumber(serialNumber);
      setSerialNumber(processedSN);
      if (!processedSN) {
        toast({ title: "Ошибка", description: "Требуется серийный номер.", variant: "destructive" }); return;
      }
      if (serialNumberWarning) {
        toast({ title: "Ошибка ввода", description: serialNumberWarning, variant: "destructive" }); return;
      }
      if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && !selectedSubDeviceType) return;
      
      if (isEffectivelyThermometer && thermoCurrentStep === 0) {
        if(isFastVerifyMode) {
          if (checkForExistingSerialAndPrompt(processedSN, selectedDevice, selectedSubDeviceType, undefined, true)) return;
        }
        handleThermoNextSNStep(processedSN);
      } else if (isEffectivelyAlcotest && alcoCurrentStep === 0) {
        handleAlcoNextSNStep(processedSN);
      } else if (!isEffectivelyThermometer && !isEffectivelyAlcotest) {
        const dialogShown = checkForExistingSerialAndPrompt(processedSN, selectedDevice, selectedSubDeviceType, undefined, true);
        if (dialogShown) return;
      }
    }
  };

  const handleSerialNumberBlur = () => {
    const processedSN = processSerialNumber(serialNumber);
    setSerialNumber(processedSN);
    if (processedSN && !isOverwriteDialogOpen &&
        (!selectedDevice || !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) || selectedSubDeviceType)
      ) {
        if ((!isEffectivelyThermometer && !isEffectivelyAlcotest) || (isEffectivelyThermometer && isFastVerifyMode)) {
            checkForExistingSerialAndPrompt(processedSN, selectedDevice, selectedSubDeviceType, undefined, true);
        }
    }
  };

  const handleOverwriteConfirm = () => {
    if (entryDetailsForOverwriteDialog) {
        setOverwriteConfirmation(entryDetailsForOverwriteDialog);
        const { sn, deviceType, subDeviceType, pointId } = entryDetailsForOverwriteDialog;
        
        let toastDescription = `Данные для S/N ${sn}`;
        const effectiveDeviceTypeForConfig = (INSPECTOR_DEVICE_IDS.includes(deviceType) && subDeviceType) ? subDeviceType : deviceType;
        const config = DEVICE_CONFIGS[effectiveDeviceTypeForConfig];

        setIsOverwriteDialogOpen(false);
        setEntryDetailsForOverwriteDialog(null);

        if (pointId && config && 'points' in config) {
            const pointConfig = config.points.find(p => p.id === pointId);
            toastDescription += `, точка "${pointConfig?.label || pointId}" будет перезаписана.`;
            if (pointConfig) {
                if (effectiveDeviceTypeForConfig === 'thermometer') handleThermoPointSelect(pointConfig as ThermometerVerificationPoint, true);
                else if (effectiveDeviceTypeForConfig === 'alcotest') handleAlcoPointSelect(pointConfig as AlcotestVerificationPoint, true);
            }
        } else {
            toastDescription += ` будут перезаписаны при сохранении.`;
            if (isEffectivelyThermometer && thermoCurrentStep === 0) handleThermoNextSNStep(sn);
            else if (isEffectivelyAlcotest && alcoCurrentStep === 0) handleAlcoNextSNStep(sn);
        }
        
        toast({ title: "Перезапись подтверждена", description: toastDescription });
    }
  };

  const handleOverwriteCancel = () => {
    const prevDetails = {...entryDetailsForOverwriteDialog};
    setOverwriteConfirmation(null);
    setIsOverwriteDialogOpen(false);
    setEntryDetailsForOverwriteDialog(null);
    if ((isEffectivelyThermometer && thermoPointFinalResultData && prevDetails?.pointId && thermoCurrentStep === 5)) {
        setThermoPointFinalResultData(null);
        setThermoCurrentStep(4);
        const pointCfg = (DEVICE_CONFIGS.thermometer as ThermometerDeviceConfig).points.find(p => p.id === prevDetails.pointId);
        if (pointCfg) setSelectedThermoPointConfig(pointCfg);
        setThermoCurrentReadingInput(thermoReadings[2] || "");
    } else if (isEffectivelyAlcotest && alcoPointFinalResultData && prevDetails?.pointId && alcoCurrentStep === 5) {
        setAlcoPointFinalResultData(null);
        setAlcoCurrentStep(4);
        const pointCfg = (DEVICE_CONFIGS.alcotest as AlcotestDeviceConfig).points.find(p => p.id === prevDetails.pointId);
        if(pointCfg) setSelectedAlcoPointConfig(pointCfg);
        setCurrentAlcoReadingInput(alcoPointReadingsInput[2] || "");
    } else if (serialNumberInputRef.current) {
       serialNumberInputRef.current.focus();
    }
  };


  const handleExcelFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            if (!data) {
                toast({ title: "Ошибка чтения файла", description: "Не удалось прочитать содержимое файла.", variant: "destructive" });
                return;
            }
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const serials = jsonData
                .map(row => row[0])
                .filter(sn => sn !== null && sn !== undefined && String(sn).trim() !== "")
                .map(sn => String(sn).trim());

            if (serials.length === 0) {
                toast({ title: "Нет данных", description: "В файле не найдено серийных номеров в первом столбце.", variant: "destructive" });
                return;
            }

            const uniqueSerials = Array.from(new Set(serials));
            handleSetImportedSerials(uniqueSerials);
            toast({ title: "Успешно", description: `${uniqueSerials.length} серийных номеров импортировано.`});

        } catch (error) {
            console.error("Ошибка разбора Excel файла:", error);
            toast({ title: "Ошибка парсинга", description: "Не удалось обработать Excel файл. Убедитесь, что это корректный .xlsx или .xls файл.", variant: "destructive" });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    reader.onerror = () => {
        toast({ title: "Ошибка чтения файла", description: "Произошла ошибка при чтении файла.", variant: "destructive" });
         if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
    reader.readAsArrayBuffer(file);
  };


  if (!selectedInspector && selectedDevice) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Поверитель не выбран</CardTitle>
                <CardDescription>Пожалуйста, выберите или добавьте поверителя в разделе "Настройки".</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Требуется поверитель</AlertTitle>
                    <AlertDescription>
                        Для продолжения ввода данных необходимо указать поверителя.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }
  if (!selectedDevice) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Устройство не выбрано</CardTitle>
                <CardDescription>Пожалуйста, выберите тип устройства в разделе "Настройки".</CardDescription>
            </CardHeader>
             <CardContent>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Требуются настройки</AlertTitle>
                    <AlertDescription>
                        Выберите тип устройства и поверителя для начала работы.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }


  let cardTitle = "";
  const currentInspectorDeviceConfig = selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) ? DEVICE_CONFIGS[selectedDevice] : null;
  const currentTrimmedSN = serialNumber.trim();

  if (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && currentInspectorDeviceConfig) {
    if (!selectedSubDeviceType) {
        cardTitle = `${currentInspectorDeviceConfig.name}: Выберите тип поверки`;
    } else if (activeDeviceConfig) {
        const subTypeName = activeDeviceConfig.name;
        if (isEffectivelyThermometer) {
            if (isThermoAllPointsDone) {
                 cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Все точки завершены`;
            } else if (thermoCurrentStep === 0 ) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - S/N`;
            } else if(thermoCurrentStep === 1) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Выбор точки`;
            } else if (thermoCurrentStep >= 2 && thermoCurrentStep <= 4 && selectedThermoPointConfig) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Измерения (${selectedThermoPointConfig.label}, ${thermoCurrentStep-1}/3)`;
            } else if (thermoCurrentStep === 5 && selectedThermoPointConfig && thermoPointFinalResultData) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Результат (${selectedThermoPointConfig.label})`;
            } else {
                 cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - S/N`;
            }
        } else if(isEffectivelyAlcotest) {
            if (alcoCurrentStep === 0 ) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - S/N`;
            } else if (alcoCurrentStep === 1) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Выбор точки`;
            } else if (alcoCurrentStep >=2 && alcoCurrentStep <=4 && selectedAlcoPointConfig) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Измерения (${selectedAlcoPointConfig.label}, ${alcoCurrentStep-1}/3)`;
            } else if (alcoCurrentStep === 5 && selectedAlcoPointConfig && alcoPointFinalResultData) {
                cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Результат (${selectedAlcoPointConfig.label})`;
            } else {
                 cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - S/N`;
            }
        } else {
             cardTitle = `${currentInspectorDeviceConfig.name}: ${subTypeName} - Ввод данных`;
        }
    } else {
        cardTitle = `${currentInspectorDeviceConfig.name}: Ошибка настроек суб-устройства`;
    }
  } else if (activeDeviceConfig) {
     if (isEffectivelyThermometer) {
        if(isThermoAllPointsDone){
            cardTitle = `${activeDeviceConfig.name}: Все точки завершены`;
        } else if (thermoCurrentStep === 0) {
            cardTitle = `${activeDeviceConfig.name}: S/N`;
        } else if (thermoCurrentStep === 1 && serialNumber.trim()) {
            cardTitle = `${activeDeviceConfig.name}: Выбор точки поверки`;
        } else if (thermoCurrentStep >= 2 && thermoCurrentStep <= 4 && selectedThermoPointConfig) {
            cardTitle = `${activeDeviceConfig.name}: Измерения (${selectedThermoPointConfig.label}, ${thermoCurrentStep-1}/3)`;
        } else if (thermoCurrentStep === 5 && thermoPointFinalResultData && selectedThermoPointConfig) {
            cardTitle = `${activeDeviceConfig.name}: Результат (${selectedThermoPointConfig.label})`;
        } else {
            cardTitle = `${activeDeviceConfig.name}: S/N`;
        }
    } else if (isEffectivelyAlcotest) {
        if (alcoCurrentStep === 0 ) {
            cardTitle = `${activeDeviceConfig.name}: S/N`;
        } else if (alcoCurrentStep === 1) {
            cardTitle = `${activeDeviceConfig.name}: Выбор точки поверки`;
        } else if (alcoCurrentStep >= 2 && alcoCurrentStep <= 4 && selectedAlcoPointConfig) {
            cardTitle = `${activeDeviceConfig.name}: Измерения (${selectedAlcoPointConfig.label}, ${alcoCurrentStep-1}/3)`;
        } else if (alcoCurrentStep === 5 && alcoPointFinalResultData && selectedAlcoPointConfig) {
            cardTitle = `${activeDeviceConfig.name}: Результат (${selectedAlcoPointConfig.label})`;
        } else {
            cardTitle = `${activeDeviceConfig.name}: S/N`;
        }
    } else {
        cardTitle = `Введите данные для ${activeDeviceConfig.name}`;
    }
  } else {
    cardTitle = "Ошибка: Устройство не настроено";
  }


  let cardDescriptionNode: React.ReactNode;
  const inspectorNode = <>{`Поверитель: ${selectedInspector?.name || 'Не выбран'}`}</>;
  const snDisplayNode = currentTrimmedSN ? (
      <span className="font-bold text-primary">{currentTrimmedSN}</span>
  ) : null;

  const shouldShowSnInDescription =
      (currentTrimmedSN) &&
      (
        (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice) && !selectedSubDeviceType) ||
        (isEffectivelyThermometer && (thermoCurrentStep === 1 || (thermoCurrentStep >= 2 && thermoCurrentStep <= 5) || isThermoAllPointsDone)) ||
        (isEffectivelyAlcotest && (alcoCurrentStep === 1 || (alcoCurrentStep >= 2 && alcoCurrentStep <=5)))
      );


  if (shouldShowSnInDescription && snDisplayNode) {
      const prefix = "Для SN: ";
      const pointInfoThermo = (isEffectivelyThermometer && selectedThermoPointConfig && (thermoCurrentStep >= 2 && thermoCurrentStep <= 5))
          ? <>{`, Точка: ${selectedThermoPointConfig.label}`}</>
          : null;
      const pointInfoAlco = (isEffectivelyAlcotest && selectedAlcoPointConfig && (alcoCurrentStep >= 2 && alcoCurrentStep <=5))
          ? <>{`, Точка: ${selectedAlcoPointConfig.label}`}</>
          : null;
      cardDescriptionNode = (
          <>
              {prefix}{snDisplayNode}{pointInfoThermo}{pointInfoAlco}. {inspectorNode}
          </>
      );
  } else {
      cardDescriptionNode = inspectorNode;
  }

  const formIsLoading = isProcessingPointSave || isThermoFinishing;

  const renderSerialNumberInput = () => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <Label htmlFor="serialNumber" className="text-base font-medium">
                Серийный номер (S/N)
            </Label>
            {isEffectivelyThermometer && (thermoCurrentStep === 0 && !isThermoAllPointsDone) && (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleExcelFileImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={formIsLoading}>
                        <FileUp className="mr-2 h-4 w-4" /> Импорт S/N (Excel)
                    </Button>
                </>
            )}
        </div>
        <div className="flex items-center space-x-2">
            <Input
                ref={serialNumberInputRef}
                id="serialNumber" type="text" value={serialNumber}
                onChange={(e) => handleSerialNumberChange(e.target.value)}
                onKeyDown={handleSerialNumberKeyDown}
                onBlur={handleSerialNumberBlur}
                placeholder="Введите или отсканируйте S/N"
                className="font-code flex-grow" required disabled={formIsLoading}
            />
            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Сканировать QR-код" disabled={formIsLoading}>
                        <QrCode className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Сканировать или ввести QR-код</DialogTitle>
                        <DialogDescription>Введите значение QR-кода. Оно будет использовано как серийный номер.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="qr-input" className="sr-only">Значение QR-кода</Label>
                        <Input id="qr-input" value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Значение QR" autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScanQrCode(); }}}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Отмена</Button></DialogClose>
                        <Button type="button" onClick={handleScanQrCode}>Применить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        {serialNumberWarning && (
            <p className="text-sm text-destructive mt-1">{serialNumberWarning}</p>
        )}
        {!serialNumber.trim() && !serialNumberWarning && (
            (isEffectivelyThermometer && thermoCurrentStep === 0 && !isThermoAllPointsDone) ||
            (isEffectivelyAlcotest && alcoCurrentStep === 0) ||
            (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && !selectedSubDeviceType) ||
            (activeDeviceConfig && !isEffectivelyThermometer && !isEffectivelyAlcotest && selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && 'fields' in activeDeviceConfig)
        ) && (
            <p className="text-xs text-muted-foreground">Начните с ввода серийного номера.</p>
        )}

        {isEffectivelyThermometer && importedThermometerSerials.length > 0 && thermoCurrentStep === 0 && !isThermoAllPointsDone && (
            <div className="space-y-2 pt-2">
                <Label htmlFor="imported-serials-select" className="text-sm font-medium">Выбрать импортированный S/N</Label>
                <Select
                    onValueChange={(value) => {
                        if (value) {
                            setSerialNumber(value);
                            handleThermoNextSNStep(value);
                        }
                    }}
                    disabled={formIsLoading || availableImportedSerials.length === 0}
                    value=""
                >
                    <SelectTrigger className="w-full" id="imported-serials-select">
                        <SelectValue
                            placeholder={
                                availableImportedSerials.length > 0
                                ? `Доступно импорт.: ${availableImportedSerials.length}. Выберите...`
                                : (importedThermometerSerials.length > 0 ? "Все импорт. S/N уже имеют записи или завершены." : "Нет S/N для импорта.")
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {availableImportedSerials.length > 0 ? (
                            availableImportedSerials.map(sn => (
                                <SelectItem key={sn} value={sn}>{sn}</SelectItem>
                            ))
                        ) : (
                            <div className="p-2 text-sm text-center text-muted-foreground">
                             {importedThermometerSerials.length > 0 ? "Все импортированные S/N уже завершены." : "Нет доступных S/N."}
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>
        )}
         {isEffectivelyThermometer && importedThermometerSerials.length === 0 && thermoCurrentStep === 0 && !isThermoAllPointsDone && (
            <p className="text-xs text-muted-foreground pt-1">Для выбора из списка, импортируйте S/N из Excel файла.</p>
        )}
    </div>
  );
  const renderSubDeviceSelection = () => (
    <div className="space-y-4 pt-4">
        {INSPECTOR_DEVICE_IDS.includes(selectedDevice!) && (
            <Alert variant="default" className="border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4 !text-orange-500 dark:!text-orange-400" />
                <AlertTitle>Внимание!</AlertTitle>
                <AlertDescription>
                    Устройство '{DEVICE_CONFIGS[selectedDevice!]?.name}' может включать поверку различных приборов. Выберите тип.
                </AlertDescription>
            </Alert>
        )}
        <h4 className="text-lg font-medium text-center">Выберите тип поверки для {DEVICE_CONFIGS[selectedDevice!]?.name}:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(DEVICE_CONFIGS)
                .filter(config => config.id === 'thermometer' || config.id === 'alcotest')
                .map(subDeviceConfig => {
                    const IconComponent = subDeviceConfig.Icon;
                    return (
                        <Card
                            key={subDeviceConfig.id}
                            className={cn(
                                "cursor-pointer hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105",
                                (!serialNumber.trim() || formIsLoading || !!serialNumberWarning) && "opacity-60 cursor-not-allowed"
                            )}
                            onClick={() => {
                                const processedSN = processSerialNumber(serialNumber);
                                if (!processedSN || formIsLoading || serialNumberWarning) {
                                    toast({ title: "Сначала введите корректный S/N", description: "Серийный номер необходим для выбора типа поверки и не должен содержать ошибок.", variant: "destructive" });
                                    return;
                                }
                                setSelectedSubDeviceType(subDeviceConfig.id);
                                setOverwriteConfirmation(null);
                                resetFormSpecifics(true, true);
                                setSerialNumber(processedSN);
                                setSelectedSubDeviceType(subDeviceConfig.id);

                                if (subDeviceConfig.id === 'thermometer') {
                                    handleThermoNextSNStep(processedSN);
                                } else if (subDeviceConfig.id === 'alcotest') {
                                    handleAlcoNextSNStep(processedSN);
                                }
                            }}
                        >
                            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <IconComponent className="h-10 w-10 text-primary" />
                                </div>
                                <p className="font-semibold text-xl">{subDeviceConfig.name}</p>
                                <p className="text-xs text-muted-foreground">{subDeviceConfig.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
        </div>
        {!serialNumber.trim() && (
             <Alert variant="default" className="border-primary/50 text-primary">
                <Info className="h-4 w-4 !text-primary" />
                <AlertTitle>Введите серийный номер</AlertTitle>
                <AlertDescription>
                    Пожалуйста, введите серийный номер (S/N) выше, прежде чем выбрать тип поверки.
                </AlertDescription>
            </Alert>
        )}
    </div>
  );

  const renderGenericDeviceFields = () => {
    if (!activeDeviceConfig || !('fields' in activeDeviceConfig) || (activeDeviceConfig as StandardDeviceConfig).fields.length === 0) return null;
    return (activeDeviceConfig as StandardDeviceConfig).fields.map((field: DeviceField) => (
        <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-base font-medium">
            {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
            id={field.id} type={field.type} step={field.type === 'number' ? field.step : undefined}
            value={formValues[field.id] || ""} onChange={(e) => setFormValues(prev => ({...prev, [field.id]: e.target.value}))}
            placeholder={field.placeholder} required={field.required} disabled={field.readOnly || formIsLoading}
            className={cn(field.readOnly && "bg-muted/50 border-muted/30 cursor-not-allowed")}
            />
        </div>
    ));
  };

  const renderThermoPointSelection = () => {
    const config = (activeDeviceConfig as ThermometerDeviceConfig | null);
    if (!config || !config.points) return <p>Ошибка настроек термометра.</p>;
    
    let allConfigPoints = config.points;
    if (isFastVerifyMode) {
        allConfigPoints = allConfigPoints.filter(p => p.id === '37.0');
    }
    const isZipCodeMissing = isZipMode && !zipCode.trim();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1.5 pr-4">
            <Label htmlFor="zip-mode" className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-600"/>
              <span>Режим "ЗИП"</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Отметить этот термометр как часть ЗИП и присвоить ему код.
            </p>
          </div>
          <Switch
            id="zip-mode"
            checked={isZipMode}
            onCheckedChange={(checked) => {
              setIsZipMode(checked);
              if (!checked) setZipCode(""); // Clear zip code when disabling
            }}
            disabled={formIsLoading}
          />
        </div>
        {isZipMode && (
          <div className="space-y-2 animation-fadeInUp">
            <Label htmlFor="zipCode">Код ЗИП</Label>
            <Input 
              id="zipCode" 
              value={zipCode} 
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Введите номер или код для группы"
              disabled={formIsLoading}
            />
             {isZipCodeMissing && (
                <p className="text-xs text-destructive">Требуется код ЗИП для продолжения.</p>
             )}
          </div>
        )}
        <h4 className="text-lg font-medium text-center pt-2">
            {isFastVerifyMode ? "Поверка точки 37.0°C" : "Выберите точку поверки:"}
        </h4>
        {isFastVerifyMode && <p className="text-center text-sm text-muted-foreground">Режим ускоренной поверки активен. Остальные точки будут сгенерированы автоматически.</p>}
        <div className={cn("grid grid-cols-1 gap-3", !isFastVerifyMode && "md:grid-cols-2 lg:grid-cols-3")}>
          {allConfigPoints.map(point => {
            const isSelected = selectedThermoPointConfig?.id === point.id;
            const verifiedPointSessionData = verifiedThermoPointsData.find(vp => vp.pointId === point.id);
            const verifiedPointInSavedEntries = dataEntries
              .find(e => e.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase() && e.deviceType === selectedDevice && (e.measuredValues.subDeviceType ? e.measuredValues.subDeviceType === selectedSubDeviceType : true))
              ?.measuredValues.verifiedThermoPoints?.find((p: VerifiedThermoPointData) => p.pointId === point.id);

            const pointStatus = verifiedPointSessionData || verifiedPointInSavedEntries;

            return (
                <Card
                    key={point.id}
                    className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        isSelected && !pointStatus && "ring-2 ring-primary shadow-lg",
                        pointStatus && pointStatus.verdict === 'Годен' && cn("bg-green-50 border-green-200 hover:shadow-green-100", isSelected && "ring-2 ring-green-400 shadow-lg"),
                        pointStatus && pointStatus.verdict === 'Брак' && cn("bg-red-50 border-red-200 hover:shadow-red-100", isSelected && "ring-2 ring-red-400 shadow-lg"),
                        pointStatus && pointStatus.verdict === 'Ошибка данных' && cn("bg-yellow-50 border-yellow-200 hover:shadow-yellow-100", isSelected && "ring-2 ring-yellow-400 shadow-lg"),
                        (formIsLoading || isOverwriteDialogOpen || isZipCodeMissing) && "opacity-60 cursor-not-allowed"
                    )}
                    onClick={() => { if (!formIsLoading && !isOverwriteDialogOpen && !isZipCodeMissing) handleThermoPointSelect(point);}}
                >
                <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center">
                        <Target className={cn("h-5 w-5 mr-2",
                            pointStatus && pointStatus.verdict === 'Годен' && "text-green-600",
                            pointStatus && pointStatus.verdict === 'Брак' && "text-red-600",
                            pointStatus && pointStatus.verdict === 'Ошибка данных' && "text-yellow-600",
                            !pointStatus && "text-primary"
                        )} />
                        <span className={cn("font-medium text-sm",
                             pointStatus && pointStatus.verdict === 'Годен' && "text-green-700",
                             pointStatus && pointStatus.verdict === 'Брак' && "text-red-700",
                             pointStatus && pointStatus.verdict === 'Ошибка данных' && "text-yellow-700"
                        )}>{point.label}</span>
                    </div>
                     {pointStatus ? (
                        pointStatus.verdict === 'Годен' ? <Check className="h-5 w-5 text-green-500" /> :
                        pointStatus.verdict === 'Брак' ? <XCircle className="h-5 w-5 text-red-500" /> :
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                </CardContent>
                </Card>
            );
          })}
        </div>
         {verifiedThermoPointsData.length > 0 && !isThermoAllPointsDone && !isFastVerifyMode && (
            <div className="pt-4 space-y-2">
                <Separator/>
                <h4 className="text-md font-medium">Поверенные точки в текущей сессии ({verifiedThermoPointsData.length} из {config.points.length}):</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {verifiedThermoPointsData.map(vp => <li key={vp.pointId}>{(DEVICE_CONFIGS.thermometer as ThermometerDeviceConfig).points.find(p=>p.id === vp.pointId)?.label}: <span className={cn(vp.verdict === "Годен" ? "text-green-600" : "text-red-600")}>{vp.verdict}</span></li>)}
                </ul>
            </div>
        )}
      </div>
    );
  };

  const renderAlcoPointSelection = () => {
    const config = (activeDeviceConfig as AlcotestDeviceConfig | null);
    if (!config || !config.points) return <p>Ошибка настроек алкотестера.</p>;

    const allConfigPoints = config.points;

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-center">Выберите точку поверки:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allConfigPoints.map(point => {
            const verifiedPointInSavedEntries = dataEntries
              .find(e => e.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase() && e.deviceType === selectedDevice && (e.measuredValues.subDeviceType ? e.measuredValues.subDeviceType === selectedSubDeviceType : true))
              ?.measuredValues.verifiedAlcoPoints?.find((p: VerifiedAlcoPointData) => p.pointValue === point.id);

            const pointStatus = verifiedPointInSavedEntries;
            const isSelected = selectedAlcoPointConfig?.id === point.id;
            
            return (
                <Card
                    key={point.id}
                    className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        isSelected && !pointStatus && "ring-2 ring-primary shadow-lg",
                        pointStatus && pointStatus.verdict === 'Годен' && cn("bg-green-50 border-green-200 hover:shadow-green-100", isSelected && "ring-2 ring-green-400 shadow-lg"),
                        pointStatus && pointStatus.verdict === 'Брак' && cn("bg-red-50 border-red-200 hover:shadow-red-100", isSelected && "ring-2 ring-red-400 shadow-lg"),
                        pointStatus && pointStatus.verdict === 'Ошибка данных' && cn("bg-yellow-50 border-yellow-200 hover:shadow-yellow-100", isSelected && "ring-2 ring-yellow-400 shadow-lg"),
                        (formIsLoading || isOverwriteDialogOpen) && "opacity-60 cursor-not-allowed"
                    )}
                    onClick={() => { if (!formIsLoading && !isOverwriteDialogOpen) handleAlcoPointSelect(point);}}
                >
                <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center">
                    <Target className={cn("h-5 w-5 mr-2",
                         pointStatus && pointStatus.verdict === 'Годен' && "text-green-600",
                         pointStatus && pointStatus.verdict === 'Брак' && "text-red-600",
                         pointStatus && pointStatus.verdict === 'Ошибка данных' && "text-yellow-600",
                         !pointStatus && "text-primary"
                    )} />
                    <span className={cn("font-medium text-sm",
                         pointStatus && pointStatus.verdict === 'Годен' && "text-green-700",
                         pointStatus && pointStatus.verdict === 'Брак' && "text-red-700",
                         pointStatus && pointStatus.verdict === 'Ошибка данных' && "text-yellow-700"
                    )}>{point.label}</span>
                    </div>
                    {pointStatus ? (
                        pointStatus.verdict === 'Годен' ? <Check className="h-5 w-5 text-green-500" /> :
                        pointStatus.verdict === 'Брак' ? <XCircle className="h-5 w-5 text-red-500" /> :
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                </CardContent>
                </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAlcoReadingInput = () => (
    <div className="space-y-4">
      <div className="space-y-1">
          <Label htmlFor="currentAlcoReading" className="text-base font-medium">Значение измерения ({alcoCurrentStep-1}/3)</Label>
          <Progress value={((alcoCurrentStep-1) / 3) * 100} className="w-full h-2" />
          <p className="text-sm text-muted-foreground pt-1">
              Точка: {selectedAlcoPointConfig?.label}. Эталон: {selectedAlcoPointConfig?.referenceMgL} мг/л. Пределы: {selectedAlcoPointConfig?.lowerLimit} ... {selectedAlcoPointConfig?.upperLimit} мг/л.
          </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {alcoPointReadingsInput.slice(0, alcoCurrentStep - 2).map((reading, index) => (
            <div key={index} className="bg-muted px-2 py-1 rounded-md">
                Изм. {index + 1}: <span className="font-medium font-code">{reading || "..."}</span>
            </div>
        ))}
      </div>
      <Input
          ref={readingInputRef} id="currentAlcoReading" type="text" inputMode="decimal"
          value={currentAlcoReadingInput} onChange={(e) => handleReadingInputChange(e.target.value, false)}
          onKeyDown={handleReadingKeyDown} placeholder="Напр. 0.150 или 1.234" className="font-code" required disabled={formIsLoading}
      />
    </div>
  );

  const renderResultDisplay = (data: ResultDisplayData | null, onBack: () => void, isSavingIndicator?: boolean) => {
    if (!data) return null;

    const isAlcoContext = isEffectivelyAlcotest && alcoCurrentStep === 5;
    const isThermoAutoSaveContext = isEffectivelyThermometer && thermoCurrentStep === 5 && !isThermoAllPointsDone && !isThermoFinishing;


    return (
      <div className="flex flex-col items-center text-center space-y-4 py-8">
        <data.icon className={cn("h-20 w-20", data.variant === 'success' && "text-green-500", data.variant === 'error' && "text-red-500", data.variant === 'warning' && "text-yellow-500")} />
        <h3 className={cn("text-2xl font-semibold", data.variant === 'success' && "text-green-700", data.variant === 'error' && "text-red-700", data.variant === 'warning' && "text-yellow-700")}>{data.title}</h3>
        <p className="text-muted-foreground">{data.description}</p>
        {(isSavingIndicator || formIsLoading) && (
          <div className="flex items-center text-primary pt-2"><Loader2 className="h-5 w-5 mr-2 animate-spin" /><p className="font-medium">Идет сохранение данных...</p></div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs pt-2">
            {
              (data.variant === 'warning') &&
             (
                 <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={formIsLoading || isSavingIndicator}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Назад
                </Button>
            )}
        </div>
         {(isEffectivelyThermometer && isThermoAllPointsDone && !isFastVerifyMode) && (
            <Button type="button" onClick={handleThermoFinishAndSaveAll} className="w-full max-w-xs mt-2" variant="default" disabled={isThermoFinishing || formIsLoading || verifiedThermoPointsData.length === 0 }>
                {isThermoFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Сохранить всё (Термометр)
            </Button>
        )}
      </div>
    );
  };

  const getPointLabelForDialog = () => {
    if (!entryDetailsForOverwriteDialog?.pointId) return '';
    const { deviceType, subDeviceType, pointId } = entryDetailsForOverwriteDialog;
    const effectiveDeviceTypeForConfig = subDeviceType || deviceType;
    const config = DEVICE_CONFIGS[effectiveDeviceTypeForConfig];
    if (config && 'points' in config) {
        const point = (config.points as any[]).find(p => p.id === pointId);
        return point?.label || pointId;
    }
    return pointId;
  }

  return (
    <>
      <AlertDialog open={isOverwriteDialogOpen} onOpenChange={setIsOverwriteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Запись существует</AlertDialogTitle>
            <AlertDialogDescription>
                {`Запись для S/N "${entryDetailsForOverwriteDialog?.sn}" (${DEVICE_CONFIGS[entryDetailsForOverwriteDialog?.deviceType as DeviceId]?.name}${entryDetailsForOverwriteDialog?.subDeviceType ? ` / ${DEVICE_CONFIGS[entryDetailsForOverwriteDialog?.subDeviceType as DeviceId]?.name}` : ''}) ${entryDetailsForOverwriteDialog?.pointId ? ` и точки "${getPointLabelForDialog()}"` : ''} уже существует. Хотите перезаписать существующие данные?`}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm}>Перезаписать</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>{cardTitle}</CardTitle>
            <CardDescription>{cardDescriptionNode}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
              if(!isEffectivelyThermometer && !isEffectivelyAlcotest) {
                 handleSubmitForm(e);
              } else if (isEffectivelyThermometer && isThermoAllPointsDone && !isThermoFinishing && !isFastVerifyMode) {
                 e.preventDefault();
                 handleThermoFinishAndSaveAll();
              }
              else e.preventDefault();
          }} className="space-y-6">
            {
              (
                (selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && !selectedSubDeviceType) ||
                (isEffectivelyThermometer && thermoCurrentStep === 0 && !isThermoAllPointsDone) ||
                (isEffectivelyAlcotest && alcoCurrentStep === 0) ||
                (activeDeviceConfig && !isEffectivelyThermometer && !isEffectivelyAlcotest && selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && 'fields' in activeDeviceConfig)
              ) &&
              !thermoPointFinalResultData &&
              !alcoPointFinalResultData &&
              renderSerialNumberInput()
            }

            {selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && !selectedSubDeviceType && serialNumber.trim() && renderSubDeviceSelection()}


            {isEffectivelyThermometer && !isThermoAllPointsDone && thermoCurrentStep === 1 && serialNumber.trim() && !thermoPointFinalResultData && renderThermoPointSelection()}
            {isEffectivelyThermometer && !isThermoAllPointsDone && thermoCurrentStep >= 2 && thermoCurrentStep <= 4 && selectedThermoPointConfig && !thermoPointFinalResultData && (
                 <div className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="thermoReading" className="text-base font-medium">Значение измерения ({thermoCurrentStep-1}/3)</Label>
                        <Progress value={((thermoCurrentStep-1) / 3) * 100} className="w-full h-2" />
                        <p className="text-sm text-muted-foreground pt-1">
                            Точка: {selectedThermoPointConfig.label}. Эталон: {selectedThermoPointConfig.referenceTemp.toFixed(1)}°C. Поправка: {selectedThermoPointConfig.tempCorrection.toFixed(1)}°C.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {thermoReadings.slice(0, thermoCurrentStep - 2).map((reading, index) => (
                        <div key={index} className="bg-muted px-2 py-1 rounded-md">
                          Изм. {index + 1}: <span className="font-medium font-code">{reading || '...'}</span>
                        </div>
                      ))}
                    </div>
                    <Input
                        ref={readingInputRef} id="thermoReading" type="text" inputMode="decimal"
                        value={thermoCurrentReadingInput} onChange={(e) => handleReadingInputChange(e.target.value, true)}
                        onKeyDown={handleReadingKeyDown} placeholder="Напр. 37.0 или -5.1" className="font-code" required disabled={formIsLoading}
                    />
                    <p className="text-xs text-muted-foreground">Введите показание термометра. Автоматическая точка после двух цифр (например, "37" станет "37.").</p>
                </div>
            )}
            {isEffectivelyThermometer && !isThermoAllPointsDone && thermoCurrentStep === 5 && selectedThermoPointConfig &&
                renderResultDisplay(
                    thermoPointFinalResultData,
                    handleThermoPrevStep,
                    isProcessingPointSave
                )
            }
            {isEffectivelyThermometer && isThermoAllPointsDone &&
                renderResultDisplay(
                    {
                        icon: Check,
                        title: "Все точки термометра завершены!",
                        description: `Для S/N ${serialNumber} все точки были поверены. Нажмите "Сохранить всё" для записи сессии.`,
                        variant: 'success'
                    },
                    handleThermoPrevStep,
                    isThermoFinishing
                )
            }


            {isEffectivelyAlcotest && alcoCurrentStep === 1 && serialNumber.trim() && !alcoPointFinalResultData && renderAlcoPointSelection()}
            {isEffectivelyAlcotest && alcoCurrentStep >= 2 && alcoCurrentStep <= 4 && selectedAlcoPointConfig && !alcoPointFinalResultData && renderAlcoReadingInput()}
            {isEffectivelyAlcotest && alcoCurrentStep === 5 && selectedAlcoPointConfig &&
              renderResultDisplay(
                alcoPointFinalResultData,
                handleAlcoPrevStep,
                isProcessingPointSave
              )
            }

            {activeDeviceConfig && !isEffectivelyThermometer && !isEffectivelyAlcotest &&
             (selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) || (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && selectedSubDeviceType && !isEffectivelyAlcotest && !isEffectivelyThermometer )) &&
             'fields' in activeDeviceConfig && (activeDeviceConfig as StandardDeviceConfig).fields.length > 0 &&
             renderGenericDeviceFields()
            }

            { (selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) || (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && selectedSubDeviceType)) &&
              !thermoPointFinalResultData &&
              !alcoPointFinalResultData &&
              !isThermoAllPointsDone &&
              (
              <>
                <div><Label className="text-base font-medium">Поверитель</Label><Input value={selectedInspector?.name || "Поверитель не выбран"} readOnly disabled className="mt-2 bg-muted/50" /></div>

                <div className="flex flex-col space-y-2 pt-2">
                  {isEffectivelyThermometer && thermoCurrentStep === 0 && !isThermoAllPointsDone && (
                    <Button type="button" onClick={() => handleThermoNextSNStep(serialNumber)} className="w-full" disabled={formIsLoading || !serialNumber.trim() || isOverwriteDialogOpen || !!serialNumberWarning}>Далее <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  )}
                  {isEffectivelyThermometer && thermoCurrentStep === 1 && !isThermoAllPointsDone && ( // On point selection
                    <Button type="button" variant="outline" onClick={handleThermoPrevStep} className="w-full" disabled={formIsLoading || isOverwriteDialogOpen}><ArrowLeft className="mr-2 h-4 w-4" /> Назад к S/N</Button>
                  )}
                  {isEffectivelyThermometer && thermoCurrentStep >= 2 && thermoCurrentStep <= 4 && selectedThermoPointConfig && !isThermoAllPointsDone &&(
                    <div className="flex flex-col space-y-2">
                      <Button type="button" onClick={handleThermoAddReading} className="w-full" disabled={formIsLoading || !(thermoCurrentReadingInput.trim() !== "" && !isNaN(parseFloat(thermoCurrentReadingInput)))}>
                        {thermoCurrentStep < 4 ? `Добавить изм. (${thermoCurrentStep-1}/3)` : `Расчет точки (${thermoCurrentStep-1}/3)`} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={handleThermoPrevStep} className="w-full" disabled={formIsLoading}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
                    </div>
                  )}


                  {isEffectivelyAlcotest && alcoCurrentStep === 0 && (
                     <Button type="button" onClick={() => handleAlcoNextSNStep(serialNumber)} className="w-full" disabled={formIsLoading || !serialNumber.trim() || isOverwriteDialogOpen || !!serialNumberWarning}>Далее <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  )}
                  {isEffectivelyAlcotest && alcoCurrentStep === 1 && ( // Back to S/N from point selection
                     <Button type="button" variant="outline" onClick={handleAlcoPrevStep} className="w-full" disabled={formIsLoading || isOverwriteDialogOpen}><ArrowLeft className="mr-2 h-4 w-4" /> Назад к S/N</Button>
                  )}
                  {isEffectivelyAlcotest && alcoCurrentStep >= 2 && alcoCurrentStep <= 4 && selectedAlcoPointConfig &&(
                     <div className="flex flex-col space-y-2">
                      <Button type="button" onClick={handleAlcoAddReading} className="w-full" disabled={formIsLoading || !(currentAlcoReadingInput.trim() !== "" && !isNaN(parseFloat(currentAlcoReadingInput)))}>
                        {alcoCurrentStep < 4 ? `Добавить изм. (${alcoCurrentStep-1}/3)` : `Расчет точки (${alcoCurrentStep-1}/3)`} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={handleAlcoPrevStep} className="w-full" disabled={formIsLoading}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
                    </div>
                  )}

                  {activeDeviceConfig && !isEffectivelyThermometer && !isEffectivelyAlcotest &&
                   (selectedDevice && !INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) || (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && selectedSubDeviceType && !isEffectivelyAlcotest && !isEffectivelyThermometer )) &&
                   'fields' in activeDeviceConfig && (activeDeviceConfig as StandardDeviceConfig).fields.length > 0 && (
                    <Button type="submit" className="w-full" disabled={formIsLoading || !serialNumber.trim() || Object.values(formValues).some(v => typeof v === 'string' && v.trim() === "") || isOverwriteDialogOpen || !!serialNumberWarning}>
                      {formIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {overwriteConfirmation?.sn.toLowerCase() === serialNumber.trim().toLowerCase() &&
                       overwriteConfirmation.deviceType === selectedDevice &&
                       (INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) ? overwriteConfirmation.subDeviceType === selectedSubDeviceType : true) &&
                       !overwriteConfirmation.pointId
                       ? "Перезаписать" : "Сохранить"}
                    </Button>
                  )}

                  {selectedDevice && INSPECTOR_DEVICE_IDS.includes(selectedDevice as DeviceId) && selectedSubDeviceType &&
                   (
                    (isEffectivelyThermometer && thermoCurrentStep <= 1 && !isThermoAllPointsDone) ||
                    (isEffectivelyAlcotest && alcoCurrentStep <= 1)
                   ) &&
                   (!thermoPointFinalResultData && !alcoPointFinalResultData ) &&
                    <Button type="button" variant="outline" onClick={() => {
                        const currentSN = serialNumber;
                        resetFormSpecifics(true, true);
                        setSerialNumber(currentSN);
                        setSelectedSubDeviceType(null);
                    }} className="w-full" disabled={formIsLoading || isOverwriteDialogOpen}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Назад к выбору поверки
                    </Button>
                  }
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
