
"use client";

import { useState } from 'react';
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
import { FolderPlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface CreateGroupModalProps {
  onCreateGroup: (groupName: string) => void;
}

export function CreateGroupModal({ onCreateGroup }: CreateGroupModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert("Group name cannot be empty."); // This could also be translated
      return;
    }
    onCreateGroup(groupName.trim());
    setGroupName('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="mr-2 h-4 w-4" /> {t('createCustomGroup')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('createGroupModalTitle')}</DialogTitle>
          <DialogDescription>
            {t('createGroupModalDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="group-name" className="text-right">
              {t('nameLabel')}
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder={t('namePlaceholderWork')}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">{t('createGroupButton')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
