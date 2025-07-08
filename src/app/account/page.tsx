
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Inspector, InspectorRole } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, UserCircle, Save, KeyRound, Loader2, Sparkles, Eye, EyeOff, Edit3, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/AppLogo';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getInspectors, addInspector, updateInspector, deleteInspector } from '@/lib/db';
import { getFastVerifyMode, saveFastVerifyMode } from '@/lib/localStorage';
import { cn } from '@/lib/utils';

const ROLES: InspectorRole[] = ['Разработчик', 'Администратор', 'Поверитель +', 'Поверитель', 'Тест'];

const FUNNY_LOADING_TEXTS = [
  "Калибруем калибратор...",
  "Подключаемся к космосу для точности...",
  "Проверяем, не убежали ли электроны...",
  "Завариваем кофе для поверителя...",
  "Ищем линейку, чтобы измерить терпение...",
  "Настраиваем потоки данных...",
  "Загружаем вашу фамилию...",
  "Сверяем часы с ГЛОНАСС...",
  "Протираем линзы у микроскопа...",
];

export default function AccountPage() {
  const { currentUser, isLoading: authLoading, setCurrentUser } = useAuth();
  const [loadingMessage, setLoadingMessage] = useState('');

  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newInspectorLogin, setNewInspectorLogin] = useState('');
  const [newInspectorPassword, setNewInspectorPassword] = useState('');
  const [newInspectorRole, setNewInspectorRole] = useState<InspectorRole>('Поверитель');
  const [newInspectorEmail, setNewInspectorEmail] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | null>(null);
  const [editInspectorName, setEditInspectorName] = useState('');
  const [editInspectorLogin, setEditInspectorLogin] = useState('');
  const [editInspectorPassword, setEditInspectorPassword] = useState('');
  const [editInspectorRole, setEditInspectorRole] = useState<InspectorRole>('Поверитель');
  const [editInspectorEmail, setEditInspectorEmail] = useState('');
  const [editInspectorNameWarning, setEditInspectorNameWarning] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');

  const [profileNameWarning, setProfileNameWarning] = useState(false);
  const [newInspectorNameWarning, setNewInspectorNameWarning] = useState(false);

  const [isFastVerificationMode, setIsFastVerificationMode] = useState(false);
  const [isSpecialSettingsVisible, setIsSpecialSettingsVisible] = useState(false);
  
  const { toast } = useToast();

  const isPrivilegedUser = currentUser?.role === 'Администратор' || currentUser?.role === 'Разработчик';
  const canAccessSpecialSettings = isPrivilegedUser || currentUser?.role === 'Поверитель +';

  const fetchInspectors = useCallback(async () => {
    try {
      setIsDataLoading(true);
      const data = await getInspectors();
      setInspectors(data);
    } catch (error) {
      toast({ title: "Ошибка загрузки пользователей", description: "Не удалось получить список пользователей.", variant: "destructive" });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast]);

   useEffect(() => {
    setLoadingMessage(FUNNY_LOADING_TEXTS[Math.floor(Math.random() * FUNNY_LOADING_TEXTS.length)]);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    fetchInspectors();

    setProfileName(currentUser.name || '');
    setProfileEmail(currentUser.email || '');
    setIsFastVerificationMode(getFastVerifyMode());

  }, [currentUser, fetchInspectors]);
  

  const canModify = (targetUser: Inspector): boolean => {
      if (!currentUser) return false;
      if (currentUser.id === targetUser.id) return false; 
      if (currentUser.role === 'Разработчик') {
          return true;
      }
      return false;
  };

  const availableRolesForEditing = useMemo(() => {
      if (currentUser?.role === 'Разработчик') return ROLES;
      if (currentUser?.role === 'Администратор') return ROLES.filter(r => r !== 'Разработчик');
      return [];
  }, [currentUser]);


  const processInspectorNameInput = (name: string): { processedName: string, hasLatinChars: boolean } => {
    const hasLatinChars = /[a-zA-Z]/.test(name);
    let cleanedName = name.replace(/[^а-яА-ЯёЁ\s-]/g, '');
    
    cleanedName = cleanedName
      .split(/(\s+|-)/)
      .map(part => part.match(/(\s+|-)/) ? part : (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
      .join("");
    return { processedName: cleanedName, hasLatinChars };
  };

  const resetAddDialog = () => {
    setNewInspectorName('');
    setNewInspectorLogin('');
    setNewInspectorPassword('');
    setNewInspectorRole('Поверитель');
    setNewInspectorEmail('');
    setNewInspectorNameWarning(false);
    setIsAddDialogOpen(false);
  }

  const handleAddInspector = async () => {
    if (!isPrivilegedUser) return;
    const processedName = newInspectorName.trim();
    const processedLogin = newInspectorLogin.trim().toLowerCase();
    
    if (!processedName || !processedLogin || !newInspectorPassword) {
      toast({ title: "Ошибка", description: "Все поля (Фамилия, Логин, Пароль) обязательны.", variant: "destructive" });
      return;
    }

    if (inspectors.some(inspector => inspector.login.toLowerCase() === processedLogin)) {
      toast({ title: "Ошибка", description: "Пользователь с таким логином уже существует.", variant: "destructive" });
      return;
    }
    const newInspectorData: Omit<Inspector, 'id'> = { 
        name: processedName, 
        login: processedLogin,
        password: newInspectorPassword,
        role: newInspectorRole,
        email: newInspectorEmail.trim(),
    };

    try {
      await addInspector(newInspectorData);
      await fetchInspectors();
      resetAddDialog();
      toast({ title: "Успешно", description: `Пользователь "${processedName}" добавлен.` });
    } catch (error) {
       toast({ title: "Ошибка добавления", description: "Не удалось создать пользователя.", variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (inspector: Inspector) => {
      setEditingInspector(inspector);
      setEditInspectorName(inspector.name);
      setEditInspectorLogin(inspector.login);
      setEditInspectorEmail(inspector.email || '');
      setEditInspectorRole(inspector.role);
      setEditInspectorPassword('');
      setEditInspectorNameWarning(false);
      setIsEditDialogOpen(true);
  };
  
  const handleUpdateInspector = async () => {
      if (!editingInspector || !canModify(editingInspector)) {
          toast({ title: "Действие запрещено", variant: "destructive" });
          return;
      }

      const processedName = editInspectorName.trim();
      if (!processedName) {
          toast({ title: "Ошибка", description: "ФИО не может быть пустым.", variant: "destructive" });
          return;
      }
      
      const updateData: Partial<Omit<Inspector, 'id' | 'login'>> = {
        name: processedName,
        email: editInspectorEmail.trim(),
        role: editInspectorRole,
      };
      if (editInspectorPassword) {
        updateData.password = editInspectorPassword;
      }

      try {
        await updateInspector(editingInspector.id, updateData);
        await fetchInspectors();
        setIsEditDialogOpen(false);
        setEditingInspector(null);
        toast({ title: "Успешно", description: `Данные пользователя "${processedName}" обновлены.` });
      } catch (error) {
        toast({ title: "Ошибка обновления", description: "Не удалось обновить данные пользователя.", variant: "destructive" });
      }
  };


  const handleDeleteInspector = async (idToDelete: string) => {
    const inspectorToDelete = inspectors.find(inspector => inspector.id === idToDelete);
    if (!inspectorToDelete || !canModify(inspectorToDelete)) {
        toast({ title: "Действие запрещено", description: "У вас нет прав для удаления этого пользователя.", variant: "destructive" });
        return;
    }
    try {
      await deleteInspector(idToDelete);
      await fetchInspectors();
      toast({ title: "Успешно", description: `Пользователь "${inspectorToDelete.name}" удален.` });
    } catch (error) {
      toast({ title: "Ошибка удаления", description: "Не удалось удалить пользователя.", variant: "destructive" });
    }
  };
  
  const handleProfileUpdate = async () => {
    if (!currentUser) return;

    let passwordUpdated = false;
    if (profileNewPassword) {
        if (profileNewPassword !== profileConfirmPassword) {
            toast({ title: "Ошибка", description: "Пароли не совпадают.", variant: "destructive" });
            return;
        }
        passwordUpdated = true;
    }
    
    const processedName = profileName.trim();
    if (!processedName) {
      toast({ title: "Ошибка", description: "ФИО не может быть пустым.", variant: "destructive" });
      return;
    }

    const updateData: Partial<Omit<Inspector, 'id' | 'login'>> = {
      name: processedName,
    };
    if (isPrivilegedUser) {
      updateData.email = profileEmail.trim();
    }
    if (passwordUpdated) {
      updateData.password = profileNewPassword;
    }

    try {
      const updatedUser = await updateInspector(currentUser.id, updateData);
      await fetchInspectors();
      setCurrentUser(updatedUser); // Update user in auth context
      setProfileNewPassword('');
      setProfileConfirmPassword('');
      toast({ title: "Успешно", description: "Ваш профиль обновлен." });
    } catch(error) {
      toast({ title: "Ошибка обновления", description: "Не удалось обновить профиль.", variant: "destructive" });
    }
  }

  const handleFastVerifyToggle = (checked: boolean) => {
      if (!canAccessSpecialSettings) return;
      setIsFastVerificationMode(checked);
      saveFastVerifyMode(checked);
  };
  
  const getRoleBadge = (role: InspectorRole) => {
    const commonClasses = "text-xs w-fit";
    switch (role) {
      case 'Разработчик': 
        return <Badge variant="outline" className={cn(commonClasses, "border-purple-400 bg-purple-50 text-purple-700")}>{role}</Badge>;
      case 'Администратор': 
        return <Badge variant="destructive" className={commonClasses}>{role}</Badge>;
      case 'Поверитель +':
        return <Badge variant="outline" className={cn(commonClasses, "border-sky-400 bg-sky-50 text-sky-700")}>{role}</Badge>;
      case 'Поверитель': 
        return <Badge variant="default" className={commonClasses}>{role}</Badge>;
      case 'Тест': 
        return <Badge variant="secondary" className={commonClasses}>{role}</Badge>;
      default: 
        return <Badge variant="outline" className={commonClasses}>{role}</Badge>;
    }
  };

  if (authLoading || !currentUser) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-6 bg-background">
            <AppLogo size="lg" />
            <div className="flex items-center text-muted-foreground pt-4 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="font-headline text-xl">{loadingMessage || 'Загрузка...'}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/50">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* --- Left Column: Profile & Actions --- */}
          <div className="md:col-span-2 space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Профиль пользователя</CardTitle>
                <CardDescription>Здесь вы можете изменить свои контактные данные и пароль.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>ФИО</Label>
                    <Input
                        value={profileName}
                        onChange={e => {
                            const { processedName, hasLatinChars } = processInspectorNameInput(e.target.value);
                            setProfileName(processedName);
                            setProfileNameWarning(hasLatinChars);
                        }}
                    />
                    {profileNameWarning && <p className="text-sm text-destructive mt-1">Неверная раскладка клавиатуры. Пожалуйста, переключитесь на русскую.</p>}
                </div>
                 <div className="space-y-2">
                    <Label>Контактный email</Label>
                    <Input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="user@example.com" disabled={!isPrivilegedUser} />
                </div>
                 <div className="space-y-2">
                    <Label>Роль</Label>
                    <Input value={currentUser.role} disabled />
                </div>
                <Separator/>
                <div className="space-y-2">
                    <Label>Логин</Label>
                    <Input value={currentUser.login} readOnly disabled />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Новый пароль</Label>
                        <Input id="new-password" type="password" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                        <Input id="confirm-password" type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                  <Button onClick={handleProfileUpdate}>
                      <Save className="mr-2 h-4 w-4"/> Сохранить изменения
                  </Button>
              </CardFooter>
            </Card>

            {canAccessSpecialSettings && (
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Специальные настройки</CardTitle>
                    <CardDescription>Доступно для ролей с расширенными правами.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsSpecialSettingsVisible(!isSpecialSettingsVisible)}>
                    {isSpecialSettingsVisible ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </CardHeader>
                {isSpecialSettingsVisible && (
                  <CardContent>
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="fast-verify-mode" className="text-base flex items-center">
                          <Sparkles className="mr-2 h-4 w-4 text-orange-500"/>
                          Ускоренная поверка термометров
                        </Label>
                        <p className="text-sm text-muted-foreground pl-6">
                          Оставляет только точку 37.0°C для ручного ввода. Остальные точки генерируются автоматически.
                        </p>
                      </div>
                      <Switch
                        id="fast-verify-mode"
                        checked={isFastVerificationMode}
                        onCheckedChange={handleFastVerifyToggle}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* --- Right Column: User Management (Admin/Dev only) --- */}
          {isPrivilegedUser && (
             <div className="md:col-span-1">
                <Card className="shadow-lg">
                    <CardHeader>
                    <CardTitle>Управление пользователями</CardTitle>
                    <CardDescription>Добавляйте, удаляйте и изменяйте права сотрудников.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                            <Button variant="outline" className="w-full mb-4">
                                <PlusCircle className="mr-2 h-4 w-4" /> Добавить
                            </Button>
                            </DialogTrigger>
                            <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Новый пользователь</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-1">
                                    <Input value={newInspectorName} onChange={e => {
                                        const { processedName, hasLatinChars } = processInspectorNameInput(e.target.value);
                                        setNewInspectorName(processedName);
                                        setNewInspectorNameWarning(hasLatinChars);
                                    }} placeholder="Фамилия И.О." />
                                    {newInspectorNameWarning && <p className="text-sm text-destructive mt-1">Неверная раскладка клавиатуры. Пожалуйста, переключитесь на русскую.</p>}
                                </div>
                                <Input value={newInspectorLogin} onChange={e => setNewInspectorLogin(e.target.value)} placeholder="Логин" />
                                <Input type="password" value={newInspectorPassword} onChange={e => setNewInspectorPassword(e.target.value)} placeholder="Пароль" />
                                <Input value={newInspectorEmail} onChange={e => setNewInspectorEmail(e.target.value)} placeholder="Email (необязательно)" />
                                <Select value={newInspectorRole} onValueChange={(value) => setNewInspectorRole(value as InspectorRole)}>
                                    <SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger>
                                    <SelectContent>
                                        {availableRolesForEditing.map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetAddDialog}>Отмена</Button>
                                <Button type="button" onClick={handleAddInspector}>Добавить</Button>
                            </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <ScrollArea className="h-[25rem] border rounded-md p-2">
                            {isDataLoading ? (
                              <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : inspectors.length > 0 ? (
                            <ul className="space-y-1">
                                {inspectors.map(inspector => (
                                <li key={inspector.id} className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded-sm text-sm">
                                    <div className="flex items-center gap-2">
                                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span>{inspector.name}</span>
                                            {getRoleBadge(inspector.role)}
                                        </div>
                                    </div>
                                    {canModify(inspector) && (
                                      <div className="flex items-center">
                                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditDialog(inspector)}>
                                            <Edit3 className="h-3 w-3 text-muted-foreground" />
                                         </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Это действие удалит пользователя "{inspector.name}" ({inspector.login}) безвозвратно.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteInspector(inspector.id)}>Удалить</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </div>
                                    )}
                                </li>
                                ))}
                            </ul>
                            ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">Список пуст.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
             </div>
          )}
        </div>
      </main>
       {/* --- Edit User Dialog --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>Измените данные для {editingInspector?.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label>ФИО</Label>
              <Input value={editInspectorName} onChange={e => {
                  const { processedName, hasLatinChars } = processInspectorNameInput(e.target.value);
                  setEditInspectorName(processedName);
                  setEditInspectorNameWarning(hasLatinChars);
              }} placeholder="Фамилия И.О." />
              {editInspectorNameWarning && <p className="text-sm text-destructive mt-1">Неверная раскладка клавиатуры.</p>}
            </div>
            <div className="space-y-1">
              <Label>Логин</Label>
              <Input value={editInspectorLogin} disabled placeholder="Логин" />
            </div>
             <div className="space-y-1">
              <Label>Email</Label>
              <Input value={editInspectorEmail} onChange={e => setEditInspectorEmail(e.target.value)} placeholder="Email (необязательно)" />
            </div>
            <div className="space-y-1">
              <Label>Новый пароль</Label>
              <Input type="password" value={editInspectorPassword} onChange={e => setEditInspectorPassword(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
            </div>
            <div className="space-y-1">
              <Label>Роль</Label>
              <Select value={editInspectorRole} onValueChange={(value) => setEditInspectorRole(value as InspectorRole)}>
                  <SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger>
                  <SelectContent>
                      {availableRolesForEditing.map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                  </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Отмена</Button>
            <Button type="button" onClick={handleUpdateInspector}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
