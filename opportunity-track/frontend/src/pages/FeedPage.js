/**
 * FeedPage — LinkedIn-style vertical feed with Instagram-inspired post cards.
 * Single column, max 680px, centered. Minimal actions: Share + Save only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import API from '@/lib/api';
import { toast } from 'sonner';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Newspaper, Sparkles } from 'lucide-react';

export default function FeedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await API.get('/feed');
      setItems(res.data.items || []);
    } catch (err) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback((item) => {
    const id = item.id;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Removed from saved');
      } else {
        next.add(id);
        toast.success('Saved!');
      }
      return next;
    });
  }, []);

  const handleShare = useCallback((item) => {
    const url = item.url || window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: item.title,
          url,
          text: item.description?.slice(0, 120),
        })
        .then(() => toast.success('Shared!'))
        .catch((err) => {
          if (err.name !== 'AbortError') {
            navigator.clipboard?.writeText(url);
            toast.success('Link copied to clipboard');
          }
        });
    } else {
      navigator.clipboard?.writeText(url);
      toast.success('Link copied to clipboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100" data-testid="feed-page">
      <div className="page-container py-6 lg:py-10">
        <div className="mb-8">
          <h1 className="page-title flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-orange-500" />
            Opportunities
          </h1>
          <p className="page-subtitle">
            Hackathons, programs, internships, and career events — curated for you
          </p>
        </div>

        {loading ? (
          <div className="max-w-[680px] mx-auto space-y-4">
            <SkeletonGrid count={4} variant="feed" />
          </div>
        ) : items.length === 0 ? (
          <div className="max-w-[680px] mx-auto">
            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm">
                No opportunities yet — check back soon!
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-[680px] mx-auto flex flex-col gap-4"
          >
            {items.map((item, idx) => (
              <OpportunityCard
                key={item.id || idx}
                item={item}
                index={idx}
                isSaved={savedIds.has(item.id)}
                onSave={handleSave}
                onShare={handleShare}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
