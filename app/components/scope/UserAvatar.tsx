/**
 * UserAvatar Component
 * Zobrazuje avatar uživatele s fallback na iniciály
 */



interface UserAvatarProps {
  user?: {
    fullName?: string;
    email: string;
    avatarUrl?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  showName = true 
}) => {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const getDisplayName = () => {
    if (user?.fullName) {
      return user.fullName;
    }
    if (user?.email) {
      // Zobrazit email bez domény pro lepší čitelnost
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'Unknown User';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-10 h-10 text-base';
    }
  };

  const displayName = getDisplayName();

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${getSizeClasses()}`}>
        {user?.avatarUrl ? (
          <div
            className="w-full h-full rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 bg-cover bg-center"
            style={{ backgroundImage: `url(${user.avatarUrl})` }}
            role="img"
            aria-label={displayName}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold border-2 border-gray-200 dark:border-gray-600">
            {getInitials(user?.fullName, user?.email)}
          </div>
        )}
      </div>
      
      {showName && (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {displayName}
          </span>
          {user?.fullName && user?.email && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </span>
          )}
        </div>
      )}
    </div>
  );
}; 