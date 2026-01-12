import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router";

interface TriggerCallParams {
  facilityName: string;
  phoneNumber: string;
  analysisData?: any;
  overrideBusinessHours?: boolean;
}

interface TriggerCallResult {
  success: boolean;
  callId?: string;
  status?: string;
  requiresAgreement?: boolean;
  complianceBlocked?: boolean;
  reason?: string;
}

export function useTriggerCall() {
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const triggerCall = async (params: TriggerCallParams): Promise<TriggerCallResult> => {
    const { facilityName, phoneNumber, analysisData, overrideBusinessHours } = params;

    if (!phoneNumber || phoneNumber === "N/A") {
      toast({
        title: "No Phone Number",
        description: "This business doesn't have a valid phone number",
        variant: "destructive",
      });
      return { success: false, reason: "No phone number" };
    }

    setIsTriggering(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to trigger calls.",
          variant: "destructive",
        });
        navigate("/login");
        return { success: false, reason: "Not authenticated" };
      }

      // Use the unified trigger-call function with full compliance
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-call`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            facility_name: facilityName,
            phone_number: phoneNumber,
            analysis_data: analysisData,
            override_business_hours: overrideBusinessHours,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Handle specific compliance errors
        if (response.status === 403) {
          if (result.requires_agreement) {
            toast({
              title: "TCPA Certification Required",
              description: "Please accept the TCPA certification in Compliance settings before making calls.",
              variant: "destructive",
            });
            return { 
              success: false, 
              requiresAgreement: true,
              reason: result.reason || "TCPA certification required"
            };
          }
          if (result.dnc_blocked) {
            toast({
              title: "Do Not Call",
              description: "This number is on the Do Not Call list.",
              variant: "destructive",
            });
            return { 
              success: false, 
              complianceBlocked: true,
              reason: "Number on DNC list"
            };
          }
          if (result.business_hours_blocked) {
            toast({
              title: "Outside Business Hours",
              description: result.reason || "Calls can only be made between 8 AM - 9 PM in the recipient's timezone.",
              variant: "destructive",
            });
            return { 
              success: false, 
              complianceBlocked: true,
              reason: result.reason || "Outside business hours"
            };
          }
        }

        throw new Error(result.error || result.reason || "Failed to trigger call");
      }

      toast({
        title: "Call Initiated",
        description: `AI sales call started for ${facilityName}`,
      });

      return {
        success: true,
        callId: result.call_id,
        status: result.call_record?.status || "initiated",
      };

    } catch (error) {
      console.error("Error triggering call:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to trigger call";
      toast({
        title: "Call Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, reason: errorMessage };
    } finally {
      setIsTriggering(false);
    }
  };

  return {
    triggerCall,
    isTriggering,
  };
}
