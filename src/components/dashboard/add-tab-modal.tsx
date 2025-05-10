
"use client";

import { useState } from 'react';
import type { Tab } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PlusCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface AddTabModalProps {
  onAddTab: (tab: Omit<Tab, 'id' | 'lastAccessed'>) => void;
  triggerButton?: React.ReactNode;
}

export function AddTabModal({ onAddTab, triggerButton }: AddTabModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert("URL is required."); // This alert could also be translated if needed
      return;
    }
    try {
      new URL(url); // Validate URL
    } catch (_) {
      alert("Invalid URL format."); // This alert could also be translated
      return;
    }

    onAddTab({ 
      title: title.trim() || new URL(url).hostname, 
      url: url.trim(),
      isPlaceholder: true
    });
    setTitle('');
    setUrl('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : 
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addNewTab')}
        </Button>
        }
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('addTabModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('addTabModalDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tab-title" className="text-right">
              {t('titleLabel')}
            </Label>
            <Input
              id="tab-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tab-url" className="text-right">
              {t('urlLabel')}
            </Label>
            <Input
              id="tab-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
              placeholder={t('urlPlaceholder')}
              type="url"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">{t('addTabButton')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
