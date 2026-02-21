import { useState, useEffect } from 'react';
import API from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AutocompleteMultiSelect from '@/components/ui/AutocompleteMultiSelect';
import { toast } from 'sonner';
import {
  User, GraduationCap, Briefcase, MapPin, Save,
  Loader2, Link as LinkIcon, Calendar, Pencil, Mail, Plus, Trash2, FolderOpen
} from 'lucide-react';
import { SKILLS } from '@/data/skills';
import { ROLES } from '@/data/roles';
import { DEGREES } from '@/data/degrees';
import { UNIVERSITIES } from '@/data/universities';
import { LOCATIONS } from '@/data/locations';

const YEARS = Array.from({ length: 2099 - 1999 + 1 }, (_, i) => String(2099 - i));

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get('/profile');
      setProfile(res.data);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await API.put('/profile/update', profile);
      setProfile(res.data);
      setEditing(false);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, val) => setProfile(p => ({ ...p, [field]: val }));

  /* ── Projects helpers ── */
  const addProject = () => {
    const projects = [...(profile?.projects || []), { title: '', url: '' }];
    set('projects', projects);
  };
  const updateProject = (idx, field, val) => {
    const projects = [...(profile?.projects || [])];
    projects[idx] = { ...projects[idx], [field]: val };
    set('projects', projects);
  };
  const removeProject = (idx) => {
    const projects = (profile?.projects || []).filter((_, i) => i !== idx);
    set('projects', projects);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container" data-testid="profile-page">

      {/* ── LinkedIn-style Profile Header ──────────────────────── */}
      <Card className="mb-6 overflow-hidden animate-slide-up">
        {/* Cover gradient */}
        <div
          className="h-32 md:h-40"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #1b1f23 100%)',
          }}
        />

        {/* Avatar + name */}
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-14">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white border-4 border-white flex items-center justify-center shadow-lg shrink-0">
              <span className="text-2xl md:text-3xl font-bold text-orange-500">{initials}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {profile?.name || 'Your Name'}
              </h1>
              {profile?.headline ? (
                <p className="text-sm text-muted-foreground mt-0.5">{profile.headline}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic mt-0.5">Add a headline…</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {profile?.email || user?.email}
                </span>
                {profile?.education_college && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {profile.education_college}
                  </span>
                )}
              </div>
            </div>

            {/* Edit / Save */}
            <div className="flex gap-2 shrink-0">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="rounded-full bg-orange-500 hover:bg-orange-600 text-white" onClick={saveProfile} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {editing ? (
        /* ── Edit Mode ──────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile?.name || ''} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={profile?.headline || ''} onChange={e => set('headline', e.target.value)} placeholder="e.g. Computer Science Student | ML Enthusiast" />
              </div>
              <div className="space-y-2">
                <Label>Resume Link</Label>
                <div className="flex gap-2">
                  <Input value={profile?.resume_url || ''} onChange={e => set('resume_url', e.target.value)} placeholder="https://drive.google.com/your-resume" />
                  {profile?.resume_url && (
                    <Button variant="ghost" size="icon" onClick={() => window.open(profile.resume_url, '_blank')}>
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-orange-500" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>College / University</Label>
                <AutocompleteMultiSelect
                  options={UNIVERSITIES} value={profile?.education_college || ''}
                  onChange={val => set('education_college', val)}
                  placeholder="Search your university…" multiSelect={false} allowCustom={true}
                  icon={<GraduationCap className="w-4 h-4" />}
                />
              </div>
              <div className="space-y-2">
                <Label>Degree</Label>
                <AutocompleteMultiSelect
                  options={DEGREES} value={profile?.education_degree || ''}
                  onChange={val => set('education_degree', val)}
                  placeholder="Select your degree…" multiSelect={false} allowCustom={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Graduation Year</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    className="w-full h-[42px] pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-400 transition-all duration-200 cursor-pointer"
                    value={profile?.education_year || ''}
                    onChange={e => set('education_year', e.target.value)}
                  >
                    <option value="">Select year…</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-500" /> Skills
                <Badge variant="secondary" className="ml-auto text-xs font-normal">{profile?.skills?.length || 0} added</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AutocompleteMultiSelect
                options={SKILLS} value={profile?.skills || []}
                onChange={val => set('skills', val)}
                placeholder="Search skills (Python, React, ML…)"
                multiSelect={true} allowCustom={true}
                icon={<Briefcase className="w-4 h-4" />}
              />
            </CardContent>
          </Card>

          {/* Career Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" /> Career Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Roles</Label>
                <AutocompleteMultiSelect
                  options={ROLES} value={profile?.target_roles || []}
                  onChange={val => set('target_roles', val)}
                  placeholder="Search roles…" multiSelect={true} allowCustom={true}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <AutocompleteMultiSelect
                  options={LOCATIONS} value={profile?.preferred_locations || []}
                  onChange={val => set('preferred_locations', val)}
                  placeholder="Search locations…" multiSelect={true} allowCustom={true}
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Internship Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {['remote', 'onsite', 'hybrid'].map(type => (
                    <button
                      key={type} type="button"
                      onClick={() => set('internship_type', type)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${profile?.internship_type === type
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'border-border text-muted-foreground hover:border-orange-400 hover:text-foreground'
                        }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Projects / Work URLs ── */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-orange-500" /> Projects / Work URLs
                <button
                  type="button"
                  onClick={addProject}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(profile?.projects || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No projects added yet. Click <span className="font-semibold text-orange-500">+ Add Project</span> to get started.
                </p>
              ) : (
                (profile?.projects || []).map((proj, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={proj.title || ''}
                        onChange={e => updateProject(idx, 'title', e.target.value)}
                        placeholder="Project title"
                        className="text-sm"
                      />
                      <Input
                        value={proj.url || ''}
                        onChange={e => updateProject(idx, 'url', e.target.value)}
                        placeholder="https://github.com/you/project"
                        className="text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="mt-2 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                      title="Remove project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── View Mode ──────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

          {/* Left column: About + Education */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No skills added yet — click Edit Profile to add</p>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Education</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.education_college ? (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{profile.education_college}</p>
                      <p className="text-xs text-muted-foreground">{profile.education_degree}</p>
                      {profile.education_year && (
                        <p className="text-xs text-muted-foreground mt-0.5">Class of {profile.education_year}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No education info — click Edit Profile</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Targets */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Target Roles</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.target_roles?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.target_roles.map(r => (
                      <Badge key={r} variant="outline" className="rounded-full px-3 py-1 text-xs">{r}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not set</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Preferred Locations</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.preferred_locations?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_locations.map(l => (
                      <Badge key={l} variant="outline" className="rounded-full px-3 py-1 text-xs">
                        <MapPin className="w-3 h-3 mr-1" />{l}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not set</p>
                )}
              </CardContent>
            </Card>

            {profile?.resume_url && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open(profile.resume_url, '_blank')}>
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> View Resume
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
