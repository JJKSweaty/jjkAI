import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ModelRow {
  model: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
}

interface ModelsTableProps {
  rows?: ModelRow[];
  isLoading?: boolean;
}

function getModelBadge(model: string) {
  if (model.includes('sonnet')) return <Badge variant="default">Sonnet</Badge>;
  if (model.includes('haiku')) return <Badge variant="secondary">Haiku</Badge>;
  if (model.includes('opus')) return <Badge variant="outline">Opus</Badge>;
  return null;
}

function getModelColor(model: string) {
  if (model.includes('sonnet')) return 'bg-primary';
  if (model.includes('haiku')) return 'bg-secondary';
  if (model.includes('opus')) return 'bg-accent';
  return 'bg-muted';
}

export function ModelsTable({ rows = [], isLoading }: ModelsTableProps) {
  // Calculate totals for percentage
  const totalTokens = rows.reduce((sum, r) => sum + r.input + r.output + r.reasoning, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cost_usd, 0);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
          <CardTitle>Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No model data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Usage by Model</span>
          <Badge variant="outline" className="text-xs">
            {rows.length} {rows.length === 1 ? 'Model' : 'Models'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual breakdown bars */}
        <div className="space-y-3">
          {rows.map((row) => {
            const total = row.input + row.output + row.reasoning;
            const percentage = totalTokens > 0 ? (total / totalTokens) * 100 : 0;
            const costPercentage = totalCost > 0 ? (row.cost_usd / totalCost) * 100 : 0;
            
            return (
              <div key={row.model} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{row.model}</span>
                    {getModelBadge(row.model)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
                
                {/* Token usage bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getModelColor(row.model)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-3">
                      <span>In: {row.input.toLocaleString()}</span>
                      <span>Out: {row.output.toLocaleString()}</span>
                      {row.reasoning > 0 && <span>Reason: {row.reasoning.toLocaleString()}</span>}
                    </div>
                    <span className="font-medium">${row.cost_usd.toFixed(2)} ({costPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed table */}
        <div className="pt-4 border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Reasoning</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost (USD)</TableHead>
                <TableHead className="text-right">Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const total = row.input + row.output + row.reasoning;
                return (
                  <TableRow key={row.model} className="text-sm">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{row.model}</span>
                        {getModelBadge(row.model)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.input.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.output.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.reasoning > 0 ? row.reasoning.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${row.cost_usd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.requests.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
