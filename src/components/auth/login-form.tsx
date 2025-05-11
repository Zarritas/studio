
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/lib/hooks/use-auth';
import { ChromeIcon, Loader2 } from 'lucide-react'; 
import { useTranslation } from '@/lib/i18n';

export function LoginForm() {
  const { login: attemptLogin, isLoading: authIsLoading } = useAuth(); // Renamed to avoid conflict
  const { t } = useTranslation();

  const handleGoogleLogin = async () => {
    if (authIsLoading) return;
    await attemptLogin(); // This now calls the Firebase signInWithPopup via AuthProvider
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{t('welcomeToTabwise')}</CardTitle>
        <CardDescription>{t('signInGoogleDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Button 
            onClick={handleGoogleLogin} 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6"
            disabled={authIsLoading}
          >
            {authIsLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ChromeIcon className="mr-2 h-5 w-5" />
            )}
            {t('signInWithGoogle')}
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {/* Inform users about real sign-in or keep mock info if that's intended for some phase */}
          {t('firebaseSignInInfo', {defaultValue: "Uses Google's secure sign-in. Your data is safe."})}
        </p>
      </CardContent>
    </Card>
  );
}
