import { useState, useEffect } from 'react';
import API from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Loader2, ExternalLink, Sparkles, Calendar, MapPin, Building2, Newspaper
} from 'lucide-react';

export default function FeedPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadFeed(); }, []);

    const loadFeed = async () => {
        try {
            const res = await API.get('/feed');
            setItems(res.data.items || []);
        } catch (err) {
            toast.error('Failed to load feed');
        } finally {
            setLoading(false);
        }
    };

    const typeColors = {
        hackathon: 'bg-violet-100 text-violet-700 border-violet-200',
        internship: 'bg-orange-100 text-orange-700 border-orange-200',
        program: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        event: 'bg-amber-100 text-amber-700 border-amber-200',
        article: 'bg-pink-100 text-pink-700 border-pink-200',
        announcement: 'bg-sky-100 text-sky-700 border-sky-200',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="page-container" data-testid="feed-page">
            <div className="mb-8">
                <h1 className="page-title flex items-center gap-2">
                    <Newspaper className="w-7 h-7 text-orange-500" />
                    Feed
                </h1>
                <p className="page-subtitle">
                    Hackathons, internship announcements, tech programs, and career events
                </p>
            </div>

            {items.length === 0 ? (
                <Card className="p-12 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No feed items yet — check back soon!</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {items.map((item, idx) => (
                        <div
                            key={item.id || idx}
                            className={`feed-card animate-slide-up stagger-${Math.min(idx + 1, 6)}`}
                        >
                            {/* Type badge + source */}
                            <div className="flex items-center justify-between mb-3">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold uppercase tracking-wider ${typeColors[item.type] || 'bg-secondary text-foreground'}`}
                                >
                                    {item.type}
                                </Badge>
                                {item.source && (
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {item.source}
                                    </span>
                                )}
                            </div>

                            {/* Company + title */}
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                                        {item.title}
                                    </h3>
                                    {item.company && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{item.company}</p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            {item.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                                    {item.description}
                                </p>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
                                {item.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {item.location}
                                    </span>
                                )}
                                {item.date && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {item.date}
                                    </span>
                                )}
                            </div>

                            {/* Skills tags */}
                            {item.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {item.skills.slice(0, 4).map(skill => (
                                        <Badge key={skill} variant="secondary" className="text-[10px] font-normal">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* ── ONLY ACTION: Explore ── */}
                            {item.url && (
                                <div className="pt-3 border-t">
                                    <button
                                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
                                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Explore
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
