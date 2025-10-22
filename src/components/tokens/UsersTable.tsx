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
import { Users } from 'lucide-react';

interface UserRow {
  user_id: string;
  user_display: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
}

interface UsersTableProps {
  rows?: UserRow[];
  isLoading?: boolean;
}

export function UsersTable({ rows = [], isLoading }: UsersTableProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Users</CardTitle>
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
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No user data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Usage by User</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
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
                <TableRow key={row.user_id} className="text-sm">
                  <TableCell className="font-medium">{row.user_display}</TableCell>
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
