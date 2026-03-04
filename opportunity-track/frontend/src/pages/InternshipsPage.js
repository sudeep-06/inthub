import { useState, useEffect, useCallback } from 'react';
import API from '@/lib/api';
import { InternshipCard } from '@/components/InternshipCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import AutocompleteMultiSelect from '@/components/ui/AutocompleteMultiSelect';
import { toast } from 'sonner';
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, BookOpen, X, ExternalLink
} from 'lucide-react';
import { SKILLS } from '@/data/skills';
import { ROLES } from '@/data/roles';
import { LOCATIONS } from '@/data/locations';
import { ds } from '@/styles/design-system';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';

// Combined search suggestions: roles + skills + locations
const SEARCH_SUGGESTIONS = [
  ...ROLES.slice(0, 20),
  ...SKILLS.slice(0, 30),
  ...LOCATIONS.slice(0, 15),
];


export default function InternshipsPage() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [location, setLocation] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const fetchInternships = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (location) params.location = location;
      if (remoteFilter !== 'all') params.remote = remoteFilter;

      const [intRes, bmRes, appRes] = await Promise.all([
        API.get('/internships', { params }),
        API.get('/bookmarks'),
        API.get('/applications'),
      ]);

      setInternships(intRes.data.internships || []);
      setHasNext(intRes.data.has_next || false);
      setBookmarkedIds(new Set((bmRes.data.bookmarks || []).map(b => b.internship_id)));
      setAppliedIds(new Set((appRes.data.applications || []).map(a => a.internship_id)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load internships');
    } finally {
      setLoading(false);
    }
  }, [page, search, location, remoteFilter]);

  useEffect(() => { fetchInternships(); }, [fetchInternships]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleBookmark = async (intern) => {
    try {
      if (bookmarkedIds.has(intern.internship_id)) {
        await API.delete(`/bookmarks/${intern.internship_id}`);
        setBookmarkedIds(prev => { const n = new Set(prev); n.delete(intern.internship_id); return n; });
        toast.success('Bookmark removed');
      } else {
        await API.post('/bookmarks', {
          internship_id: intern.internship_id,
          title: intern.title,
          company: intern.company,
          location: intern.location,
          url: intern.apply_url,
          description: intern.description,
          tags: intern.tags,
          remote: intern.remote,
        });
        setBookmarkedIds(prev => new Set(prev).add(intern.internship_id));
        toast.success('Bookmarked!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bookmark action failed');
    }
  };

  const handleTrackApply = async (intern) => {
    try {
      await API.post('/applications', {
        internship_id: intern.internship_id,
        title: intern.title,
        company: intern.company,
        location: intern.location,
        url: intern.apply_url,
        status: 'applied',
      });
      setAppliedIds(prev => new Set(prev).add(intern.internship_id));
      toast.success('Application tracked!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to track application');
    }
  };

  const handleAnalyze = async (intern) => {
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisData({ internship: intern });
    try {
      const res = await API.post('/recommendations/analyze', {
        required_skills: intern.required_skills || [],
        title: intern.title || '',
        location: intern.location || '',
      });
      setAnalysisData({ internship: intern, analysis: res.data });
    } catch (err) {
      toast.error('Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="page-container" data-testid="internships-page">
      <div className="mb-6">
        <h1 className="page-title">Openings</h1>
        <p className="page-subtitle">Discover real-time opportunities matched to your skills</p>
      </div>

      {/* Quick-filter chips — Data & AI ecosystem */}
      <div className="flex flex-wrap gap-2 mb-4" data-testid="quick-filters">
        {[
          { label: '🤖 AI / ML', term: 'machine learning' },
          { label: '📊 Data Science', term: 'data scientist' },
          { label: '📈 Analytics', term: 'data analyst' },
          { label: '🧠 Deep Learning', term: 'deep learning' },
          { label: '💬 NLP / LLM', term: 'natural language processing' },
          { label: '👁️ Computer Vision', term: 'computer vision' },
          { label: '✨ Generative AI', term: 'generative ai' },
          { label: '🗄️ Data Engineering', term: 'data engineer' },
          { label: '🐍 Python', term: 'python' },
          { label: '🗃️ SQL', term: 'sql' },
        ].map(({ label, term }) => (
          <button
            key={term}
            onClick={() => { setSearchInput(term); setSearch(term); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${search === term
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white dark:bg-secondary text-muted-foreground border-border hover:border-orange-400 hover:text-orange-500'
              }`}
            data-testid={`chip-${term.replace(/\s+/g, '-')}`}
          >
            {label}
          </button>
        ))}
        {search && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all duration-150"
            data-testid="chip-clear"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6" data-testid="filters-bar">
        {/* Smart search bar */}
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1">
            <AutocompleteMultiSelect
              options={SEARCH_SUGGESTIONS}
              value={searchInput}
              onChange={(val) => setSearchInput(val)}
              placeholder="Search by role, skill, or keyword…"
              multiSelect={false}
              allowCustom={true}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button
            type="submit"
            data-testid="search-btn"
            className={`shrink-0 ${ds.tw.primaryBtn}`}
            style={{ borderRadius: ds.radius.button }}
          >
            Search
          </Button>
        </form>
        {/* Location filter */}
        <div className="w-full sm:w-52">
          <AutocompleteMultiSelect
            options={LOCATIONS}
            value={location}
            onChange={(val) => { setLocation(val); setPage(1); }}
            placeholder="Location…"
            multiSelect={false}
            allowCustom={true}
          />
        </div>
        {/* Remote filter */}
        <Select value={remoteFilter} onValueChange={v => { setRemoteFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36" data-testid="remote-filter">
            <SelectValue placeholder="Work type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="true">Remote</SelectItem>
            <SelectItem value="false">On-site</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      {(search || location || remoteFilter !== 'all') && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="active-filters">
          {search && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setSearch(''); setSearchInput(''); }}>
              Search: {search} <X className="w-3 h-3" />
            </Badge>
          )}
          {location && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setLocation('')}>
              Location: {location} <X className="w-3 h-3" />
            </Badge>
          )}
          {remoteFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setRemoteFilter('all')}>
              {remoteFilter === 'true' ? 'Remote' : 'On-site'} <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={6} variant="internship" />
      ) : internships.length === 0 ? (
        <div className="text-center py-20" data-testid="no-results">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No internships found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{internships.length} results on page {page}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="internships-grid">
            {internships.map((intern, idx) => (
              <InternshipCard
                key={intern.internship_id}
                internship={intern}
                index={idx}
                isBookmarked={bookmarkedIds.has(intern.internship_id)}
                isApplied={appliedIds.has(intern.internship_id)}
                onBookmark={handleBookmark}
                onApply={handleTrackApply}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-8" data-testid="pagination">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              data-testid="prev-page-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage(p => p + 1)}
              data-testid="next-page-btn"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {/* Skill Gap Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="skill-analysis-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg">Skill Gap Analysis</DialogTitle>
            <DialogDescription>
              {analysisData?.internship?.title} at {analysisData?.internship?.company}
            </DialogDescription>
          </DialogHeader>

          {analysisLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : analysisData?.analysis ? (
            <div className="space-y-5">
              {/* Compatibility Score */}
              <div className="p-5 rounded-2xl bg-accent/60 text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Compatibility Score</p>
                <p className={`text-5xl font-bold ${analysisData.analysis.compatibility_score >= 70 ? 'text-emerald-600' :
                  analysisData.analysis.compatibility_score >= 40 ? 'text-amber-600' : 'text-red-500'
                  }`} data-testid="analysis-compatibility-score">
                  {analysisData.analysis.compatibility_score}%
                </p>
                <Progress value={analysisData.analysis.compatibility_score} className="mt-3 h-2" />
                <div className="flex justify-center mt-3 text-xs text-muted-foreground">
                  <span>Skills: {analysisData.analysis.skill_match_pct}%</span>
                </div>
              </div>

              {/* Matched Skills */}
              {analysisData.analysis.matched_skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Matched Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5" data-testid="matched-skills">
                    {analysisData.analysis.matched_skills.map(s => (
                      <Badge key={s} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs capitalize rounded-lg">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {analysisData.analysis.missing_skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Missing Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5" data-testid="missing-skills">
                    {analysisData.analysis.missing_skills.map(s => (
                      <Badge key={s} variant="outline" className="text-xs capitalize border-amber-200 text-amber-700 rounded-lg">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Course Recommendations */}
              {analysisData.analysis.learning_paths?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Recommended Courses
                  </h4>
                  <div className="space-y-4" data-testid="learning-paths">
                    {analysisData.analysis.learning_paths.map((lp, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={lp.priority === 'high' ? 'default' : 'secondary'} className="text-[10px] rounded-lg">{lp.priority}</Badge>
                          <span className="text-sm font-semibold capitalize">{lp.skill}</span>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {lp.courses?.map((course, ci) => (
                            <a
                              key={ci}
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="course-link"
                              data-testid={`course-link-${lp.skill}-${ci}`}
                            >
                              <span className="text-xs font-semibold text-primary w-28 shrink-0">{course.platform}</span>
                              <span className="text-xs text-foreground truncate">{course.name}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No analysis data available. Add skills to your profile first.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
