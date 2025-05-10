"use client";

import { useState } from 'react'; 
import type { ReactNode } from 'react';
import type { Tab, TabGroup as TabGroupType } from '@/types';
import { TabItem } from './tab-item';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Edit2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n';
import { EditGroupNameModal } from './edit-group-name-modal'; 
import { cn } from '@/lib/utils';

export interface DraggedTabInfo {
  tabId: string;
  sourceType: 'group' | 'ungrouped';
  sourceGroupId: string | null;
}

interface TabGroupProps {
  group: TabGroupType;
  onRemoveTab: (groupId: string, tabId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onExportGroup: (group: TabGroupType) => void;
  onAddTabToGroup: (groupId: string) => void; 
  onEditGroupName: (groupId: string, newName: string) => void;
  onDropTab: (draggedTabInfo: DraggedTabInfo, targetGroupId: string) => void;
}

export function TabGroup({ 
  group, 
  onRemoveTab, 
  onRemoveGroup, 
  onExportGroup,
  onAddTabToGroup,
  onEditGroupName,
  onDropTab
}: TabGroupProps): ReactNode {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleSaveGroupName = (newName: string) => {
    onEditGroupName(group.id, newName);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    try {
      const dataString = event.dataTransfer.getData('application/json');
      if (dataString) {
        const draggedTabInfo: DraggedTabInfo = JSON.parse(dataString);
        if (draggedTabInfo.tabId && draggedTabInfo.sourceType !== undefined) {
          onDropTab(draggedTabInfo, group.id);
        }
      }
    } catch (e) {
      console.error("Failed to parse dragged data in TabGroup", e);
    }
  };

  return (
    <> 
      <Card 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300",
          isDragOver && "ring-2 ring-primary ring-offset-2 bg-primary/10"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              {group.name}
              {group.isCustom && <Badge variant="secondary">{t('custom', {defaultValue: 'Custom'})}</Badge>}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)} className="h-7 w-7">
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">{t('editGroupName')}</span>
            </Button>
          </div>
          <CardDescription>{t('tabsInGroup', { count: group.tabs.length })}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0">
          {group.tabs.length > 0 ? (
            <ScrollArea className="h-[250px] p-4 pt-0"> 
              <div className="space-y-2">
                {group.tabs.map((tab) => (
                  <TabItem 
                    key={tab.id} 
                    tab={tab} 
                    sourceInfo={{ type: 'group', groupId: group.id }}
                    onRemove={() => onRemoveTab(group.id, tab.id)} 
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-muted-foreground min-h-[100px] flex flex-col items-center justify-center"> {/* Ensure drop target area even if empty */}
              <p>{t('groupIsEmpty')}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => onAddTabToGroup(group.id)}>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('addTabToEmptyGroup')}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => onExportGroup(group)}>
            <FileText className="mr-2 h-4 w-4" /> {t('export')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onRemoveGroup(group.id)}>
            <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
          </Button>
        </CardFooter>
      </Card>

      <EditGroupNameModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        currentGroupName={group.name}
        onSave={handleSaveGroupName}
      />
    </>
  );
}
