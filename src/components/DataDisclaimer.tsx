import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface DataDisclaimerProps {
  variant?: "default" | "compact";
  className?: string;
}

export const DataDisclaimer = ({ variant = "default", className = "" }: DataDisclaimerProps) => {
  if (variant === "compact") {
    return (
      <div className={`text-xs text-gray-600 ${className}`}>
        <Info className="inline w-3 h-3 mr-1" />
        Contains only publicly available information. Results depend on what businesses publicly display.
      </div>
    );
  }

  return (
    <Alert className={`bg-yellow-50 border-yellow-200 ${className}`}>
      <Info className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-sm text-gray-700">
        <strong>Data Disclaimer:</strong> We extract only publicly available information from business websites. 
        Data completeness depends on what businesses publicly display. We cannot guarantee finding owner names, 
        emails, or other non-public information. Results may vary based on website structure and public disclosure.
      </AlertDescription>
    </Alert>
  );
};
