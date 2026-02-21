import { useState, useEffect } from 'react';
import API from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  FileText, Trash2, ExternalLink, Loader2, Building2, MapPin
} from 'lucide-react';

const statusOptions = ['applied', 'interviewing', 'accepted', 'rejected'];

const statusColors = {
  applied: 'bg-blue-100 text-blue-700 border-transparent',
  interviewing: 'bg-violet-100 text-violet-700 border-transparent',
  accepted: 'bg-emerald-100 text-emerald-700 border-transparent',
  rejected: 'bg-red-100 text-red-700 border-transparent',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    try {
      const res = await API.get('/applications');
      setApplications(res.data.applications || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId, newStatus) => {
    try {
      await API.put(`/applications/${appId}`, { status: newStatus });
      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteApplication = async (appId) => {
    try {
      await API.delete(`/applications/${appId}`);
      setApplications(prev => prev.filter(a => a.id !== appId));
      toast.success('Application removed');
    } catch (err) {
      toast.error('Failed to remove application');
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
    <div className="page-container" data-testid="applications-page">
      <div className="mb-6">
        <h1 className="page-title">Applications</h1>
        <p className="page-subtitle">Track and manage your internship applications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="app-summary">
        {statusOptions.map(status => {
          const count = applications.filter(a => a.status === status).length;
          return (
            <div key={status} className="stat-card" data-testid={`summary-${status}`}>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
            </div>
          );
        })}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No applications tracked yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block md:hidden space-y-3" data-testid="apps-mobile">
            {applications.map(app => (
              <Card key={app.id} data-testid={`app-card-${app.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{app.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Building2 className="w-3 h-3" />
                        <span>{app.company}</span>
                        <span className="mx-1">|</span>
                        <MapPin className="w-3 h-3" />
                        <span>{app.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Select value={app.status} onValueChange={v => updateStatus(app.id, v)}>
                      <SelectTrigger className="h-8 text-xs flex-1" data-testid={`status-select-${app.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(app.url, '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteApplication(app.id)} data-testid={`delete-app-${app.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block" data-testid="apps-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map(app => (
                  <TableRow key={app.id} data-testid={`app-row-${app.id}`}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{app.title}</TableCell>
                    <TableCell className="text-sm">{app.company}</TableCell>
                    <TableCell className="text-sm">{app.location}</TableCell>
                    <TableCell>
                      <Select value={app.status} onValueChange={v => updateStatus(app.id, v)}>
                        <SelectTrigger className={`h-8 text-xs w-36 rounded-full ${statusColors[app.status]}`} data-testid={`status-select-${app.id}`}>
                          <SelectValue className="capitalize">{app.status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(s => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(app.url, '_blank')}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteApplication(app.id)} data-testid={`delete-app-${app.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
