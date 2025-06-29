"use client";

import type { Tab } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card'; 
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface TabItemProps {
  tab: Tab;
  onRemove?: (tabId: string) => void;
  sourceInfo: { type: 'group'; groupId: string } | { type: 'ungrouped' }; // Identifies if tab is from a group or ungrouped
}

export function TabItem({ tab, onRemove, sourceInfo }: TabItemProps) {
  const { t } = useTranslation();
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      tabId: tab.id,
      sourceType: sourceInfo.type,
      sourceGroupId: sourceInfo.type === 'group' ? sourceInfo.groupId : null,
    }));
    event.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.currentTarget.style.opacity = '1';
  };
  
  return (
    <Card 
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex items-center p-3 gap-3 transition-all hover:shadow-md cursor-grab"
      )}>
      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <Image
        src={tab.faviconUrl || defaultFavicon}
        alt={`${tab.title} favicon`}
        width={24}
        height={24}
        className="rounded flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = defaultFavicon;
        }}
        unoptimized 
        data-ai-hint="website favicon"
      />
      <div className="flex-grow overflow-hidden">
        <CardTitle className="text-sm font-medium truncate" title={tab.title}>
          <a href={tab.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {tab.title || new URL(tab.url).hostname}
          </a>
        </CardTitle>
        <CardDescription className="text-xs truncate text-muted-foreground" title={tab.url}>
          {tab.url}
        </CardDescription>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={() => onRemove(tab.id)}
          aria-label={t('removeTab', { title: tab.title || new URL(tab.url).hostname })}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}
