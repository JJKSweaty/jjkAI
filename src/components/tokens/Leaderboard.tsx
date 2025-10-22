import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardRow {
  rank: number;
  user_id: string;
  user_display: string;
  tokens: number;
  cost_usd: number;
  requests: number;
}

interface LeaderboardProps {
  rows?: LeaderboardRow[];
  metric?: 'tokens' | 'cost';
  isLoading?: boolean;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return null;
}

function getRankBadge(rank: number) {
  if (rank <= 3) {
    const variant = rank === 1 ? 'default' : 'secondary';
    return (
      <Badge variant={variant} className="gap-1">
        {getRankIcon(rank)}
        {rank}
      </Badge>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

export function Leaderboard({ rows = [], metric = 'tokens', isLoading }: LeaderboardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No data available for this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <CardTitle className="text-base sm:text-lg">
          Leaderboard - Top {metric === 'tokens' ? 'Token Users' : 'Cost Contributors'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 pb-4 sm:pb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 sm:w-20 text-xs sm:text-sm">Rank</TableHead>
                <TableHead className="text-xs sm:text-sm">User</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Tokens</TableHead>
                <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Cost (USD)</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Reqs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.user_id} className="text-xs sm:text-sm">
                  <TableCell>{getRankBadge(row.rank)}</TableCell>
                  <TableCell className="font-medium">{row.user_display}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.tokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">
                    ${row.cost_usd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.requests.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
