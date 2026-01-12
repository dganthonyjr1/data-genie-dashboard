import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Eye, 
  Trash2, 
  Download, 
  UserX, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Send
} from "lucide-react";
import { format } from "date-fns";

interface DataRequest {
  id: string;
  request_type: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface PrivacyRightsSectionProps {
  requests: DataRequest[];
  onRequestSubmit: () => void;
}

export const PrivacyRightsSection = ({ requests, onRequestSubmit }: PrivacyRightsSectionProps) => {
  const { toast } = useToast();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestType, setRequestType] = useState<'access' | 'deletion' | 'opt_out'>('access');
  const [requestDetails, setRequestDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("data_subject_requests").insert({
        user_id: user.id,
        request_type: requestType,
        details: { notes: requestDetails },
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: "Privacy request submitted", description: "We will process your request within 30 days." });
      setShowRequestDialog(false);
      setRequestDetails("");
      onRequestSubmit();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({ title: "Failed to submit request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400"><AlertCircle className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const privacyRights = [
    {
      title: "Right to Access",
      description: "Request a copy of all personal data we have collected about you",
      icon: Eye,
      action: "access" as const,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Right to Deletion",
      description: "Request that we delete your personal data from our systems",
      icon: Trash2,
      action: "deletion" as const,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      title: "Right to Opt-Out",
      description: "Opt-out of data sales and targeted advertising",
      icon: UserX,
      action: "opt_out" as const,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Privacy Rights Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {privacyRights.map((right) => (
          <Card key={right.action} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="pt-6">
              <div className={`w-12 h-12 rounded-xl ${right.bgColor} flex items-center justify-center mb-4`}>
                <right.icon className={`h-6 w-6 ${right.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{right.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{right.description}</p>
              <Dialog open={showRequestDialog && requestType === right.action} onOpenChange={(open) => {
                setShowRequestDialog(open);
                if (open) setRequestType(right.action);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <right.icon className={`h-5 w-5 ${right.color}`} />
                      {right.title}
                    </DialogTitle>
                    <DialogDescription>{right.description}</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Additional Details (Optional)</label>
                    <Textarea
                      placeholder="Provide any additional information about your request..."
                      value={requestDetails}
                      onChange={(e) => setRequestDetails(e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      We will process your request within 30 days as required by CCPA/VCDPA regulations.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
                    <Button onClick={submitRequest} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request History */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Your Privacy Requests
          </CardTitle>
          <CardDescription>Track the status of your data subject requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No privacy requests submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="capitalize font-medium">{request.request_type.replace('_', ' ')}</div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">State Privacy Laws We Support</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We comply with major US state privacy regulations:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">CCPA (California)</Badge>
                <Badge variant="outline">VCDPA (Virginia)</Badge>
                <Badge variant="outline">CPA (Colorado)</Badge>
                <Badge variant="outline">CTDPA (Connecticut)</Badge>
                <Badge variant="outline">UCPA (Utah)</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
