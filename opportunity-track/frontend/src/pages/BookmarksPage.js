import { useState, useEffect } from 'react';
import API from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Bookmark, Trash2, MapPin, Building2, ExternalLink, Loader2
} from 'lucide-react';

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="bookmarks-page">
      <div className="mb-6">
        <h1 className="page-title">Bookmarks</h1>
        <p className="page-subtitle">{bookmarks.length} saved internship{bookmarks.length !== 1 ? 's' : ''}</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No bookmarks yet. Save internships you're interested in.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="bookmarks-grid">
          {bookmarks.map((bm) => (
            <Card key={bm.id} className="hover:shadow-md transition-shadow" data-testid={`bookmark-${bm.internship_id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {bm.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span>{bm.company}</span>
                    </div>
                  </div>
                  {bm.remote && <Badge variant="secondary" className="text-xs shrink-0">Remote</Badge>}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{bm.location || 'Not specified'}</span>
                </div>

                {bm.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bm.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-full"
                    onClick={() => window.open(bm.url, '_blank')}
                    data-testid="bookmark-apply-btn"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeBookmark(bm.internship_id)}
                    data-testid="remove-bookmark-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
