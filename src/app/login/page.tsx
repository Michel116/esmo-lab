
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Inspector } from '@/types';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getInspectors, saveInspectors } from '@/lib/db';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const seedInitialUsers = async () => {
        try {
            let inspectors = await getInspectors();
            let needsSave = false;

            const developerExists = inspectors.some(i => i.role === 'Разработчик');
            if (!developerExists) {
                const defaultDeveloper: Inspector = {
                    id: crypto.randomUUID(),
                    name: 'Разработчик',
                    login: 'dev',
                    password: 'dev',
                    role: 'Разработчик',
                    email: '',
                };
                inspectors.push(defaultDeveloper);
                needsSave = true;
            }

            const adminExists = inspectors.some(i => i.role === 'Администратор');
            if (!adminExists) {
                const defaultAdmin: Inspector = {
                    id: crypto.randomUUID(),
                    name: 'Администратор',
                    login: 's',
                    password: 's',
                    role: 'Администратор',
                    email: '',
                };
                inspectors.push(defaultAdmin);
                needsSave = true;
            }

            if (needsSave) {
                await saveInspectors(inspectors);
                toast({ title: 'Созданы пользователи по умолчанию', description: 'dev/dev (Разработчик) и s/s (Администратор)' });
            }
        } catch (error) {
            console.error("Failed to seed users:", error);
            // Don't show toast to user for seeding errors, log to console.
        }
    };
    seedInitialUsers();
  }, [toast]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const inspectors = await getInspectors();
        const user = inspectors.find(
          (inspector) => inspector.login.toLowerCase() === login.toLowerCase() && inspector.password === password
        );

        if (user) {
          sessionStorage.setItem('datafill-currentUser', user.id);
          toast({ title: `Добро пожаловать, ${user.name}!` });
          router.push('/dashboard');
        } else {
          toast({
            title: 'Ошибка входа',
            description: 'Неверный логин или пароль.',
            variant: 'destructive',
          });
          setIsLoading(false);
        }
    } catch (error) {
        toast({
            title: 'Ошибка сервера',
            description: 'Не удалось подключиться к базе данных. Попробуйте позже.',
            variant: 'destructive',
        });
        setIsLoading(false);
    }
  };

  return (
    <main 
      className="flex items-center justify-center min-h-screen bg-background p-4"
    >
      <Card className="w-full max-w-sm shadow-2xl animation-fadeInUp bg-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AppLogo size="md" />
          </div>
          <CardTitle className="text-2xl">Вход в систему</CardTitle>
          <CardDescription>Введите ваши учетные данные для доступа</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                type="text"
                placeholder="Ваш логин"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ваш пароль"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full w-10"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
