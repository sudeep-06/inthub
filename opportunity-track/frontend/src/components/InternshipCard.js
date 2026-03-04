/**
 * InternshipCard — memoized with Framer Motion animations.
 * Hover lift, fade-in entrance, and design system tokens.
 */
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, MapPin, ExternalLink, Building2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ds } from '@/styles/design-system';

/* Compat score → style token from design system */
function compatStyle(score) {
  if (score >= 70) return ds.colors.compatHigh;
  if (score >= 40) return ds.colors.compatMed;
  return ds.colors.compatLow;
}

export const InternshipCard = memo(function InternshipCard({
  internship,
  isBookmarked,
  isApplied,
  onBookmark,
  onApply,
  onAnalyze,
  index = 0,
}) {
  const { title, company, location, remote, tags, description, source } = internship;
  const compatibility_score = Math.round(internship.compatibility_score || 0);
  const compat = compatStyle(compatibility_score);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        boxShadow: ds.shadow.hover,
        borderColor: 'rgba(249,115,22,0.2)',
      }}
      className="internship-card"
      style={{ borderRadius: ds.radius.card, willChange: 'transform' }}
      data-testid={`internship-card-${internship.internship_id}`}
    >
      {/* Card body */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm leading-snug line-clamp-2"
              style={{ color: ds.colors.textPrimary, fontFamily: ds.font.family }}
            >
              {title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5" style={{ color: ds.colors.textSecondary }}>
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate">{company}</span>
            </div>
          </div>

          {/* Compat badge */}
          <div
            className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: compat.bg, color: compat.text, borderRadius: ds.radius.badge }}
          >
            {compatibility_score}%
          </div>
        </div>

        {/* Location + remote + source */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ color: ds.colors.textSecondary, borderRadius: ds.radius.badge, background: '#f1f5f9' }}
          >
            <MapPin className="w-3 h-3" />
            {location || 'Not specified'}
          </div>
          {remote && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderRadius: ds.radius.badge, color: ds.colors.primary, borderColor: ds.colors.primary }}
            >
              Remote
            </Badge>
          )}
          {source && (
            <Badge
              variant="outline"
              className={ds.tw.sourceBadge}
              style={{ borderRadius: ds.radius.badge }}
            >
              {source}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, i) => (
              <Badge
                key={i}
                variant="outline"
                className={ds.tw.tagBadge}
                style={{ borderRadius: ds.radius.badge }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: ds.colors.textSecondary }}>
            {description}
          </p>
        )}
      </div>

      {/* Card footer actions */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-t"
        style={{ background: '#f8fafc', borderTop: `1px solid ${ds.colors.border}` }}
      >
        {/* Apply Now */}
        <Button
          size="sm"
          className={`flex-1 h-8 text-xs font-medium ${ds.tw.primaryBtn}`}
          style={{ borderRadius: ds.radius.button }}
          onClick={() => window.open(internship.apply_url, '_blank', 'noopener,noreferrer')}
          data-testid="apply-external-btn"
        >
          <ExternalLink className="w-3 h-3 mr-1.5" />
          Apply Now
        </Button>

        {/* Analyze */}
        {onAnalyze && (
          <Button
            variant="outline"
            size="sm"
            className={`h-8 text-xs font-medium gap-1 ${ds.tw.outlineBtn}`}
            style={{ borderRadius: ds.radius.button }}
            onClick={() => onAnalyze(internship)}
            data-testid="analyze-skills-btn"
          >
            <Sparkles className="w-3 h-3" style={{ color: ds.colors.primary }} />
            Analyze
          </Button>
        )}

        {/* Bookmark */}
        {onBookmark && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 ${ds.tw.ghostBtn}`}
            style={{ borderRadius: ds.radius.button }}
            onClick={() => onBookmark(internship)}
            data-testid="bookmark-btn"
          >
            {isBookmarked
              ? <BookmarkCheck className="w-4 h-4" style={{ color: ds.colors.primary }} />
              : <Bookmark className="w-4 h-4" style={{ color: ds.colors.textSecondary }} />}
          </Button>
        )}

        {/* Track application */}
        {onApply && !isApplied && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 ${ds.tw.ghostBtn}`}
            style={{ borderRadius: ds.radius.button }}
            onClick={() => onApply(internship)}
            data-testid="track-apply-btn"
          >
            <Clock className="w-4 h-4" style={{ color: ds.colors.textSecondary }} />
          </Button>
        )}
      </div>
    </motion.div>
  );
});
