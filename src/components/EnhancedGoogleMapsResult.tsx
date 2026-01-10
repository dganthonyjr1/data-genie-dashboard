import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Star, 
  Phone, 
  Globe, 
  MapPin, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Reply,
  ExternalLink
} from "lucide-react";

interface Review {
  author: string;
  rating: number;
  date: string;
  snippet: string;
  helpful_count: number;
  response?: {
    date: string;
    text: string;
  };
}

interface Competitor {
  name: string;
  rating: number | null;
  reviews_count: number | null;
  competitive_advantage: 'higher_rated' | 'lower_rated' | 'equal' | null;
}

interface RatingsBreakdown {
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  total_analyzed: number;
}

interface ReviewsSummary {
  total_fetched: number;
  positive_percentage: number;
  negative_percentage: number;
  has_owner_responses: boolean;
  common_topics?: { keyword: string; mentions: number }[];
}

interface CompetitorData {
  nearby_count: number;
  avg_competitor_rating: number | null;
  competitive_position: 'above_average' | 'below_average' | 'average' | null;
  nearby_businesses: Competitor[];
}

interface EnhancedBusinessData {
  business_name: string;
  full_address: string;
  phone_number: string;
  website_url: string;
  rating: number | null;
  reviews_count: number | null;
  ratings_breakdown?: RatingsBreakdown;
  reviews_summary?: ReviewsSummary;
  detailed_reviews?: Review[];
  type: string;
  category: string;
  place_id: string;
  hours: string | null;
  thumbnail: string;
  photos?: string[];
  price_level: string | null;
  is_open_now: boolean | null;
  service_options?: Record<string, boolean>;
  competitors?: CompetitorData;
  source_url: string;
}

interface EnhancedGoogleMapsResultProps {
  data: EnhancedBusinessData;
  index: number;
}

export function EnhancedGoogleMapsResult({ data, index }: EnhancedGoogleMapsResultProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : star - 0.5 <= rating
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getPositionColor = (position: string | null) => {
    if (position === 'above_average') return 'text-green-600';
    if (position === 'below_average') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getPositionIcon = (position: string | null) => {
    if (position === 'above_average') return <TrendingUp className="h-4 w-4" />;
    if (position === 'below_average') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
              {data.category && <Badge variant="secondary">{data.category}</Badge>}
              {data.is_open_now !== null && (
                <Badge variant={data.is_open_now ? "default" : "destructive"} className="text-xs">
                  {data.is_open_now ? "Open Now" : "Closed"}
                </Badge>
              )}
              {data.price_level && (
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {data.price_level}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{data.business_name}</CardTitle>
            {data.type && data.type !== data.category && (
              <p className="text-sm text-muted-foreground mt-1">{data.type}</p>
            )}
          </div>
          {data.thumbnail && (
            <img 
              src={data.thumbnail} 
              alt={data.business_name}
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rating & Reviews Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {renderStars(data.rating)}
              {data.reviews_count && (
                <span className="text-sm text-muted-foreground">
                  ({data.reviews_count.toLocaleString()} reviews)
                </span>
              )}
            </div>

            {/* Ratings Breakdown */}
            {data.ratings_breakdown && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Rating Distribution</p>
                {['five_star', 'four_star', 'three_star', 'two_star', 'one_star'].map((key, i) => {
                  const stars = 5 - i;
                  const count = data.ratings_breakdown?.[key as keyof RatingsBreakdown] as number || 0;
                  const total = data.ratings_breakdown?.total_analyzed || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="w-8">{stars}★</span>
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews Summary */}
          {data.reviews_summary && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Reviews Summary</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-semibold">{data.reviews_summary.positive_percentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Positive</p>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3">
                  <div className="flex items-center gap-1.5 text-red-600">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-semibold">{data.reviews_summary.negative_percentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Negative</p>
                </div>
              </div>
              {data.reviews_summary.has_owner_responses && (
                <Badge variant="outline" className="gap-1">
                  <Reply className="h-3 w-3" />
                  Owner responds to reviews
                </Badge>
              )}
              {data.reviews_summary.common_topics && data.reviews_summary.common_topics.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Common Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {data.reviews_summary.common_topics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic.keyword} ({topic.mentions})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact & Location Info */}
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          {data.full_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{data.full_address}</span>
            </div>
          )}
          {data.phone_number && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${data.phone_number}`} className="text-primary hover:underline">
                {data.phone_number}
              </a>
            </div>
          )}
          {data.website_url && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a 
                href={data.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[200px]"
              >
                {data.website_url.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </div>
          )}
          {data.hours && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{typeof data.hours === 'string' ? data.hours : 'Hours available'}</span>
            </div>
          )}
        </div>

        {/* Service Options */}
        {data.service_options && Object.keys(data.service_options).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.service_options).map(([key, value]) => (
              value && (
                <Badge key={key} variant="outline" className="text-xs">
                  {key.replace(/_/g, ' ')}
                </Badge>
              )
            ))}
          </div>
        )}

        {/* Detailed Reviews Collapsible */}
        {data.detailed_reviews && data.detailed_reviews.length > 0 && (
          <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Recent Reviews ({data.detailed_reviews.length})
                </span>
                {reviewsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <ScrollArea className="h-[300px] rounded-lg border p-3">
                <div className="space-y-4">
                  {data.detailed_reviews.map((review, i) => (
                    <div key={i} className="space-y-2 pb-4 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.author}</span>
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                      <p className="text-sm">{review.snippet}</p>
                      {review.helpful_count > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {review.helpful_count} found this helpful
                        </p>
                      )}
                      {review.response && (
                        <div className="mt-2 pl-4 border-l-2 border-primary/30">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Reply className="h-3 w-3" />
                            Owner response • {review.response.date}
                          </p>
                          <p className="text-sm mt-1">{review.response.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Competitor Analysis */}
        {data.competitors && data.competitors.nearby_count > 0 && (
          <Collapsible open={competitorsOpen} onOpenChange={setCompetitorsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Competitor Analysis ({data.competitors.nearby_count} nearby)
                </span>
                {competitorsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-4">
                  {/* Competitive Position */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Competitive Position</p>
                      <p className="text-xs text-muted-foreground">Based on rating comparison</p>
                    </div>
                    <div className={`flex items-center gap-2 font-semibold ${getPositionColor(data.competitors.competitive_position)}`}>
                      {getPositionIcon(data.competitors.competitive_position)}
                      <span className="capitalize">
                        {data.competitors.competitive_position?.replace('_', ' ') || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Average Competitor Rating */}
                  {data.competitors.avg_competitor_rating && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg. Competitor Rating</span>
                      <span className="font-medium">{data.competitors.avg_competitor_rating} ★</span>
                    </div>
                  )}

                  {/* Nearby Competitors List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Nearby Competitors</p>
                    {data.competitors.nearby_businesses.map((comp, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-2 rounded-lg border text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{comp.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {comp.rating && (
                            <span className="text-muted-foreground">
                              {comp.rating} ★ ({comp.reviews_count || 0})
                            </span>
                          )}
                          {comp.competitive_advantage === 'higher_rated' && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              You're higher
                            </Badge>
                          )}
                          {comp.competitive_advantage === 'lower_rated' && (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              They're higher
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* View on Google Maps */}
        {data.source_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={data.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Google Maps
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
