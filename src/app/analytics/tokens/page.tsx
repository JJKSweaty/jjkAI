'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCards } from '@/components/tokens/KpiCards';
import { UsageChart } from '@/components/tokens/UsageChart';
import { FiltersBar } from '@/components/tokens/FiltersBar';
import { Leaderboard } from '@/components/tokens/Leaderboard';
import { UsersTable } from '@/components/tokens/UsersTable';
import { ModelsTable } from '@/components/tokens/ModelsTable';
import { useAuth } from '@/hooks/useAuth';
import {
  getSummary,
  getTimeseries,
  getByUser,
  getByModel,
  getLeaderboard,
  exportCSV,
  type PeriodParams,
} from '@/lib/api/tokens';

export default function TokenAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    // Set to end of day to include all of today's events
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(to.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [showMyUsage, setShowMyUsage] = useState(false);

  // Data
  const [summary, setSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: PeriodParams = {
        from: dateRange.from,
        to: dateRange.to,
        ...(selectedModel !== 'all' && { model: selectedModel }),
        ...(showMyUsage && user && { user: user.id }),
      };

      const [summaryData, timeseriesData, leaderboardData, usersData, modelsData] =
        await Promise.all([
          getSummary(params),
          getTimeseries(params, 'day'),
          getLeaderboard(params, 'tokens'),
          getByUser(params),
          getByModel(params),
        ]);

      setSummary(summaryData);
      setTimeseries(timeseriesData.points || []);
      setLeaderboard(leaderboardData.rows || []);
      setUsers(usersData.rows || []);
      setModels(modelsData.rows || []);

      // Extract unique models
      const uniqueModels = Array.from(new Set(modelsData.rows?.map((r: any) => r.model) || []));
      setAvailableModels(uniqueModels as string[]);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedModel, showMyUsage, user]);

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to });
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const handleExport = async () => {
    try {
      const blob = await exportCSV({
        from: dateRange.from,
        to: dateRange.to,
        ...(selectedModel !== 'all' && { model: selectedModel }),
        ...(showMyUsage && user && { user: user.id }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `token-usage-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-3 sm:px-6 py-3 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="h-9 sm:h-8">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">Back to JJK-AI</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div>
                <div className="text-xs text-muted-foreground">Analytics</div>
                <h1 className="text-lg sm:text-2xl font-semibold">
                  Token Usage {showMyUsage && <span className="text-primary">• My Usage</span>}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-[1800px] mx-auto">
        {/* Filters */}
        <FiltersBar
          onDateRangeChange={handleDateRangeChange}
          onModelChange={handleModelChange}
          onUserToggle={setShowMyUsage}
          onExport={handleExport}
          onRefresh={fetchData}
          models={availableModels}
          showMyUsage={showMyUsage}
        />

        {/* KPI Cards */}
        <KpiCards summary={summary} models={models} isLoading={isLoading} showMyUsage={showMyUsage} />

        {/* Chart */}
        <UsageChart data={timeseries} isLoading={isLoading} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-2 sm:inline-grid">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs sm:text-sm">Leaderboard</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="models" className="text-xs sm:text-sm">Models</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Leaderboard rows={leaderboard.slice(0, 5)} isLoading={isLoading} />
              <ModelsTable rows={models} isLoading={isLoading} />
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard rows={leaderboard} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="users">
            <UsersTable rows={users} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="models">
            <ModelsTable rows={models} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
