
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FcGoogle } from 'react-icons/fc'; // Import Google icon from react-icons

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, currentUser, loadingAuth } = useAuth(); // Thêm currentUser và loadingAuth
  const router = useRouter();
  const { toast } = useToast();

  // Chuyển hướng nếu người dùng đã đăng nhập
  useEffect(() => {
    if (!loadingAuth && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loadingAuth, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (typeof result === 'string') { // Xử lý lỗi trả về từ signInWithGoogle
        const friendlyError = mapFirebaseErrorToMessage(result);
        toast({
          title: 'Đăng nhập Google thất bại',
          description: friendlyError,
          variant: 'destructive',
        });
      } else { // Đăng nhập thành công, UserCredential được trả về
        toast({
          title: 'Đăng nhập Google thành công!',
          description: 'Đang chuyển hướng đến bảng điều khiển...',
        });
        // AppLayout sẽ tự động chuyển hướng khi currentUser thay đổi
        // router.push('/dashboard'); // Không cần thiết ở đây nữa
      }
    } catch (err: any) { // Bắt các lỗi không mong muốn khác
      const errorMessage = err.code ? mapFirebaseErrorToMessage(err.code) : "Đã xảy ra lỗi không xác định khi đăng nhập Google.";
      toast({
        title: 'Lỗi Đăng nhập Google',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const mapFirebaseErrorToMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return 'Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.';
      case 'auth/cancelled-popup-request':
        return 'Yêu cầu đăng nhập đã bị hủy. Vui lòng thử lại.';
      case 'auth/popup-blocked':
        return 'Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép pop-up và thử lại.';
      case 'auth/network-request-failed':
        return 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.';
      case 'auth/operation-not-allowed':
        return 'Đăng nhập bằng Google chưa được kích hoạt cho dự án này.';
      case 'auth/too-many-requests':
        return 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.';
      default:
        return 'Đăng nhập Google thất bại. Mã lỗi: ' + errorCode;
    }
  };

  // Nếu đang tải trạng thái auth hoặc người dùng đã đăng nhập, hiển thị loading
  if (loadingAuth || (!loadingAuth && currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang tải...</p>
      </div>
    );
  }

  // Nếu chưa đăng nhập, hiển thị trang login
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Image
              src="/icons/logo.png" // Đảm bảo bạn có file logo này trong public/icons
              alt="App Logo"
              width={80}
              height={80}
              priority
              data-ai-hint="logo company"
            />
          </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">
            Chào mừng bạn!
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Đăng nhập để tiếp tục quản lý công việc của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 py-8">
          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full h-12 text-base" 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FcGoogle className="mr-3 h-6 w-6" />
            )}
            {loading ? 'Đang xử lý...' : 'Đăng nhập với Google'}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
            <p className="text-xs text-muted-foreground">
              Bằng cách đăng nhập, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
