import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

export interface ToastNotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  colors: {
    card: string;
    success: string;
    danger: string;
    warning: string;
    primary: string;
    text: string;
    textSecondary: string;
    [key: string]: any;
  };
  description?: string;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  onClose,
  colors,
  description,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={24} style={{ color: colors.success }} />;
      case "error":
        return <AlertCircle size={24} style={{ color: colors.danger }} />;
      case "warning":
        return <AlertCircle size={24} style={{ color: colors.warning }} />;
      case "info":
        return <CheckCircle size={24} style={{ color: colors.primary }} />;
      default:
        return <CheckCircle size={24} style={{ color: colors.success }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.success;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] sm:w-full"
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        animation: "slideInRight 0.3s ease-out forwards",
      }}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
          {description && (
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {description}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: colors.textSecondary }}
        >
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
};
