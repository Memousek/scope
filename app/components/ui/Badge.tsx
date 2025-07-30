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
}

export function Badge({ 
  label, 
  variant = 'default',
  className = ''
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
    <div className={`absolute -top-2 -left-2 ${getVariantStyles()} text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10 ${className}`}>
      {label}
    </div>
  );
} 