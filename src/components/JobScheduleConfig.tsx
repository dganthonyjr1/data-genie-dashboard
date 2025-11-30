import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobScheduleConfigProps {
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleInterval: number;
  onScheduleEnabledChange: (enabled: boolean) => void;
  onScheduleFrequencyChange: (frequency: string) => void;
  onScheduleIntervalChange: (interval: number) => void;
}

export function JobScheduleConfig({
  scheduleEnabled,
  scheduleFrequency,
  scheduleInterval,
  onScheduleEnabledChange,
  onScheduleFrequencyChange,
  onScheduleIntervalChange,
}: JobScheduleConfigProps) {
  const getNextRunDescription = () => {
    if (!scheduleEnabled) return null;

    const intervalText = scheduleInterval > 1 ? scheduleInterval : "";
    const frequencyText = scheduleFrequency === "hourly" ? "hour" : scheduleFrequency === "daily" ? "day" : "week";
    const pluralText = scheduleInterval > 1 ? "s" : "";

    return `This job will run every ${intervalText} ${frequencyText}${pluralText}`;
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Job
            </CardTitle>
            <CardDescription>
              Automatically run this job at regular intervals
            </CardDescription>
          </div>
          <Switch
            checked={scheduleEnabled}
            onCheckedChange={onScheduleEnabledChange}
            aria-label="Enable schedule"
          />
        </div>
      </CardHeader>

      {scheduleEnabled && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={onScheduleFrequencyChange}>
                <SelectTrigger id="frequency" className="bg-background">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="hourly">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Hourly</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Daily</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Weekly</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">
                Interval ({scheduleFrequency === "hourly" ? "hours" : scheduleFrequency === "daily" ? "days" : "weeks"})
              </Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max={scheduleFrequency === "hourly" ? "24" : scheduleFrequency === "daily" ? "30" : "52"}
                value={scheduleInterval}
                onChange={(e) => onScheduleIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-background"
              />
            </div>
          </div>

          <Alert className="bg-blue-500/10 border-blue-500/20">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              {getNextRunDescription()}. The first run will start immediately when you create the job.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
