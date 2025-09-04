
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, DollarSign, ArrowUpRight, ArrowDownLeft, Gift, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const transactions = [
  { type: 'Payout', description: 'Withdrawal to Bank Account', amount: '-$500.00', status: 'Completed', date: '2023-10-26' },
  { type: 'Payment', description: 'From Project "Mobile App UI Test"', amount: '+$150.00', status: 'Completed', date: '2023-10-24' },
  { type: 'Payment', description: 'From Project "Website QA"', amount: '+$350.00', status: 'Completed', date: '2023-10-20' },
  { type: 'Adjustment', description: 'Platform Fee', amount: '-$25.00', status: 'Completed', date: '2023-10-20' },
];

export default function WalletPage() {
  return (
    <div className="container py-12">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold font-headline flex items-center gap-3">
          <WalletIcon className="h-10 w-10 text-primary" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">Manage your balance, view transactions, and explore services.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Your total available funds on the Testery platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold tracking-tight text-primary">$1,234.56</div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Add Funds
              </Button>
              <Button variant="outline">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>A history of your payments and payouts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Status</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{tx.type}</div>
                        <div className="text-sm text-muted-foreground">{tx.description}</div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-destructive'}`}>
                        {tx.amount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant={tx.status === 'Completed' ? 'success' : 'secondary'}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">{tx.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full">View All Transactions</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" /> Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                You have no active rewards. Complete more projects to earn exclusive perks!
              </p>
            </CardContent>
            <CardFooter>
                <Button variant="secondary" className="w-full">Browse Projects</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Secure Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                All transactions are encrypted and processed securely. Your financial data is protected.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
