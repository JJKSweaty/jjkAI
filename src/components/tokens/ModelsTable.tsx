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

export function ModelsTable({ rows = [], isLoading }: ModelsTableProps) {
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
        <CardTitle>Usage by Model</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
