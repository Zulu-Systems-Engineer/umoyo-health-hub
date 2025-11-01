import { UserCircle, Stethoscope } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface RoleSelectorProps {
  onSelectRole: (role: "patient" | "professional") => void;
}

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  const handlePatientClick = () => {
    onSelectRole("patient");
  };

  const handleProfessionalClick = () => {
    onSelectRole("professional");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Umoyo Health Hub
          </h1>
          <p className="text-lg text-gray-600">At the Heart of Zambian Healthcare</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Patient Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={handlePatientClick}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <UserCircle className="h-16 w-16 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">I'm a Patient</CardTitle>
              <CardDescription className="text-base mt-2">
                Get reliable health information in simple language
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button
                variant="default"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatientClick();
                }}
                className="w-full"
              >
                Continue as Patient
              </Button>
            </CardFooter>
          </Card>

          {/* Healthcare Professional Card */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={handleProfessionalClick}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Stethoscope className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                I'm a Healthcare Professional
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Access clinical guidelines and evidence-based protocols
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button
                variant="default"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleProfessionalClick();
                }}
                className="w-full"
              >
                Sign in as Professional
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

