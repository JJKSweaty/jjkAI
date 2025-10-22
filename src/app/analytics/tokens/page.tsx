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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const [selectedModel, setSelectedModel] = useState<string>('all');

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
  }, [dateRange, selectedModel]);

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
        <div className="w-full px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to JJK-AI
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <div className="text-xs text-muted-foreground">Analytics</div>
                <h1 className="text-2xl font-semibold">Token Usage</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Filters */}
        <FiltersBar
          onDateRangeChange={handleDateRangeChange}
          onModelChange={handleModelChange}
          onExport={handleExport}
          onRefresh={fetchData}
          models={availableModels}
        />

        {/* KPI Cards */}
        <KpiCards summary={summary} isLoading={isLoading} />

        {/* Chart */}
        <UsageChart data={timeseries} isLoading={isLoading} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
