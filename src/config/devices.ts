
import type { DeviceConfig, DeviceId, AlcotestVerificationPoint, StandardDeviceConfig, AlcotestDeviceConfig, ThermometerDeviceConfig, ThermometerVerificationPoint } from '@/types';
import { Thermometer, Smartphone, PcCase, HeartPulse } from 'lucide-react';

const ALCOTEST_VERIFICATION_POINTS: AlcotestVerificationPoint[] = [
  { id: "0.000_1", label: "Точка 0.000 мг/л", referenceMgL: 0.000, referenceMgCm3: 0.000, lowerLimit: 0.000, upperLimit: 0.050 }, // например, "0.000", "0.150"
  { id: "0.150",   label: "Точка 0.150 мг/л", referenceMgL: 0.150, referenceMgCm3: 0.386, lowerLimit: 0.100, upperLimit: 0.200 }, // Пользовательская метка, например, "Точка 0.000 мг/л"
  { id: "0.475",   label: "Точка 0.475 мг/л", referenceMgL: 0.475, referenceMgCm3: 1.220, lowerLimit: 0.425, upperLimit: 0.525 },
  { id: "0.850",   label: "Точка 0.850 мг/л", referenceMgL: 0.850, referenceMgCm3: 2.190, lowerLimit: 0.765, upperLimit: 0.935 },
  { id: "1.500",   label: "Точка 1.500 мг/л", referenceMgL: 1.500, referenceMgCm3: 3.860, lowerLimit: 1.350, upperLimit: 1.650 },
  { id: "0.000_2", label: "Точка 0.000 мг/л (повтор)", referenceMgL: 0.000, referenceMgCm3: 0.000, lowerLimit: 0.000, upperLimit: 0.050 },
];

const THERMOMETER_VERIFICATION_POINTS: ThermometerVerificationPoint[] = [
  { id: "32.3", label: "Точка 32.3 °C", referenceTemp: 32.3, tempCorrection: -4.0, lowerLimit: 32.0, upperLimit: 32.6 },
  { id: "34.8", label: "Точка 34.8 °C", referenceTemp: 34.8, tempCorrection: -2.2, lowerLimit: 34.5, upperLimit: 35.1 },
  { id: "37.0", label: "Точка 37.0 °C", referenceTemp: 37.0, tempCorrection: -3.7, lowerLimit: 36.7, upperLimit: 37.3 },
];

export const INSPECTOR_DEVICE_IDS: DeviceId[] = ['inspector'];

export const DEVICE_CONFIGS: Record<DeviceId, DeviceConfig> = {
  thermometer: {
    id: 'thermometer',
    name: 'Термометры',
    points: THERMOMETER_VERIFICATION_POINTS,
    fields: [], // Поля для совместимости, выбор точки определяет параметры
    description: "Поверка термометров по нескольким точкам (32.3°C, 34.8°C, 37.0°C).",
    Icon: Thermometer,
  } as ThermometerDeviceConfig,
  alcotest: {
    id: 'alcotest',
    name: 'Алкотестер E-200',
    points: ALCOTEST_VERIFICATION_POINTS,
    fields: [], // Поля для совместимости, но не будут использоваться напрямую для ввода данных алкотестера
    description: "Многоточечная поверка алкотестеров.",
    Icon: Smartphone,
  } as AlcotestDeviceConfig,
  tonometer: {
    id: 'tonometer',
    name: 'Тонометр',
    fields: [],
    description: "Поверка тонометров.",
    Icon: HeartPulse,
    inDevelopment: true,
  } as StandardDeviceConfig,
  inspector: {
    id: 'inspector',
    name: 'Инспектор',
    fields: [], // Поля будут определяться выбором подустройства в форме
    description: "Терминал для комплексной поверки.",
    Icon: PcCase,
    inDevelopment: true,
  } as StandardDeviceConfig,
};

export const DEVICE_OPTIONS = Object.values(DEVICE_CONFIGS).map(device => ({
  value: device.id,
  label: device.name,
}));
