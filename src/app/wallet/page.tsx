
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, DollarSign, ArrowUpRight, Gift, ShieldCheck, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc, collection, query, where, orderBy, getDocs, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WalletData {
    balance: number;
    currency: string;
}

interface Transaction extends DocumentData {
    id: string;
    type: 'payment' | 'payout' | 'fee' | 'refund' | 'bonus';
    description: string;
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    createdAt: Timestamp;
}

export default function WalletPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            if(!isAuthLoading) setIsLoading(false);
            return;
        };

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch wallet balance
                const walletRef = doc(db, 'wallets', user.uid);
                const walletSnap = await getDoc(walletRef);
                if (walletSnap.exists()) {
                    setWallet(walletSnap.data() as WalletData);
                } else {
                    // Create a default wallet if it doesn't exist
                    setWallet({ balance: 0, currency: 'USD' });
                }

                // Fetch transactions
                const transRef = collection(db, 'transactions');
                const q = query(transRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
                const transSnap = await getDocs(q);
                setTransactions(transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));

            } catch (error) {
                console.error("Failed to fetch wallet data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

    }, [user, isAuthLoading]);

    const formatCurrency = (amount: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    };
    
    const renderSkeletons = () => (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-12 w-1/2" />
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-10 w-28" />
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                 </Card>
            </div>
             <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );

  return (
    <div className="container py-12">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold font-headline flex items-center gap-3">
          <WalletIcon className="h-10 w-10 text-primary" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">Manage your balance, view transactions, and explore services.</p>
      </div>

       {isLoading || isAuthLoading ? renderSkeletons() : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Current Balance</CardTitle>
                  <CardDescription>Your total available funds on the Testery platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold tracking-tight text-primary">
                    {formatCurrency(wallet?.balance ?? 0, wallet?.currency)}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button disabled>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Add Funds
                  </Button>
                  <Button variant="outline" disabled={(wallet?.balance ?? 0) <= 0}>
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
                    {transactions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            <Inbox className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">No transactions yet</h3>
                            <p>Your transaction history will appear here.</p>
                        </div>
                    ) : (
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
                            {transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                <TableCell>
                                    <div className="font-medium capitalize">{tx.type}</div>
                                    <div className="text-sm text-muted-foreground">{tx.description}</div>
                                </TableCell>
                                <TableCell className={cn("text-right font-semibold", tx.amount > 0 ? 'text-green-600' : 'text-destructive')}>
                                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, wallet?.currency)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-center">
                                    <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize">{tx.status}</Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">{format(tx.createdAt.toDate(), 'P')}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {transactions.length > 0 && (
                    <CardFooter>
                        <Button variant="outline" className="w-full">View All Transactions</Button>
                    </CardFooter>
                )}
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
                    <Button variant="secondary" className="w-full" asChild>
                        <Link href="/projects">Browse Projects</Link>
                    </Button>
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
       )}
    </div>
  );
}
