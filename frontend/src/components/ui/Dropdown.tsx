import React, { useState, useRef, useEffect, useContext } from 'react';
import { cn } from '../../utils';

export interface DropdownProps {
  children: React.ReactNode;
}

export interface DropdownTriggerProps {
  children: React.ReactNode;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  'aria-label'?: string;
}

export interface DropdownItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  startContent?: React.ReactNode;
}

const DropdownContext = React.createContext<{ isOpen: boolean; setIsOpen: (open: boolean) => void } | null>(null);

export function Dropdown({ children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children }: React.PropsWithChildren<DropdownTriggerProps>) {
  const context = useContext(DropdownContext);
  
  if (!context) {
    return <>{children}</>;
  }

  return (
    <div onClick={() => context.setIsOpen(!context.isOpen)}>
      {children}
    </div>
  );
}

export function DropdownMenu({ children, className }: React.PropsWithChildren<DropdownMenuProps & { className?: string }>) {
  const context = useContext(DropdownContext);
  
  if (!context || !context.isOpen) {
    return null;
  }

  return (
    <div className={cn(
      "absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
      className
    )}>
      <div className="py-1" role="menu" aria-orientation="vertical">
        {children}
      </div>
    </div>
  );
}

export function DropdownItem({ children, onPress, className, startContent }: React.PropsWithChildren<DropdownItemProps>) {
  const context = useContext(DropdownContext);

  const handleClick = () => {
    onPress?.();
    context?.setIsOpen(false);
  };

  return (
    <button
      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${className || ''}`}
      role="menuitem"
      onClick={handleClick}
    >
      {startContent && <span className="inline-block mr-2">{startContent}</span>}
      {children}
    </button>
  );
}
