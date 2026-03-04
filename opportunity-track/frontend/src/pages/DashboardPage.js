import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import API from '@/lib/api';
import {
  FileText, CheckCircle2, XCircle, Clock, Bookmark,
  TrendingUp, ArrowRight, Loader2, AlertCircle,
  Building2, MapPin, Briefcase
} from 'lucide-react';

const statCards = [
  { key: 'total_applications', label: 'Total Applied', icon: FileText, gradient: 'from-orange-500 to-orange-600' },
  { key: 'applied', label: 'Pending', icon: Clock, gradient: 'from-amber-400 to-amber-500' },
  { key: 'interviewing', label: 'Interviewing', icon: TrendingUp, gradient: 'from-violet-500 to-violet-600' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, gradient: 'from-red-400 to-red-500' },
  { key: 'bookmarks_count', label: 'Saved', icon: Bookmark, gradient: 'from-sky-400 to-sky-500' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, recsRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/recommendations'),
      ]);
      setStats(statsRes.data);
      setRecommendations(recsRes.data.recommendations || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
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
    <div className="page-container" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="page-subtitle">Track your internship applications and discover new opportunities</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8" data-testid="stats-grid">
        {statCards.map(({ key, label, icon: Icon, gradient }, idx) => (
          <div
            key={key}
            className={`stat-card animate-slide-up stagger-${idx + 1}`}
            data-testid={`stat-${key}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {stats?.[key] ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <Card className="lg:col-span-2" data-testid="recent-applications-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/applications')} data-testid="view-all-apps-btn">
              View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recent_applications?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_applications.map((app, i) => (
                  <div key={app.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span>{app.company}</span>
                        <span className="text-border">|</span>
                        <MapPin className="w-3 h-3" />
                        <span>{app.location}</span>
                      </div>
                    </div>
                    <Badge
                      variant={app.status === 'accepted' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                      className="capitalize text-xs"
                      data-testid={`app-status-${app.id}`}
                    >
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No applications yet</p>
                <Button variant="link" size="sm" onClick={() => navigate('/internships')} data-testid="explore-btn">
                  Explore internships
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card data-testid="recommendations-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Profile Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/50">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Button
              variant="outline"
              className="w-full rounded-full text-sm"
              onClick={() => navigate('/profile')}
              data-testid="complete-profile-btn"
            >
              Complete your profile
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookmarks */}
      {stats?.recent_bookmarks?.length > 0 && (
        <Card className="mt-6" data-testid="recent-bookmarks-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recently Bookmarked</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/bookmarks')} data-testid="view-all-bookmarks-btn">
              View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recent_bookmarks.slice(0, 3).map((bm, i) => (
                <div key={bm.id || i} className="p-3 rounded-lg border hover:shadow-sm transition-shadow">
                  <p className="text-sm font-medium truncate">{bm.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{bm.company} - {bm.location}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
