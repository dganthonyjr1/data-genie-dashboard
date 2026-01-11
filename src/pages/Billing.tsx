import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Calendar, Receipt, Crown, Zap, ArrowUpRight, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface UserPlan {
  id: string;
  plan_name: string;
  status: string;
  started_at: string;
  expires_at: string | null;
}

interface Payment {
  id: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const Billing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Fetch user plan
      const { data: planData, error: planError } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (planError && planError.code !== "PGRST116") {
        console.error("Error fetching plan:", planError);
      } else {
        setUserPlan(planData);
      }

      // Fetch payment history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      } else {
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case "enterprise":
        return <Crown className="h-6 w-6 text-fuchsia-400" />;
      case "pro":
        return <Zap className="h-6 w-6 text-cyan-400" />;
      default:
        return <CreditCard className="h-6 w-6 text-slate-400" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case "enterprise":
        return "from-purple-500 to-fuchsia-400";
      case "pro":
        return "from-cyan-500 to-cyan-400";
      default:
        return "from-slate-500 to-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount / 100);
  };

  const currentPlan = userPlan?.plan_name || "Free";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and view payment history
          </p>
        </div>

        {/* Current Plan Card */}
        <Card className={`border-2 ${currentPlan.toLowerCase() === "pro" ? "border-cyan-500/30" : currentPlan.toLowerCase() === "enterprise" ? "border-fuchsia-500/30" : "border-border/50"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getPlanColor(currentPlan)} flex items-center justify-center`}>
                  {getPlanIcon(currentPlan)}
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Current Plan
                    {loading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <Badge className={`bg-gradient-to-r ${getPlanColor(currentPlan)} text-white`}>
                        {currentPlan}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {loading ? (
                      <Skeleton className="h-4 w-48 mt-1" />
                    ) : userPlan?.status === "active" ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Active subscription
                      </span>
                    ) : (
                      "No active subscription"
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => navigate("/pricing")}
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-white"
              >
                {currentPlan === "Free" ? "Upgrade Plan" : "Change Plan"}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {loading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : userPlan?.started_at ? (
                      format(new Date(userPlan.started_at), "MMM d, yyyy")
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Renews</p>
                  <p className="font-medium">
                    {loading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : userPlan?.expires_at ? (
                      format(new Date(userPlan.expires_at), "MMM d, yyyy")
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    {loading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      userPlan?.status || "Free tier"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              View all your past transactions and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No payment history yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/pricing")}
                >
                  View Plans
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPlanIcon(payment.plan_name)}
                          <span>ScrapeX {payment.plan_name} Plan</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          {getStatusBadge(payment.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:border-cyan-500/50 transition-colors cursor-pointer" onClick={() => navigate("/pricing")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Upgrade Your Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Get more credits and unlock premium features
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-fuchsia-500/50 transition-colors cursor-pointer" onClick={() => navigate("/settings")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Payment Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your payment methods and preferences
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
