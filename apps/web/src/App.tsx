import { useState } from "react";
import RoleSelector from "./components/RoleSelector";
import ChatInterface from "./components/chat/ChatInterface";
import useAuth from "./hooks/useAuth";

function App() {
  const [selectedRole, setSelectedRole] = useState<"patient" | "professional" | null>(null);
  const { user } = useAuth();

  const handleRoleSelect = (role: "patient" | "professional") => {
    if (role === "professional") {
      // TODO: Trigger authentication flow
      // For now, we'll check if user is authenticated
      if (!user) {
        // Show login modal or redirect to login
        alert("Authentication required for healthcare professionals. Please sign in.");
        return;
      }
    }
    setSelectedRole(role);
  };

  // Show role selector if no role is selected
  if (!selectedRole) {
    return <RoleSelector onSelectRole={handleRoleSelect} />;
  }

  // Show chat interface for selected role
  return (
    <ChatInterface
      role={selectedRole}
      sessionId={user?.uid ? `session-${user.uid}` : undefined}
    />
  );
}

export default App;
