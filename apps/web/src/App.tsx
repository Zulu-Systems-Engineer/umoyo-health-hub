import { useState } from "react";
import RoleSelector from "./components/RoleSelector";
import ChatInterface from "./components/chat/ChatInterface";
import { AuthModal } from "./components/auth";
import useAuth from "./hooks/useAuth";

function App() {
  const [selectedRole, setSelectedRole] = useState<"patient" | "professional" | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  const handleRoleSelect = (role: "patient" | "professional") => {
    if (role === "professional") {
      // Check if user is authenticated
      if (!user) {
        // Show auth modal
        setShowAuthModal(true);
        return;
      }
    }
    setSelectedRole(role);
  };

  const handleAuthSuccess = () => {
    // After successful login, set the professional role
    if (!selectedRole) {
      setSelectedRole("professional");
    }
    setShowAuthModal(false);
  };

  const handleExitChat = () => {
    setSelectedRole(null);
  };

  // Show role selector if no role is selected
  if (!selectedRole) {
    return (
      <>
        <RoleSelector onSelectRole={handleRoleSelect} user={user} />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          defaultMode="login"
        />
      </>
    );
  }

  // Show chat interface for selected role
  return (
    <ChatInterface
      role={selectedRole}
      sessionId={user?.uid ? `session-${user.uid}` : undefined}
      onExit={handleExitChat}
    />
  );
}

export default App;
