
"use client";

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
import { UploadCloud, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useDashboardContext } from '@/contexts/DashboardContext';
import type { Tab } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportActiveTabsModalProps {
  triggerButton: ReactNode;
}

export function ImportActiveTabsModal({ triggerButton }: ImportActiveTabsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addTabsBatch } = useDashboardContext();

  const handleImportActiveTabs = async () => {
    setIsFetching(true);
    setApiError(null);

    if (!addTabsBatch) {
      toast({
        title: t('featureNotReadyTitle', { defaultValue: "Import Not Ready" }),
        description: t('featureNotReadyDescription', { defaultValue: "The tab import function is not yet available. Please try again in a moment." }),
        variant: 'destructive',
      });
      setIsFetching(false);
      return;
    }

    if (typeof window.chrome === "undefined" || typeof window.chrome.tabs === "undefined" || typeof window.chrome.tabs.query === "undefined") {
      setApiError(t('importActiveTabsModal.apiUnavailable.description', {defaultValue: "Could not access browser tabs. This feature may only work in specific browser environments (e.g., as an extension)."}));
      toast({
        title: t('importActiveTabsModal.apiUnavailable.title', { defaultValue: "Browser API Not Available" }),
        description: t('importActiveTabsModal.apiUnavailable.description'),
        variant: 'destructive',
      });
      setIsFetching(false);
      return;
    }

    try {
      window.chrome.tabs.query({ currentWindow: true }, (chromeTabs: chrome.tabs.Tab[]) => {
        if (chrome.runtime.lastError) {
          console.error("Error querying tabs:", chrome.runtime.lastError.message);
          setApiError(chrome.runtime.lastError.message || t('importActiveTabsModal.queryError', {defaultValue: 'Failed to query tabs.'}));
          toast({
            title: t('importActiveTabsModal.queryErrorTitle', {defaultValue: 'Error Querying Tabs'}),
            description: chrome.runtime.lastError.message || t('importActiveTabsModal.queryError'),
            variant: 'destructive',
          });
          setIsFetching(false);
          return;
        }

        if (!chromeTabs || chromeTabs.length === 0) {
          toast({
            title: t('importActiveTabsModal.noTabsFound.title', { defaultValue: "No Active Tabs Found" }),
            description: t('importActiveTabsModal.noTabsFound.description', { defaultValue: "No open tabs were found in the current window or they could not be accessed." }),
            variant: 'default',
          });
          setIsFetching(false);
          setIsOpen(false);
          return;
        }

        const newTabsData: Omit<Tab, 'id' | 'lastAccessed' | 'faviconUrl' | 'isPlaceholder'>[] = chromeTabs
          .filter(ct => ct.url) // Ensure tab has a URL
          .map(ct => {
            let title = ct.title || 'Untitled Tab';
            let url = ct.url!; // We filtered for ct.url already
             try {
                // Ensure URL has a scheme, default to https if missing (though chrome.tabs.Tab usually provides full URL)
                if (!/^https?:\/\//i.test(url)) {
                  url = `https://${url}`;
                }
                const parsedUrl = new URL(url);
                if (!ct.title) {
                    title = parsedUrl.hostname;
                }
            } catch (e) {
                console.warn(`Invalid URL from chrome.tabs: ${ct.url}`);
                // Keep original URL and a placeholder title if parsing fails
            }
            return {
                title: title,
                url: url,
            };
        });
        
        if (newTabsData.length > 0) {
          addTabsBatch(newTabsData); // Toast for successful import is handled by this function
        } else if (chromeTabs.length > 0) { // Some tabs were filtered out (e.g. no URL)
             toast({
                title: t('importActiveTabsModal.noImportableTabs.title', {defaultValue: 'No Importable Tabs'}),
                description: t('importActiveTabsModal.noImportableTabs.description', {defaultValue: 'Found tabs, but none could be imported (e.g., missing URLs).'}),
                variant: 'default',
            });
        }
        
        setIsFetching(false);
        setIsOpen(false);
      });
    } catch (error) {
      console.error("Error accessing chrome.tabs.query:", error);
      setApiError( (error as Error).message || t('importActiveTabsModal.genericError', {defaultValue: 'An unexpected error occurred.'}));
      toast({
        title: t('importActiveTabsModal.genericErrorTitle', {defaultValue: 'Import Error'}),
        description: (error as Error).message || t('importActiveTabsModal.genericError'),
        variant: 'destructive',
      });
      setIsFetching(false);
    }
  };
  
  const handleOpenDialog = () => {
    setApiError(null); // Reset error when opening dialog
    setIsOpen(true);
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleOpenDialog}>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('importActiveTabsModal.title', {defaultValue: 'Import Active Browser Tabs'})}</DialogTitle>
          <DialogDescription>
            {t('importActiveTabsModal.description', {defaultValue: 'This will attempt to import all tabs from your current browser window.'})}
          </DialogDescription>
        </DialogHeader>
        
        {apiError && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">
            <p className="text-sm text-muted-foreground">
                {t('importActiveTabsModal.privacyNote', { defaultValue: "Your tab data will be processed locally by this application."})}
            </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isFetching}>
            {t('cancel')}
          </Button>
          <Button onClick={handleImportActiveTabs} disabled={isFetching || !addTabsBatch}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {isFetching ? t('importActiveTabsModal.button.importing', {defaultValue: 'Importing...'}) : t('importActiveTabsModal.button.import', {defaultValue: 'Import Active Tabs'})}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
