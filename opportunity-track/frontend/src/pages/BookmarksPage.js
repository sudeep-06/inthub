/**
 * BookmarksPage — refactored to use IntHub design system.
 * All visual tokens come from @/styles/design-system.js.
 */
import { useState, useEffect } from 'react';
import API from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bookmark, Trash2, MapPin, Building2, ExternalLink, Loader2 } from 'lucide-react';
import { ds } from '@/styles/design-system';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBookmarks(); }, []);

  const loadBookmarks = async () => {
    try {
      const res = await API.get('/bookmarks');
      setBookmarks(res.data.bookmarks || []);
    } catch (err) {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (internshipId) => {
    try {
      await API.delete(`/bookmarks/${internshipId}`);
      setBookmarks(prev => prev.filter(b => b.internship_id !== internshipId));
      toast.success('Bookmark removed');
    } catch (err) {
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className={ds.tw.spinner} />
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="bookmarks-page">
      <div className="mb-6">
        <h1 className="page-title">Bookmarks</h1>
        <p className="page-subtitle">
          {bookmarks.length} saved internship{bookmarks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            style={{ color: ds.colors.textSecondary }}
          />
          <p style={{ color: ds.colors.textSecondary }}>
            No bookmarks yet. Save internships you're interested in.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="bookmarks-grid">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className={`${ds.tw.card} ${ds.tw.cardHover} overflow-hidden`}
              style={{ borderRadius: ds.radius.card, boxShadow: ds.shadow.card }}
              data-testid={`bookmark-${bm.internship_id}`}
            >
              {/* Card body */}
              <div className="p-5">
                {/* Title + remote badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-sm line-clamp-2"
                      style={{ color: ds.colors.textPrimary, fontFamily: ds.font.family }}
                    >
                      {bm.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: ds.colors.textSecondary }}>
                      <Building2 className="w-3 h-3" />
                      <span>{bm.company}</span>
                    </div>
                  </div>
                  {bm.remote && (
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0"
                      style={{ borderRadius: ds.radius.badge, color: ds.colors.primary, borderColor: ds.colors.primary }}
                    >
                      Remote
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs mb-3" style={{ color: ds.colors.textSecondary }}>
                  <MapPin className="w-3 h-3" />
                  <span>{bm.location || 'Not specified'}</span>
                </div>

                {/* Tags */}
                {bm.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bm.tags.slice(0, 3).map((tag, i) => (
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
              </div>

              {/* Actions footer */}
              <div
                className="flex items-center gap-2 px-5 py-3 border-t"
                style={{ background: '#f8fafc', borderTop: `1px solid ${ds.colors.border}` }}
              >
                {/* Primary: Apply — orange */}
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-[10px] ${ds.tw.primaryBtn}`}
                  onClick={() => window.open(bm.url, '_blank', 'noopener,noreferrer')}
                  data-testid="bookmark-apply-btn"
                >
                  <ExternalLink className="w-3 h-3" />
                  Apply
                </button>

                {/* Remove */}
                <button
                  className={`h-8 w-8 flex items-center justify-center rounded-[10px] ${ds.tw.dangerBtn}`}
                  onClick={() => removeBookmark(bm.internship_id)}
                  data-testid="remove-bookmark-btn"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
