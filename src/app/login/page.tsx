
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (typeof result === 'string') { // Error code/message returned from login function
        const friendlyError = mapFirebaseErrorToMessage(result);
        setError(friendlyError);
        toast({
          title: 'Đăng nhập thất bại',
          description: friendlyError,
          variant: 'destructive',
        });
      } else { // UserCredential returned, login successful
        toast({
          title: 'Đăng nhập thành công!',
          description: 'Đang chuyển hướng đến bảng điều khiển...',
        });
        router.push('/dashboard'); // Redirect to dashboard
      }
    } catch (err: any) { // Catch any other unexpected errors
      const errorMessage = err.code ? mapFirebaseErrorToMessage(err.code) : "Đã xảy ra lỗi không xác định khi đăng nhập.";
      setError(errorMessage);
      toast({
        title: 'Lỗi Đăng nhập',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const mapFirebaseErrorToMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Địa chỉ email không hợp lệ.';
      case 'auth/user-disabled':
        return 'Tài khoản người dùng này đã bị vô hiệu hóa.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential': // Often means user not found or wrong password
        return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
      case 'auth/wrong-password':
        return 'Mật khẩu không đúng.';
      default:
        return 'Đăng nhập thất bại. Vui lòng thử lại sau.';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center font-headline">Đăng Nhập</CardTitle>
          <CardDescription className="text-center">
            Truy cập vào hệ thống quản lý của bạn.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Nhập mật khẩu"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng Nhập
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
