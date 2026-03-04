/**
 * OpportunityCard — LinkedIn-style post card with Instagram polish.
 * Minimal action bar: Share + Save only. AI-premium aesthetic.
 */
import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─── Type badge colors ───────────────────────────────────────────── */
const typeColors = {
  hackathon: 'bg-violet-100 text-violet-700',
  internship: 'bg-orange-100 text-orange-700',
  program: 'bg-emerald-100 text-emerald-700',
  event: 'bg-amber-100 text-amber-700',
  article: 'bg-pink-100 text-pink-700',
  announcement: 'bg-sky-100 text-sky-700',
};

const typeLabels = {
  hackathon: 'Hackathon',
  internship: 'Internship',
  program: 'Program',
  event: 'Event',
  article: 'Article',
  announcement: 'Announcement',
};

function OrgLogo({ company }) {
  const initial = (company || 'O').charAt(0).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      }}
    >
      {initial}
    </div>
  );
}

export const OpportunityCard = memo(function OpportunityCard({
  item,
  index = 0,
  isSaved,
  onSave,
  onShare,
  onVisit,
}) {
  const [expanded, setExpanded] = useState(false);
  const { id, type, title, company, description, date, skills, url, source } = item;

  const toggleExpand = useCallback((e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const handleSave = useCallback(
    (e) => {
      e.stopPropagation();
      onSave?.(item);
    },
    [item, onSave]
  );

  const handleShare = useCallback(
    (e) => {
      e.stopPropagation();
      if (onShare) {
        onShare(item);
      } else if (url && navigator.share) {
        navigator.share({
          title,
          url,
          text: description?.slice(0, 100),
        }).catch(() => {
          navigator.clipboard?.writeText(url);
        });
      } else if (url) {
        navigator.clipboard?.writeText(url);
      }
    },
    [item, title, description, url, onShare]
  );

  const handleVisit = useCallback(
    (e) => {
      e.stopPropagation();
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      onVisit?.(item);
    },
    [item, url, onVisit]
  );

  const typeStyle = typeColors[type] || 'bg-gray-100 text-gray-700';
  const typeLabel = typeLabels[type] || type;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.25),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative bg-white rounded-2xl shadow-sm overflow-hidden
        hover:shadow-md hover:-translate-y-1
        transition-all duration-200 ease-in-out"
      data-testid={`opportunity-card-${id}`}
    >
      {/* AI gradient accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%)' }}
        aria-hidden
      />

      <div className="pl-5 pr-4 py-4">
        {/* ── Header: logo, org, timestamp, badge, menu ── */}
        <div className="flex items-start gap-3 mb-4">
          <OrgLogo company={company} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 truncate">
                {company || source || 'Organization'}
              </span>
              <span className="text-xs text-gray-500 shrink-0">{date || ''}</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeStyle}`}
              >
                {typeLabel}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
                  transition-all duration-200 ease-in-out"
                aria-label="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleVisit}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit website
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Main content ── */}
        <div
          className="cursor-pointer"
          onClick={handleVisit}
        >
          <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2">
            {title}
          </h3>

          {description && (
            <div className="mb-3">
              <p
                className={`text-sm text-gray-600 leading-relaxed ${
                  expanded ? '' : 'line-clamp-3'
                }`}
              >
                {description}
              </p>
              {description.length > 120 && (
                <button
                  onClick={toggleExpand}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600
                    hover:text-blue-700 mt-1 transition-colors duration-200"
                >
                  {expanded ? (
                    <>
                      See less <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      See more <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Cover image (optional — if API adds it later) */}
          {item.image && (
            <div className="rounded-xl overflow-hidden mb-3 -mx-1">
              <img
                src={item.image}
                alt=""
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* ── Skills / Tags ── */}
          {skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-sm
                    bg-gray-100 text-gray-700 hover:bg-gray-200
                    transition-all duration-200 ease-in-out"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom action bar: Share + Save only ── */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg
              text-gray-600 hover:text-gray-900 hover:bg-gray-100
              transition-all duration-200 ease-in-out
              active:scale-[0.98]"
            data-testid="share-btn"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg
              text-gray-600 hover:text-gray-900 hover:bg-gray-100
              transition-all duration-200 ease-in-out
              active:scale-[0.98]"
            data-testid="save-btn"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600" />
                <span className="text-sm font-medium text-blue-600">Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span className="text-sm font-medium">Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
});
