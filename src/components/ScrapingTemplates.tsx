import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Building2, ShoppingCart, Utensils, Home, Briefcase, Contact, 
  Newspaper, Calendar, Users, Mail, Phone, Link, Search, Sparkles,
  FileText, Globe
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  scrape_type: string;
  ai_instructions: string | null;
  extraction_config: any;
  icon: string | null;
  is_system: boolean;
}

interface ScrapingTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  selectedTemplateId?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'building-2': Building2,
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'home': Home,
  'briefcase': Briefcase,
  'contact': Contact,
  'newspaper': Newspaper,
  'calendar': Calendar,
  'users': Users,
  'mail': Mail,
  'phone': Phone,
  'link': Link,
  'file-text': FileText,
  'globe': Globe,
};

const categoryLabels: Record<string, string> = {
  'directories': 'Business Directories',
  'ecommerce': 'E-commerce',
  'food': 'Food & Dining',
  'real_estate': 'Real Estate',
  'jobs': 'Job Listings',
  'contacts': 'Contact Info',
  'content': 'Content',
  'events': 'Events',
  'social': 'Social Media',
  'emails': 'Email Extraction',
  'phones': 'Phone Extraction',
  'links': 'Link Extraction',
};

export const ScrapingTemplates = ({ onSelectTemplate, selectedTemplateId }: ScrapingTemplatesProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('scraping_templates')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(templates.map(t => t.category))];
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (iconName: string | null) => {
    const IconComponent = iconName ? iconMap[iconName] : Sparkles;
    return IconComponent || Sparkles;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <ScrollArea className="h-auto max-h-[300px]">
        <div className="flex gap-2 flex-wrap pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {categoryLabels[category] || category}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map(template => {
          const IconComponent = getIcon(template.icon);
          const isSelected = selectedTemplateId === template.id;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''
              }`}
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                  </div>
                  {template.is_system && (
                    <Badge variant="secondary" className="text-xs">System</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CardDescription className="text-xs line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No templates found matching your criteria
        </div>
      )}
    </div>
  );
};
