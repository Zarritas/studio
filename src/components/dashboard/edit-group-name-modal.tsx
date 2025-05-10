
"use client";

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
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
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface EditGroupNameModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentGroupName: string;
  onSave: (newName: string) => void;
}

export function EditGroupNameModal({
  isOpen,
  onOpenChange,
  currentGroupName,
  onSave,
}: EditGroupNameModalProps): ReactNode {
  const [groupName, setGroupName] = useState(currentGroupName);
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setGroupName(currentGroupName); // Reset name when modal opens/currentGroupName changes while open
    }
  }, [isOpen, currentGroupName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({
        title: t('groupNameCannotBeEmptyTitle', {defaultValue: "Invalid Group Name"}),
        description: t('groupNameCannotBeEmptyDesc', {defaultValue: "Group name cannot be empty. Please enter a valid name."}),
        variant: "destructive"
      });
      return;
    }
    onSave(groupName.trim());
    onOpenChange(false); // Close modal on save
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editGroupModalTitle', {defaultValue: 'Edit Group Name'})}</DialogTitle>
          <DialogDescription>
            {t('editGroupModalDescription', {defaultValue: 'Enter the new name for this group.'})}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-group-name" className="text-right">
              {t('nameLabel')}
            </Label>
            <Input
              id="edit-group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder={t('namePlaceholderWork')} 
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">{t('saveNameButton', {defaultValue: 'Save Name'})}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

