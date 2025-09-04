
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, type DocumentData, writeBatch, collection } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Star, Upload, FileText, Paperclip, X, UploadCloud, Check, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { notifySubmissionReceived } from '@/lib/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const submissionSchema = z.object({
  comments: z.string().optional(),
  files: z.any().optional(),
});

const feedbackSchema = z.object({
    rating: z.number().min(1, "Rating is required").max(5),
    comment: z.string().min(10, "Comment must be at least 10 characters")
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;
type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface SubmissionFile {
    name: string;
    url: string;
}

interface Submission extends DocumentData {
    id: string;
    testerId: string;
    clientId: string;
    projectId: string;
    comments: string;
    files?: SubmissionFile[];
    submittedAt: any;
    feedback?: FeedbackFormValues;
    rewardedAmount?: number;
}

interface ClientProfile {
    uid: string;
    name: string;
    avatarUrl?: string;
}

interface WalletData {
    balance: number;
    currency: string;
}


export default function SubmissionPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [project, setProject] = useState<DocumentData | null>(null);
    const [application, setApplication] = useState<DocumentData | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
    const [clientWallet, setClientWallet] = useState<WalletData | null>(null);

    const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
    const [rewardAmount, setRewardAmount] = useState('');


    const router = useRouter();
    const { toast } = useToast();
    const params = useParams();
    const projectId = params.projectId as string;
    const applicationId = params.applicationId as string;

    const submissionForm = useForm<SubmissionFormValues>({
        resolver: zodResolver(submissionSchema),
        defaultValues: { comments: '' }
    });

    const feedbackForm = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: { rating: 0, comment: '' }
    });
    
    const [rating, setRating] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [router]);
    
    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
        }
        return name[0];
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user || !applicationId) return;
            setIsLoading(true);

            try {
                // Fetch Project and Application
                const projectDoc = await getDoc(doc(db, 'projects', projectId));
                if (projectDoc.exists()) setProject(projectDoc.data());

                const appDoc = await getDoc(doc(db, 'applications', applicationId));
                 if (appDoc.exists()) {
                    const appData = appDoc.data();
                    setApplication(appData);

                    // Authorization check
                    const isTester = user.uid === appData.testerId;
                    const isClient = user.uid === appData.ownerId;
                    if (!isTester && !isClient) {
                         toast({ variant: 'destructive', title: 'Unauthorized', description: 'You cannot view this page.' });
                         router.push('/');
                         return;
                    }

                    if(isClient) {
                        const walletRef = doc(db, 'wallets', user.uid);
                        const walletSnap = await getDoc(walletRef);
                        if (walletSnap.exists()) {
                            setClientWallet(walletSnap.data() as WalletData);
                        } else {
                            setClientWallet({ balance: 0, currency: 'USD' });
                        }
                    }

                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'Application not found.' });
                    router.push('/');
                    return;
                }

                // Fetch Submission
                const submissionDoc = await getDoc(doc(db, 'submissions', applicationId));
                if (submissionDoc.exists()) {
                    const subData = submissionDoc.data() as Submission;
                    setSubmission(subData);
                    if(subData.feedback) {
                        feedbackForm.reset(subData.feedback);
                        setRating(subData.feedback.rating);
                    }
                    
                    // Fetch client profile if submission exists
                    const clientDocRef = doc(db, 'users', subData.clientId);
                    const clientDocSnap = await getDoc(clientDocRef);
                    if (clientDocSnap.exists()) {
                        const clientData = clientDocSnap.data();
                        setClientProfile({
                            uid: subData.clientId,
                            name: clientData.companyName || clientData.fullName,
                            avatarUrl: clientData.companyLogoUrl || clientData.profilePictureUrl
                        });
                    }
                }
            } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load page data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [user, applicationId, projectId, router, toast, feedbackForm]);


    const handleSubmission = async (values: SubmissionFormValues) => {
        if (!user || !application || !project) return;
        setIsSubmitting(true);
        try {
            const uploadedFiles: SubmissionFile[] = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                     const storageRef = ref(storage, `submissions/${applicationId}/${file.name}`);
                     await uploadBytes(storageRef, file);
                     const url = await getDownloadURL(storageRef);
                     uploadedFiles.push({ name: file.name, url });
                }
            }

            const submissionData: Omit<Submission, 'id' | 'submittedAt'> & { submittedAt: any } = {
                testerId: user.uid,
                clientId: application.ownerId,
                projectId,
                comments: values.comments || '',
                submittedAt: serverTimestamp(),
                files: uploadedFiles,
            };
            
            await setDoc(doc(db, 'submissions', applicationId), submissionData);

            await notifySubmissionReceived(
                application.ownerId, 
                projectId, 
                project.title, 
                user.displayName || 'A tester', 
                applicationId
            );

            toast({ title: 'Success', description: 'Your work has been submitted.' });
            setSubmission({ id: applicationId, ...submissionData, submittedAt: new Date() });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const addFilesToList = (files: FileList | null) => {
        if (files) {
            const newFiles = Array.from(files);
            const updatedFiles = [...selectedFiles, ...newFiles];
            setSelectedFiles(updatedFiles);
            submissionForm.setValue('files', updatedFiles);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        addFilesToList(event.target.files);
        event.target.value = ''; // Clear input to allow re-selecting same file
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // This is necessary to show the drop cursor
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        addFilesToList(e.dataTransfer.files);
    };


    const handleRemoveFile = (indexToRemove: number) => {
        const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
        setSelectedFiles(updatedFiles);
        submissionForm.setValue('files', updatedFiles);
    };
    
    const handleFeedback = async (values: FeedbackFormValues) => {
         if (!user || !submission) return;
         setIsSubmitting(true);
         try {
             const submissionRef = doc(db, 'submissions', applicationId);
             await updateDoc(submissionRef, { feedback: values });

             const clientUser = await getDoc(doc(db, 'users', user.uid));
             const clientData = clientUser.data();
             
             // Add review to a separate collection for querying on profile page
             await setDoc(doc(db, 'reviews', `${applicationId}`), {
                 ...values,
                 testerId: submission.testerId,
                 clientId: user.uid,
                 clientName: clientData?.companyName || clientData?.fullName,
                 clientAvatar: clientData?.companyLogoUrl || clientData?.profilePictureUrl,
                 projectId: submission.projectId,
                 createdAt: serverTimestamp()
             });

             toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback.' });
             setSubmission(prev => prev ? {...prev, feedback: values} : null);

         } catch(error: any) {
              toast({ variant: 'destructive', title: 'Failed to submit feedback', description: error.message });
         } finally {
            setIsSubmitting(false);
         }
    };
    
    const handleReward = async () => {
        if (!user || !submission || !project || !clientWallet) return;
        const amount = parseFloat(rewardAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid reward amount.' });
            return;
        }
        if (amount > clientWallet.balance) {
             toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your wallet balance is too low to complete this transaction.' });
            return;
        }
        setIsSubmitting(true);

        const batch = writeBatch(db);

        // 1. Update client's wallet
        const clientWalletRef = doc(db, 'wallets', user.uid);
        batch.update(clientWalletRef, { balance: clientWallet.balance - amount });

        // 2. Update tester's wallet
        const testerWalletRef = doc(db, 'wallets', submission.testerId);
        const testerWalletSnap = await getDoc(testerWalletRef);
        const testerWalletData = testerWalletSnap.data();
        const newTesterBalance = (testerWalletData?.balance || 0) + amount;
        batch.set(testerWalletRef, { balance: newTesterBalance, currency: 'USD' }, { merge: true });

        // 3. Create transaction for client
        const clientTransactionRef = doc(collection(db, 'transactions'));
        batch.set(clientTransactionRef, {
            userId: user.uid,
            type: 'payment',
            amount: -amount,
            description: `Payment to tester for project: ${project.title}`,
            status: 'completed',
            createdAt: serverTimestamp(),
            relatedUserId: submission.testerId,
        });
        
        // 4. Create transaction for tester
        const testerTransactionRef = doc(collection(db, 'transactions'));
        batch.set(testerTransactionRef, {
            userId: submission.testerId,
            type: 'payout',
            amount: amount,
            description: `Reward for project: ${project.title}`,
            status: 'completed',
            createdAt: serverTimestamp(),
            relatedUserId: user.uid,
        });

        // 5. Update submission with rewarded amount
        const submissionRef = doc(db, 'submissions', applicationId);
        batch.update(submissionRef, { rewardedAmount: amount });

        try {
            await batch.commit();
            toast({ title: 'Reward Sent!', description: `You have successfully rewarded the tester.` });
            setSubmission(prev => prev ? {...prev, rewardedAmount: amount} : null);
            setClientWallet(prev => prev ? {...prev, balance: prev.balance - amount} : null);
            setIsRewardDialogOpen(false);
            setRewardAmount('');
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Reward Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isClient = user?.uid === application?.ownerId;
    const isTester = user?.uid === application?.testerId;

     if (isLoading) {
        return (
             <div className="container py-12">
                <Skeleton className="h-10 w-32 mb-8" />
                 <Card className="max-w-3xl mx-auto">
                     <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                     <CardContent className="space-y-4">
                         <Skeleton className="h-6 w-1/4" />
                         <Skeleton className="h-20 w-full" />
                         <Skeleton className="h-10 w-32" />
                     </CardContent>
                 </Card>
            </div>
        )
     }

    return (
        <div className="container py-12">
             <div className="mb-8">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            
            <Card className="max-w-3xl mx-auto">
                 <CardHeader>
                    <CardTitle className="text-2xl">Project Submission</CardTitle>
                    <CardDescription>
                        Project: <Link href={`/projects/${projectId}`} className="text-primary hover:underline">{project?.title || 'Loading...'}</Link>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!submission && isTester && (
                        <Form {...submissionForm}>
                            <form onSubmit={submissionForm.handleSubmit(handleSubmission)} className="space-y-8">
                                 <FormField
                                    control={submissionForm.control}
                                    name="files"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Upload Files</FormLabel>
                                        <FormControl>
                                            <label
                                                onDragEnter={handleDragEnter}
                                                onDragLeave={handleDragLeave}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                                className={cn(
                                                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors",
                                                    isDragging && "border-primary bg-primary/10"
                                                )}
                                            >
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <UploadCloud className={cn("w-10 h-10 mb-3 text-muted-foreground", isDragging && "text-primary")} />
                                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                                    <p className="text-xs text-muted-foreground">Any relevant project files</p>
                                                </div>
                                                <Input 
                                                    id="dropzone-file" 
                                                    type="file" 
                                                    className="hidden" 
                                                    multiple
                                                    onChange={handleFileChange}
                                                    disabled={isSubmitting} 
                                                />
                                            </label>
                                        </FormControl>
                                        <FormMessage />
                                         {selectedFiles.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <h4 className="text-sm font-medium">Selected files:</h4>
                                                <ul className="space-y-2 bg-muted/50 p-3 rounded-md">
                                                    {selectedFiles.map((file, index) => (
                                                        <li key={index} className="text-sm text-muted-foreground flex items-center justify-between gap-2 bg-background p-2 rounded-md border">
                                                           <div className="flex items-center gap-2 truncate">
                                                                <Paperclip className="h-4 w-4 flex-shrink-0" />
                                                                <span className="truncate">{file.name}</span>
                                                           </div>
                                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile(index)}>
                                                                <X className="h-4 w-4 text-destructive" />
                                                                <span className="sr-only">Remove file</span>
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={submissionForm.control}
                                    name="comments"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comments</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Add any comments about your submission..." {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isSubmitting || selectedFiles.length === 0}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Submitting...' : 'Submit Work'}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {submission && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-4">Submission Details</h3>
                                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                     <div>
                                        <p className="text-sm font-medium">Tester Comments:</p>
                                        <p className="text-muted-foreground">{submission.comments || 'No comments provided.'}</p>
                                    </div>
                                    {submission.files && submission.files.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Submitted Files:</p>
                                            <div className="space-y-2">
                                                {submission.files.map((file, index) => (
                                                     <Button asChild variant="outline" key={index} className="mr-2">
                                                        <Link href={file.url} target="_blank" download={file.name}>
                                                            <Download className="mr-2 h-4 w-4" /> {file.name}
                                                        </Link>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t pt-6">
                                <h3 className="font-semibold text-lg mb-4">Feedback</h3>
                                {submission.feedback && clientProfile && (
                                     <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <Link href={`/users/${clientProfile.uid}`}>
                                                <Avatar>
                                                    <AvatarImage src={clientProfile.avatarUrl} alt={clientProfile.name} />
                                                    <AvatarFallback>{getInitials(clientProfile.name)}</AvatarFallback>
                                                </Avatar>
                                            </Link>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Feedback from <Link href={`/users/${clientProfile.uid}`} className="text-primary hover:underline">{clientProfile.name}</Link>
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={cn('h-5 w-5', i < submission.feedback!.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground">{submission.feedback.comment}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!submission.feedback && isClient && (
                                    <Form {...feedbackForm}>
                                        <form onSubmit={feedbackForm.handleSubmit(handleFeedback)} className="space-y-6">
                                            <FormField
                                                control={feedbackForm.control}
                                                name="rating"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rating</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star 
                                                                    key={i} 
                                                                    className={cn('h-8 w-8 cursor-pointer', i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300')}
                                                                    onClick={() => {
                                                                        setRating(i + 1);
                                                                        field.onChange(i + 1);
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={feedbackForm.control}
                                                name="comment"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Comments</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Provide feedback on the tester's work..." {...field} disabled={isSubmitting} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                                            </Button>
                                        </form>
                                    </Form>
                                )}
                                {!submission.feedback && isTester && (
                                     <div className="text-center text-muted-foreground py-8">
                                        <FileText className="mx-auto h-12 w-12 mb-4" />
                                        <p>Waiting for client to provide feedback.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Reward Section */}
                            {isClient && submission.feedback && (
                                <div className="border-t pt-6">
                                <h3 className="font-semibold text-lg mb-4">Reward Tester</h3>
                                {submission.rewardedAmount ? (
                                     <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center gap-3">
                                        <Check className="h-5 w-5" />
                                        <p>You have rewarded this tester with <strong>${submission.rewardedAmount.toFixed(2)}</strong>.</p>
                                     </div>
                                ) : (
                                    <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                Reward Tester
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Reward Tester</DialogTitle>
                                                <DialogDescription>
                                                    Enter the amount you'd like to send from your wallet to the tester.
                                                    Your current balance is <strong>${clientWallet?.balance.toFixed(2)}</strong>.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <Label htmlFor="reward-amount">Amount (USD)</Label>
                                                <Input id="reward-amount" type="number" placeholder="e.g., 50.00" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} />
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRewardDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={handleReward} disabled={isSubmitting || !rewardAmount || parseFloat(rewardAmount) > (clientWallet?.balance ?? 0)}>
                                                    {isSubmitting ? 'Sending...' : 'Send Reward'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                </div>
                            )}

                        </div>
                    )}
                     {!submission && isClient && (
                         <div className="text-center text-muted-foreground py-8">
                            <FileText className="mx-auto h-12 w-12 mb-4" />
                            <p>The tester has not submitted their work yet.</p>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    )

}
