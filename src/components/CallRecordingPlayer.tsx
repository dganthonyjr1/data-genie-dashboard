import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Download, ExternalLink, X, Loader2, Phone, MapPin, Hash, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface CallRecordingPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  recordingUrl: string | null;
  callData: {
    facility_name: string;
    phone_number: string;
    duration?: number;
    outcome?: string;
    notes?: any;
    created_at: string;
    lead_score?: number | null;
    status?: string;
    state?: string;
    call_id?: string;
  };
}

const CallRecordingPlayer = ({ isOpen, onClose, recordingUrl, callData }: CallRecordingPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProxying, setIsProxying] = useState(false);
  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse notes for transcript and analysis
  const parsedNotes = (() => {
    if (!callData.notes) return null;
    try {
      return typeof callData.notes === 'string' ? JSON.parse(callData.notes) : callData.notes;
    } catch {
      return null;
    }
  })();

  const transcript = parsedNotes?.transcript;
  const callAnalysis = parsedNotes?.call_analysis;
  const callSummary = parsedNotes?.call_summary || callAnalysis?.call_summary;
  const userSentiment = parsedNotes?.user_sentiment || callAnalysis?.user_sentiment;

  const inferAudioMimeType = (url: string) => {
    const pathname = (() => {
      try {
        return new URL(url).pathname.toLowerCase();
      } catch {
        return url.toLowerCase();
      }
    })();

    if (pathname.endsWith('.wav')) return 'audio/wav';
    if (pathname.endsWith('.mp3')) return 'audio/mpeg';
    if (pathname.endsWith('.m4a')) return 'audio/mp4';
    if (pathname.endsWith('.ogg')) return 'audio/ogg';
    return undefined;
  };

  // Fetch via proxy to avoid CORS issues
  useEffect(() => {
    if (!isOpen || !recordingUrl) {
      setProxiedUrl(null);
      return;
    }

    let blobUrlToCleanup: string | null = null;

    const buildProxyUrl = async () => {
      setIsProxying(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const proxyUrl = `${supabaseUrl}/functions/v1/proxy-recording`;

        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          },
          body: JSON.stringify({ url: recordingUrl }),
        });

        if (!response.ok) {
          throw new Error(`Failed to load recording: ${response.status}`);
        }

        const blob = await response.blob();
        const inferredType = inferAudioMimeType(recordingUrl);

        // If the server returns application/octet-stream, browsers may refuse to decode audio.
        const normalizedBlob = (!blob.type || blob.type.includes('application/octet-stream')) && inferredType
          ? new Blob([blob], { type: inferredType })
          : blob;

        const blobUrl = URL.createObjectURL(normalizedBlob);
        blobUrlToCleanup = blobUrl;

        setProxiedUrl(blobUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recording');
      } finally {
        setIsProxying(false);
      }
    };

    buildProxyUrl();

    return () => {
      if (blobUrlToCleanup) {
        URL.revokeObjectURL(blobUrlToCleanup);
      }
    };
  }, [isOpen, recordingUrl]);

  useEffect(() => {
    if (isOpen && audioRef.current && proxiedUrl) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);

      audio.load();
      setIsLoading(true);
    }
  }, [isOpen, proxiedUrl]);

  // Attach audio event listeners when the audio element exists
  useEffect(() => {
    if (!isOpen || !proxiedUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleLoadedData = () => {
      // Fallback in case some browsers don't fire loadedmetadata as expected
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError(`Failed to load recording: ${audio.error?.message || 'Unknown error'}`);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isOpen, proxiedUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading || isProxying) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      await audio.play();
      setIsPlaying(true);
    } catch {
      setError('Playback failed. Try clicking Play again (browser blocked audio).');
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeBadge = (outcome: string | undefined) => {
    switch (outcome) {
      case 'interested':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Interested</Badge>;
      case 'not_interested':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Not Interested</Badge>;
      case 'voicemail':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Voicemail</Badge>;
      case 'callback_requested':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Callback Requested</Badge>;
      default:
        return <Badge variant="outline">{outcome || 'Unknown'}</Badge>;
    }
  };

  const getSentimentBadge = (sentiment: string | undefined) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Negative</Badge>;
      case 'neutral':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Neutral</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Call Recording - {callData.facility_name}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Call Details Grid */}
          <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{callData.phone_number}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Lead Score</p>
                <p className="text-sm font-medium">
                  {callData.lead_score !== null && callData.lead_score !== undefined ? (
                    <span className={callData.lead_score >= 70 ? 'text-green-400' : callData.lead_score >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                      {callData.lead_score}/100
                    </span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </p>
              </div>
            </div>
            
            {callData.state && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">State</p>
                  <p className="text-sm font-medium">{callData.state}</p>
                </div>
              </div>
            )}
            
            {callData.duration !== undefined && (
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{formatTime(callData.duration)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            {getOutcomeBadge(callData.outcome)}
            {userSentiment && getSentimentBadge(userSentiment)}
            {callData.status && callData.status !== 'completed' && (
              <Badge variant="outline" className="capitalize">{callData.status}</Badge>
            )}
          </div>

          {/* Error Display */}
          {callData.status === 'error' && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Call Failed</p>
                <p className="text-xs text-muted-foreground">There was an error processing this call</p>
              </div>
            </div>
          )}

          {/* Audio Player */}
          {recordingUrl ? (
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              {proxiedUrl && <audio ref={audioRef} src={proxiedUrl} preload="metadata" />}
              
              {isProxying ? (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading recording...</span>
                </div>
              ) : isLoading && proxiedUrl ? (
                <div className="text-center py-4 text-muted-foreground">Preparing playback...</div>
              ) : error ? (
                <div className="text-center py-4 text-red-400">{error}</div>
              ) : (
                <>
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={togglePlayPause}
                        className="h-10 w-10"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </Button>

                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={toggleMute}>
                          {isMuted ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.1}
                          onValueChange={handleVolumeChange}
                          className="w-24"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(recordingUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={recordingUrl} download={`call-${callData.facility_name}.mp3`}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-8 text-center">
              <Volume2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No recording available for this call</p>
            </div>
          )}

          {/* Call Summary */}
          {callSummary && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Call Summary</h4>
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                {callSummary}
              </p>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Transcript</h4>
              <ScrollArea className="h-48 bg-muted/30 rounded-lg">
                <div className="p-3 space-y-2 text-sm">
                  {Array.isArray(transcript) ? (
                    transcript.map((entry: any, index: number) => (
                      <div key={index} className={`${entry.role === 'agent' ? 'text-primary' : 'text-foreground'}`}>
                        <span className="font-medium">{entry.role === 'agent' ? 'Agent: ' : 'Customer: '}</span>
                        <span className="text-muted-foreground">{entry.content}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">{transcript}</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Call Analysis */}
          {callAnalysis && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">AI Analysis</h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                {callAnalysis.in_voicemail !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voicemail:</span>
                    <span>{callAnalysis.in_voicemail ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {callAnalysis.call_successful !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Successful:</span>
                    <span className={callAnalysis.call_successful ? 'text-green-400' : 'text-red-400'}>
                      {callAnalysis.call_successful ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {callAnalysis.agent_task_completion_rating && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Task Completion:</span>
                    <span>{callAnalysis.agent_task_completion_rating}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallRecordingPlayer;
