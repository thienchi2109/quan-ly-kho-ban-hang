
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingAuth && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loadingAuth, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Thông tin chưa đủ',
        description: 'Vui lòng nhập cả email và mật khẩu.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast({
        title: 'Đăng nhập thành công!',
        description: 'Đang chuyển hướng đến bảng điều khiển...',
      });
      // The redirect will be handled by AppLayout's useEffect
    } else {
      toast({
        title: 'Đăng nhập thất bại',
        description: result.error || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  if (loadingAuth || (!loadingAuth && currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-6">
              <Image
                src="/icons/logo.png"
                alt="App Logo"
                width={80}
                height={80}
                priority
                data-ai-hint="logo company"
              />
            </div>
            <CardTitle className="text-3xl font-bold font-headline text-primary">
              Đăng Nhập
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Nhập thông tin của bạn để tiếp tục.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 py-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật Khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-8 pb-8">
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
             <p className="text-center text-xs text-muted-foreground">
                Lưu ý: Tính năng này chỉ mang tính demo. Đừng sử dụng mật khẩu thật.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
