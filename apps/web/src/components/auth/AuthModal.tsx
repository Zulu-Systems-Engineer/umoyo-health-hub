import { useState } from "react";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import useAuth from "@/hooks/useAuth";
import { Button } from "../ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, error } = useAuth();

  if (!isOpen) return null;

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signIn(email, password);
      onSuccess?.();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      await signUp(email, password, displayName);
      onSuccess?.();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-12 right-0 text-white hover:text-gray-300"
          onClick={onClose}
          disabled={isLoading}
        >
          <X className="h-6 w-6" />
        </Button>

        {mode === "login" ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToSignUp={() => setMode("signup")}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <SignUpForm
            onSignUp={handleSignUp}
            onSwitchToLogin={() => setMode("login")}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

