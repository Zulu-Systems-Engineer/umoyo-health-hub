import { useState } from "react";
import { UserCircle, Stethoscope, Shield, Heart, ArrowRight } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface RoleSelectorProps {
  onSelectRole: (role: "patient" | "professional") => void;
  isLoading?: boolean;
}

export default function RoleSelector({ onSelectRole, isLoading = false }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<"patient" | "professional" | null>(null);

  const handlePatientClick = () => {
    if (isLoading) return;
    setSelectedRole("patient");
    onSelectRole("patient");
  };

  const handleProfessionalClick = () => {
    if (isLoading) return;
    setSelectedRole("professional");
    onSelectRole("professional");
  };

  const roles = [
    {
      id: "patient",
      title: "I'm a Patient",
      description: "Get reliable health information in simple language",
      icon: UserCircle,
      color: "blue",
      buttonText: "Continue as Patient",
      features: ["Simple language", "Quick health guidance", "24/7 available"]
    },
    {
      id: "professional",
      title: "I'm a Healthcare Professional",
      description: "Access clinical guidelines and evidence-based protocols",
      icon: Stethoscope,
      color: "green",
      buttonText: "Sign in as Professional",
      features: ["Clinical guidelines", "Evidence-based protocols", "Professional tools"]
    }
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    const baseClasses = {
      blue: {
        border: isSelected ? "border-blue-500" : "border-blue-200",
        icon: "text-blue-600",
        button: "bg-blue-600 hover:bg-blue-700",
        glow: "shadow-blue-200"
      },
      green: {
        border: isSelected ? "border-green-500" : "border-green-200",
        icon: "text-green-600",
        button: "bg-green-600 hover:bg-green-700",
        glow: "shadow-green-200"
      }
    };
    return baseClasses[color as keyof typeof baseClasses] || baseClasses.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Heart className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Umoyo Health Hub
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-600 mb-2">
            At the Heart of Zambian Healthcare
          </p>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Trusted health guidance for patients and healthcare professionals across Zambia
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const colors = getColorClasses(role.color, isSelected);
            const isProcessing = isLoading && selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={`
                  cursor-pointer transition-all duration-300 border-2
                  ${colors.border} ${colors.glow}
                  hover:shadow-xl transform hover:scale-105
                  ${isProcessing ? "opacity-70 pointer-events-none" : ""}
                  ${isSelected ? "ring-2 ring-offset-2 ring-blue-500 scale-105" : ""}
                `}
                onClick={role.id === "patient" ? handlePatientClick : handleProfessionalClick}
              >
                <CardHeader className="text-center space-y-4">
                  {/* Icon with background */}
                  <div className="flex justify-center">
                    <div className={`p-4 rounded-2xl bg-${role.color}-50`}>
                      <Icon className={`h-12 w-12 ${colors.icon}`} />
                    </div>
                  </div>

                  {/* Title */}
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
                    {role.title}
                  </CardTitle>

                  {/* Description */}
                  <CardDescription className="text-base md:text-lg text-gray-600 leading-relaxed">
                    {role.description}
                  </CardDescription>

                  {/* Features List */}
                  <div className="space-y-2 pt-2">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-center text-sm text-gray-500">
                        <Shield className="h-4 w-4 mr-2 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardHeader>

                <CardFooter className="justify-center">
                  <Button
                    variant="default"
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (role.id === "patient") handlePatientClick();
                      else handleProfessionalClick();
                    }}
                    className={`w-full max-w-xs ${colors.button} text-white font-semibold py-6 text-base`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {role.buttonText}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-12 space-y-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 text-green-500" />
              Secure & Confidential
            </div>
            <div className="flex items-center">
              <Heart className="h-4 w-4 mr-2 text-red-500" />
              Zambian Health Guidelines
            </div>
            <div className="flex items-center">
              <UserCircle className="h-4 w-4 mr-2 text-blue-500" />
              Patient-First Approach
            </div>
          </div>
          
          <p className="text-xs text-gray-400 max-w-2xl mx-auto">
            Umoyo Health Hub follows Zambian Ministry of Health guidelines. 
            For emergencies, please contact your nearest healthcare facility immediately.
          </p>
        </div>
      </div>
    </div>
  );
}