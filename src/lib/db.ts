
'use server';

import prisma from './prisma';
import type { DataEntry, Inspector, InspectorRole, ProtocolTemplate } from '@/types';
import type { Prisma } from '@prisma/client';

// --- Helper functions for role mapping ---
const toPrismaRole = (role: InspectorRole): Prisma.InspectorRole => {
    switch (role) {
        case 'Разработчик': return 'Developer';
        case 'Администратор': return 'Administrator';
        case 'Поверитель +': return 'Verifier_Plus';
        case 'Поверитель': return 'Verifier';
        case 'Тест': return 'Test';
        default: throw new Error(`Unknown role: ${role}`);
    }
};

const fromPrismaRole = (role: Prisma.InspectorRole): InspectorRole => {
    switch (role) {
        case 'Developer': return 'Разработчик';
        case 'Administrator': return 'Администратор';
        case 'Verifier_Plus': return 'Поверитель +';
        case 'Verifier': return 'Поверитель';
        case 'Test': return 'Тест';
        default: throw new Error(`Unknown prisma role: ${role}`);
    }
};

const mapInspectorToApp = (inspector: any): Inspector | null => {
    if (!inspector) return null;
    return { ...inspector, role: fromPrismaRole(inspector.role) };
};

// --- Inspector Data Access ---
export const getInspectors = async (): Promise<Inspector[]> => {
    const inspectors = await prisma.inspector.findMany({
        orderBy: { name: 'asc' }
    });
    return inspectors.map(i => mapInspectorToApp(i) as Inspector);
};

// Used for seeding initial users
export const saveInspectors = async (inspectors: Inspector[]): Promise<void> => {
    const upsertPromises = inspectors.map(i => prisma.inspector.upsert({
        where: { login: i.login },
        update: {
            name: i.name,
            password: i.password,
            role: toPrismaRole(i.role),
            email: i.email,
        },
        create: {
            id: i.id,
            name: i.name,
            login: i.login,
            password: i.password as string,
            role: toPrismaRole(i.role),
            email: i.email,
        }
    }));
    await prisma.$transaction(upsertPromises);
};

export const addInspector = async (inspector: Omit<Inspector, 'id'>): Promise<Inspector> => {
    const newInspector = await prisma.inspector.create({
        data: {
            ...inspector,
            password: inspector.password as string,
            role: toPrismaRole(inspector.role),
        }
    });
    return mapInspectorToApp(newInspector) as Inspector;
};

export const updateInspector = async (id: string, data: Partial<Omit<Inspector, 'id' | 'login'>>): Promise<Inspector> => {
    const updateData: any = { ...data };
    if (data.role) {
        updateData.role = toPrismaRole(data.role);
    }
    const updatedInspector = await prisma.inspector.update({
        where: { id },
        data: updateData,
    });
    return mapInspectorToApp(updatedInspector) as Inspector;
};

export const deleteInspector = async (id: string): Promise<void> => {
    await prisma.inspector.delete({ where: { id } });
};

export const getInspectorById = async (id: string): Promise<Inspector | null> => {
  const inspector = await prisma.inspector.findUnique({ where: { id } });
  return inspector ? mapInspectorToApp(inspector) : null;
};

// --- Data Entry Data Access ---

export const getEntries = async (): Promise<DataEntry[]> => {
    const entries = await prisma.dataEntry.findMany({
        orderBy: { timestamp: 'desc' },
        include: { inspector: true } // Include inspector details
    });
    return entries.map(entry => ({
        ...entry,
        measuredValues: entry.measuredValues as Record<string, any>,
        timestamp: entry.timestamp.toISOString(),
        inspectorName: entry.inspector.name // Add inspectorName for display
    }));
};

export const upsertDataEntry = async (entry: DataEntry, inspectorId: string): Promise<DataEntry> => {
    const data: Prisma.DataEntryUncheckedCreateInput = {
        id: entry.id,
        serialNumber: entry.serialNumber,
        deviceType: entry.deviceType,
        deviceName: entry.deviceName,
        measuredValues: entry.measuredValues as Prisma.JsonObject,
        inspectorId: inspectorId,
        timestamp: new Date(entry.timestamp),
    };
    
    const savedEntry = await prisma.dataEntry.upsert({
        where: { id: entry.id },
        update: data,
        create: data,
        include: { inspector: true }
    });

    return {
        ...savedEntry,
        measuredValues: savedEntry.measuredValues as Record<string, any>,
        timestamp: savedEntry.timestamp.toISOString(),
        inspectorName: savedEntry.inspector.name
    };
};

export const deleteDataEntry = async (id: string): Promise<void> => {
    await prisma.dataEntry.delete({ where: { id } });
};

export const clearAllEntries = async (): Promise<void> => {
    await prisma.dataEntry.deleteMany({});
};

// --- Protocol Templates Data Access ---

export const getProtocolTemplates = async (): Promise<ProtocolTemplate[]> => {
    const templates = await prisma.protocolTemplate.findMany();
    return templates.map(t => ({
        ...t,
        fileContent: t.fileContent.toString('base64'),
    }));
};

export const addProtocolTemplate = async (template: Omit<ProtocolTemplate, 'id'>): Promise<ProtocolTemplate> => {
    const newTemplate = await prisma.protocolTemplate.create({
        data: {
            name: template.name,
            fileContent: Buffer.from(template.fileContent, 'base64'),
        }
    });
    return {
        ...newTemplate,
        fileContent: newTemplate.fileContent.toString('base64'),
    };
};

export const deleteProtocolTemplate = async (id: string): Promise<void> => {
    await prisma.protocolTemplate.delete({ where: { id } });
};
