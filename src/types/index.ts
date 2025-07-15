import type { LucideIcon } from 'lucide-react';

export type DeviceId = 'thermometer' | 'alcotest' | 'inspector' | 'tonometer';
export type InspectorRole = 'Разработчик' | 'Администратор' | 'Поверитель +' | 'Поверитель' | 'Тест';

export interface ProtocolTemplate {
  id: string;
  name: string;
  fileContent: string; // base64
}

export interface DeviceField {
  id: string;
  label: string;
  type: 'number' | 'text';
  step?: string;
  placeholder?: string;
  required?: boolean;
  prefilledValue?: string;
  readOnly?: boolean;
}

export interface AlcotestVerificationPoint {
  id: string; // например, "0.000", "0.150"
  label: string; // Пользовательская метка, например, "Точка 0.000 мг/л"
  referenceMgL: number;
  referenceMgCm3: number;
  lowerLimit: number;
  upperLimit: number;
}

export interface ThermometerVerificationPoint {
  id: string; // например, "32.3"
  label: string; // например, "Точка 32.3 °C"
  referenceTemp: number;
  tempCorrection: number;
  lowerLimit: number;
  upperLimit: number;
}

export interface VerifiedThermoPointData {
  pointId: string; // ID точки из ThermometerVerificationPoint
  pointLabel: string;
  referenceTemp: number;
  tempCorrection: number;
  readingsRaw: [number, number, number];
  readingsCorrected: [number, number, number];
  averageCorrectedTemp: number;
  lowerLimitPoint: number;
  upperLimitPoint: number;
  verdict: 'Годен' | 'Брак' | 'Ошибка данных';
  timestamp?: string; // Временная метка для конкретной точки, если нужно
}


export interface AlcotestDeviceConfig {
  id: 'alcotest';
  name: string;
  points: AlcotestVerificationPoint[];
  description: string;
  Icon: LucideIcon;
  fields: []; // Алкотестер использует систему точек, а не общие поля
  inDevelopment?: boolean;
}

export interface ThermometerDeviceConfig {
  id: 'thermometer';
  name: string;
  points: ThermometerVerificationPoint[]; // Точки для выбора
  description: string;
  Icon: LucideIcon;
  fields: []; // Термометр использует систему точек, а не общие поля
  inDevelopment?: boolean;
}

export interface StandardDeviceConfig {
  id: Exclude<DeviceId, 'alcotest' | 'thermometer'>;
  name: string;
  fields: DeviceField[];
  description: string;
  Icon: LucideIcon;
  inDevelopment?: boolean;
}

export type DeviceConfig = AlcotestDeviceConfig | ThermometerDeviceConfig | StandardDeviceConfig;

export interface Inspector {
  id: string;
  name: string;
  login: string;
  password?: string;
  role: InspectorRole;
  email?: string;
}

export interface VerifiedAlcoPointData {
  pointValue: string; // ID точки из AlcotestVerificationPoint
  referenceMgL: number;
  referenceMgCm3: number;
  readings: number[]; // Массив из 3-х показаний
  averageReading: number;
  lowerLimit: number;
  upperLimit: number;
  verdict: 'Годен' | 'Брак' | 'Ошибка данных';
}

export interface DataEntry {
  id: string;
  serialNumber: string;
  deviceType: DeviceId;
  deviceName: string; // Может включать имя основного устройства и подтипа, если применимо
  measuredValues: Record<string, any> & {
    subDeviceType?: DeviceId; // Для 'inspector' указывает, какой реальный прибор поверялся
    zipCode?: string; // Для группировки приборов ЗИП
    arshinVerified?: boolean; // Для подтверждения в Аршин
    
    // Для Алкотестера (многоточечный)
    verifiedAlcoPoints?: VerifiedAlcoPointData[]; // Массив всех поверенных точек для данной сессии алкотестера

    // Для Термометра (многоточечная сессия, хранится одна запись на S/N)
    verifiedThermoPoints?: VerifiedThermoPointData[]; // Массив всех поверенных точек для данной сессии термометра
  };
  inspectorName: string; // For display purposes
  inspectorId: string; // Foreign key for the database relation
  timestamp: string; // Общая временная метка для записи (или для завершения сессии многоточечного прибора)
}
