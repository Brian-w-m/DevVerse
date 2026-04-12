'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue = '', onValueChange, children, ...props }, ref) => {
    const [value, setValue] = React.useState(defaultValue);

    const handleChange = (newValue: string) => {
      setValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
        <div ref={ref} className={cn('', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex gap-1 rounded-lg border border-slate-800/70 bg-slate-950/50 p-1',
      className
    )}
    {...props}
  />
));

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
    const isActive = selectedValue === value;

    return (
      <button
        ref={ref}
        onClick={(e) => {
          onValueChange(value);
          onClick?.(e);
        }}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-amber-300/20 text-amber-300'
            : 'text-slate-400 hover:text-slate-300',
          className
        )}
        {...props}
      />
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = React.useContext(TabsContext);

    if (selectedValue !== value) return null;

    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
