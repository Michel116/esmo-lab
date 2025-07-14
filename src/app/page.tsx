"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Zap, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <section className="relative container mx-auto px-4 text-center py-16 sm:py-20 overflow-hidden">
          {/* Background Robot */}
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -z-10 opacity-60 hidden lg:block" aria-hidden="true">
             <Image
              src="/robot-fly.png"
              alt="Фоновый робот"
              width={400}
              height={400}
              className="pointer-events-none"
            />
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-[-30px] animation-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <Image
                src="/esmo.png"
                alt="ЭСМО Лого"
                width={210}
                height={210}
                priority
              />
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-bold mb-4 animation-fadeInUp" style={{ animationDelay: '0.2s' }}>
              Простая и точная калибровка.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animation-fadeInUp" style={{ animationDelay: '0.3s' }}>
              ЭСМО Калибровка помогает легко собирать, хранить и экспортировать показания с приборов.
            </p>
            <div className="animation-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105 px-10 py-3 text-lg" asChild>
                <Link href="/login">
                  Начать <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 bg-secondary/50">
          <div className="container mx-auto px-4">
            <h3 className="font-headline text-3xl font-semibold text-center mb-8 animation-fadeInUp" style={{ animationDelay: '0.5s' }}>
              Ключевые особенности
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Zap className="h-8 w-8 text-primary" />, title: "Сканирование QR-кодов", description: "Автоматизируйте ввод серийных номеров путем прямого сканирования QR-кодов." },
                { icon: <Check className="h-8 w-8 text-primary" />, title: "Динамические формы", description: "Формы ввода адаптируются к выбранному вами устройству, отображая только необходимые поля данных." },
                { icon: <Download className="h-8 w-8 text-primary" />, title: "Простой экспорт", description: "Экспортируйте собранные данные в Excel (.xlsx) для отчетности и анализа." },
              ].map((feature, index) => (
                <Card key={feature.title} className="text-center shadow-md hover:shadow-xl transition-shadow duration-300 animation-fadeInUp" style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
                  <CardHeader>
                    <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="text-center p-6 border-t">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ЭСМО Калибровка. Все права защищены.</p>
      </footer>
    </div>
  );
}
