/**
 * Badge Component
 * Reusable badge component for displaying status indicators
 * - Customizable colors and labels
 * - Consistent styling across the application
 */

interface BadgeProps {
  label: string;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info' | 'soon';
  className?: string;
  position?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function Badge({ 
  label, 
  variant = 'default',
  className = '',
  position = 'top-left'
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'soon':
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white';
    }
  };

  return (
    <div className={`absolute ${position === 'top-left' ? '-top-2 -left-2' : position === 'top-right' ? '-top-2 -right-2' : position === 'bottom-left' ? '-bottom-2 -left-2' : '-bottom-2 -right-2'} ${getVariantStyles()} text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10 ${className}`}>
      {label}
    </div>
  );
} 