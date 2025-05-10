
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/lib/hooks/use-auth';
import { ChromeIcon } from 'lucide-react'; // Using ChromeIcon as a stand-in for Google G icon
import { useTranslation } from '@/lib/i18n';

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleGoogleLogin = () => {
    // In a real app, you'd initiate the Google OAuth flow here
    login(); // Mock login
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{t('welcomeToTabwise')}</CardTitle>
        <CardDescription>{t('signInGoogleDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Button onClick={handleGoogleLogin} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6">
            <ChromeIcon className="mr-2 h-5 w-5" /> {t('signInWithGoogle')}
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('mockSignInInfo')}
        </p>
      </CardContent>
    </Card>
  );
}
