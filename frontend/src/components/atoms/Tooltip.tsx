import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className = '', sideOffset = 5, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 overflow-hidden rounded-md border border-white/[0.08] bg-[#1c1d20] px-2.5 py-1 text-xs text-neutral-200 shadow-xl backdrop-blur-md select-none pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  content?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  align = 'center',
  sideOffset = 5,
  className = '',
  children,
  ...props
}) => {
  // If `content` is supplied, act as convenient single-element Tooltip
  if (content !== undefined && content !== null) {
    return (
      <TooltipPrimitive.Root {...props}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    );
  }

  // Otherwise, act as official Shadcn compound Root: <Tooltip><TooltipTrigger>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>
  return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
};

export { TooltipTrigger, TooltipContent, TooltipProvider };
