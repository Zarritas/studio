"use client";

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UploadCloud } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useDashboardContext } from '@/contexts/DashboardContext';
import type { Tab } from '@/types';

interface ImportActiveTabsModalProps {
  triggerButton: ReactNode;
}

export function ImportActiveTabsModal({ triggerButton }: ImportActiveTabsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlsInput, setUrlsInput] = useState('');
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addTabsBatch } = useDashboardContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!addTabsBatch) {
      toast({
        title: t('featureNotReadyTitle', { defaultValue: "Import Not Ready" }),
        description: t('featureNotReadyDescription', { defaultValue: "The tab import function is not yet available. Please try again in a moment." }),
        variant: 'destructive',
      });
      return;
    }

    const urls = urlsInput.split('\n').map(url => url.trim()).filter(url => url.length > 0);

    if (urls.length === 0) {
      toast({
        title: t('noUrlsPasted'),
        description: t('noUrlsPastedDesc'),
        variant: 'destructive',
      });
      return;
    }

    const newTabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] = [];
    let invalidUrlCount = 0;

    urls.forEach(urlStr => {
      try {
        // Ensure URL has a scheme, default to https if missing
        let fullUrl = urlStr;
        if (!/^https?:\/\//i.test(urlStr)) {
          fullUrl = `https://${urlStr}`;
        }
        const parsedUrl = new URL(fullUrl);
        newTabsData.push({
          title: parsedUrl.hostname, // Default title to hostname
          url: parsedUrl.toString(),
        });
      } catch (_) {
        invalidUrlCount++;
        console.warn(`Invalid URL skipped: ${urlStr}`);
      }
    });

    if (newTabsData.length > 0) {
      addTabsBatch(newTabsData);
    }

    if (invalidUrlCount > 0) {
      toast({
        title: t('invalidUrlsFound'),
        description: t('invalidUrlsFoundDesc', { count: invalidUrlCount }),
        variant: 'destructive',
      });
    }
    
    if (newTabsData.length > 0 && invalidUrlCount === 0) {
        // Toast for successful import is handled by addTabsBatch in DashboardPageContent
    }


    setUrlsInput('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('importActiveTabsModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('importActiveTabsModalDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="urls-input" className="sr-only">
              {t('urlsLabel')}
            </Label>
            <Textarea
              id="urls-input"
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder={t('urlsInputPlaceholder')}
              className="min-h-[150px]"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {t('cancel')}
            </Button>
            <Button type="submit" disabled={!addTabsBatch}>
                <UploadCloud className="mr-2 h-4 w-4" />{t('importButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
