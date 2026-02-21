import { Bookmark, BookmarkCheck, MapPin, ExternalLink, Building2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function compatClass(score) {
  if (score >= 70) return 'compat-high';
  if (score >= 40) return 'compat-medium';
  return 'compat-low';
}

export function InternshipCard({
  internship,
  isBookmarked,
  isApplied,
  onBookmark,
  onApply,
  onAnalyze,
}) {
  const { title, company, location, remote, tags, description, source } = internship;
  const compatibility_score = Math.round(internship.compatibility_score || 0);

  return (
    <div className="internship-card" data-testid={`internship-card-${internship.internship_id}`}>
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{title}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate">{company}</span>
            </div>
          </div>
          <div className={`compat-badge ${compatClass(compatibility_score)}`}>
            {compatibility_score}%
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/80 rounded-lg px-2 py-1">
            <MapPin className="w-3 h-3" />
            {location || 'Not specified'}
          </div>
          {remote && <Badge variant="secondary" className="text-xs rounded-lg">Remote</Badge>}
          {source && <Badge variant="outline" className="text-[10px] rounded-lg capitalize opacity-60">{source}</Badge>}
        </div>

        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] rounded-lg font-normal">{tag}</Badge>
            ))}
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t bg-secondary/20">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs rounded-lg font-medium"
          onClick={() => window.open(internship.apply_url, '_blank')}
          data-testid="apply-external-btn"
        >
          <ExternalLink className="w-3 h-3 mr-1.5" />
          Apply Now
        </Button>
        {onAnalyze && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-lg font-medium gap-1"
            onClick={() => onAnalyze(internship)}
            data-testid="analyze-skills-btn"
          >
            <Sparkles className="w-3 h-3" />
            Analyze
          </Button>
        )}
        {onBookmark && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={() => onBookmark(internship)}
            data-testid="bookmark-btn"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
        )}
        {onApply && !isApplied && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={() => onApply(internship)}
            data-testid="track-apply-btn"
          >
            <Clock className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
