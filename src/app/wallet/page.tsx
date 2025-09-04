
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, DollarSign, ArrowUpRight, Gift, ShieldCheck, Inbox, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc, collection, query, where, getDocs, DocumentData, Timestamp, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


interface WalletData {
    balance: number;
    currency: string;
}

interface Transaction extends DocumentData {
    id: string;
    type: 'payment' | 'payout' | 'fee' | 'refund' | 'bonus' | 'deposit' | 'withdrawal';
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [addFundsAmount, setAddFundsAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    
    const [isAddFundsOpen, setAddFundsOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const { toast } = useToast();

    const fetchWalletData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const walletRef = doc(db, 'wallets', user.uid);
            const walletSnap = await getDoc(walletRef);
            if (walletSnap.exists()) {
                setWallet(walletSnap.data() as WalletData);
            } else {
                setWallet({ balance: 0, currency: 'USD' });
            }

            const transRef = collection(db, 'transactions');
            const q = query(transRef, where('userId', '==', user.uid));
            const transSnap = await getDocs(q);
            const transactionsData = transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            
            transactionsData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            
            setTransactions(transactionsData);

        } catch (error) {
            console.error("Failed to fetch wallet data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthLoading) {
            fetchWalletData();
        }
    }, [user, isAuthLoading]);

    const handleTransaction = async (type: 'deposit' | 'withdrawal', amount: number) => {
        if (!user || !wallet || amount <= 0) return;

        if (type === 'withdrawal' && amount > wallet.balance) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'You cannot withdraw more than your available balance.' });
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);
        
        const newBalance = type === 'deposit' ? wallet.balance + amount : wallet.balance - amount;
        const walletRef = doc(db, 'wallets', user.uid);
        batch.set(walletRef, { balance: newBalance, currency: wallet.currency }, { merge: true });

        const newTransactionRef = doc(collection(db, 'transactions'));
        batch.set(newTransactionRef, {
            userId: user.uid,
            type,
            amount: type === 'deposit' ? amount : -amount,
            description: type === 'deposit' ? 'Funds added to wallet' : 'Withdrawal from wallet',
            status: 'completed',
            createdAt: serverTimestamp(),
        });
        
        try {
            await batch.commit();
            toast({ title: 'Success', description: `Your wallet has been updated.` });
            await fetchWalletData(); // Refresh data
            if(type === 'deposit') {
                setAddFundsAmount('');
                setAddFundsOpen(false);
            } else {
                setWithdrawAmount('');
                setIsWithdrawOpen(false);
            }
        } catch (error) {
             toast({ variant: 'destructive', title: 'Transaction Failed', description: 'There was an error processing your request.' });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <Dialog open={isAddFundsOpen} onOpenChange={setAddFundsOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Add Funds
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Funds to Wallet</DialogTitle>
                                <DialogDescription>This is a simulation. No real money will be charged.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Label htmlFor="add-amount">Amount (USD)</Label>
                                <Input id="add-amount" type="number" placeholder="e.g., 50.00" value={addFundsAmount} onChange={(e) => setAddFundsAmount(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddFundsOpen(false)}>Cancel</Button>
                                <Button onClick={() => handleTransaction('deposit', parseFloat(addFundsAmount))} disabled={isSubmitting || !addFundsAmount}>
                                    {isSubmitting ? 'Processing...' : 'Add Funds'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={(wallet?.balance ?? 0) <= 0}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                Withdraw
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Withdraw Funds</DialogTitle>
                                <DialogDescription>This is a simulation. No real money will be transferred.</DialogDescription>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <Label htmlFor="withdraw-amount">Amount (USD)</Label>
                                <Input id="withdraw-amount" type="number" placeholder="e.g., 50.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                            </div>
                            <DialogFooter>
                                 <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
                                <Button onClick={() => handleTransaction('withdrawal', parseFloat(withdrawAmount))} disabled={isSubmitting || !withdrawAmount || parseFloat(withdrawAmount) > (wallet?.balance ?? 0)}>
                                    {isSubmitting ? 'Processing...' : 'Withdraw Funds'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                {transactions.length > 5 && (
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
