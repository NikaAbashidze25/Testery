
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, type DocumentData, writeBatch, collection, onSnapshot, Timestamp, query, orderBy, addDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Star, Upload, FileText, Paperclip, X, UploadCloud, Check, DollarSign, AlertTriangle, MessageSquare, Edit, Send } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { notifySubmissionReceived, notifySubmissionEdited, notifyFeedbackReceived } from '@/lib/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';


const submissionSchema = z.object({
  comments: z.string().min(1, "Comments are required."),
  files: z.any().optional(),
});

const feedbackSchema = z.object({
    rating: z.number().min(1, "Rating is required").max(5),
    comment: z.string().min(10, "Comment must be at least 10 characters")
});

const requestEditsSchema = z.object({
  feedbackComment: z.string().min(10, "Feedback must be at least 10 characters long."),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;
type FeedbackFormValues = z.infer<typeof feedbackSchema>;
type RequestEditsFormValues = z.infer<typeof requestEditsSchema>;

interface SubmissionFile {
    name: string;
    url: string;
    path: string;
}

interface SubmissionVersion extends DocumentData {
    id: string;
    comments: string;
    files: SubmissionFile[];
    submittedAt: Timestamp;
    version: number;
}

interface ApplicationData extends DocumentData {
    id: string;
    testerId: string;
    ownerId: string;
    projectId: string;
    feedbackComment?: string;
    isApproved?: boolean;
    rewardedAmount?: number;
    reviewId?: string;
}

interface ProjectData extends DocumentData {
    title: string;
    compensation: number;
}

interface UserProfile {
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
    const [submissions, setSubmissions] = useState<SubmissionVersion[]>([]);
    const [project, setProject] = useState<ProjectData | null>(null);
    const [application, setApplication] = useState<ApplicationData | null>(null);
    const [testerProfile, setTesterProfile] = useState<UserProfile | null>(null);
    const [clientWallet, setClientWallet] = useState<WalletData | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isApproveDialogOpen, setApproveDialogOpen] = useState(false);
    
    const router = useRouter();
    const { toast } = useToast();
    const params = useParams();
    const projectId = params.projectId as string;
    const applicationId = params.applicationId as string;

    const submissionForm = useForm<SubmissionFormValues>({ resolver: zodResolver(submissionSchema), defaultValues: { comments: '' }});
    const feedbackForm = useForm<FeedbackFormValues>({ resolver: zodResolver(feedbackSchema), defaultValues: { rating: 0, comment: '' }});
    const requestEditsForm = useForm<RequestEditsFormValues>({ resolver: zodResolver(requestEditsSchema) });

    const [rating, setRating] = useState(0);

    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) return names[0][0] + names[names.length - 1][0];
        return name[0];
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) router.push('/login');
            else setUser(currentUser);
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!user || !applicationId) return;

        const appRef = doc(db, 'applications', applicationId);
        const appUnsub = onSnapshot(appRef, async (appSnap) => {
            if (appSnap.exists()) {
                const appData = { id: appSnap.id, ...appSnap.data() } as ApplicationData;
                setApplication(appData);

                const fetchProfilesAndWallet = async () => {
                    if (!testerProfile) {
                        const testerDoc = await getDoc(doc(db, 'users', appData.testerId));
                        if (testerDoc.exists()) {
                            const data = testerDoc.data();
                            setTesterProfile({
                                uid: appData.testerId,
                                name: data.fullName || 'Unknown Tester',
                                avatarUrl: data.profilePictureUrl,
                            });
                        }
                    }

                    if (user.uid === appData.ownerId && !clientWallet) {
                        const walletDoc = await getDoc(doc(db, 'wallets', user.uid));
                        setClientWallet(walletDoc.exists() ? walletDoc.data() as WalletData : { balance: 0, currency: 'USD' });
                    }
                };

                fetchProfilesAndWallet();

                if (user.uid !== appData.testerId && user.uid !== appData.ownerId) {
                    toast({ variant: 'destructive', title: 'Unauthorized' });
                    router.push('/');
                }
            } else {
                toast({ variant: 'destructive', title: 'Not Found' });
                router.push('/');
            }
        });

        const projectRef = doc(db, 'projects', projectId);
        getDoc(projectRef).then(docSnap => {
            if (docSnap.exists()) setProject(docSnap.data() as ProjectData);
        });

        const submissionsRef = collection(db, 'applications', applicationId, 'submissions');
        const q = query(submissionsRef, orderBy('submittedAt', 'desc'));
        const subsUnsub = onSnapshot(q, (snapshot) => {
            setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionVersion)));
            setIsLoading(false);
        });

        return () => {
            appUnsub();
            subsUnsub();
        };
    }, [user, applicationId, projectId, router, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    };
    const removeSelectedFile = (index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    };

    const handleSubmission = async (values: SubmissionFormValues) => {
        if (!user || !application || !project) return;
        setIsSubmitting(true);
        try {
            const uploadedFiles: SubmissionFile[] = [];
            for (const file of selectedFiles) {
                const filePath = `submissions/${applicationId}/${Date.now()}-${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                uploadedFiles.push({ name: file.name, url, path: filePath });
            }

            const submissionsRef = collection(db, 'applications', applicationId, 'submissions');
            await addDoc(submissionsRef, {
                comments: values.comments,
                files: uploadedFiles,
                submittedAt: serverTimestamp(),
                version: submissions.length + 1,
            });

            // Notify on both initial submission and edits
            if(submissions.length > 0){
                await notifySubmissionEdited(application.ownerId, projectId, project.title, user.displayName || 'A tester', applicationId);
            } else {
                await notifySubmissionReceived(application.ownerId, projectId, project.title, user.displayName || 'A tester', applicationId);
            }
            toast({ title: 'Success', description: 'Your work has been submitted.' });
            setSelectedFiles([]);
            submissionForm.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestEdits = async (values: RequestEditsFormValues) => {
      if (!user || !application || !project) return;
      setIsSubmitting(true);
      try {
        await updateDoc(doc(db, 'applications', applicationId), {
          feedbackComment: values.feedbackComment,
        });

        await notifyFeedbackReceived(application.testerId, projectId, project.title, applicationId);

        toast({ title: "Feedback Sent", description: "The tester has been notified about your feedback." });
        requestEditsForm.reset();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to send feedback', description: error.message });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleApproveAndPay = async (values: FeedbackFormValues) => {
        if (!user || !application || !project || !clientWallet) return;
        const rewardAmount = parseFloat(String(project.compensation));
        if (rewardAmount > clientWallet.balance) {
            toast({ variant: 'destructive', title: 'Insufficient Funds' });
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);
        const appRef = doc(db, 'applications', applicationId);
        batch.update(appRef, { isApproved: true, rewardedAmount: rewardAmount });

        const clientDoc = await getDoc(doc(db, 'users', user.uid));
        const reviewRef = doc(collection(db, 'reviews'));
        batch.set(reviewRef, { ...values, testerId: application.testerId, clientId: user.uid, clientName: clientDoc.data()?.companyName || clientDoc.data()?.fullName, clientAvatar: clientDoc.data()?.companyLogoUrl || clientDoc.data()?.profilePictureUrl, projectId, createdAt: serverTimestamp() });
        batch.update(appRef, { reviewId: reviewRef.id });

        const clientWalletRef = doc(db, 'wallets', user.uid);
        batch.update(clientWalletRef, { balance: clientWallet.balance - rewardAmount });

        const testerWalletRef = doc(db, 'wallets', application.testerId);
        const testerWalletSnap = await getDoc(testerWalletRef);
        const newTesterBalance = (testerWalletSnap.data()?.balance || 0) + rewardAmount;
        batch.set(testerWalletRef, { balance: newTesterBalance, currency: 'USD' }, { merge: true });
        
        batch.set(doc(collection(db, 'transactions')), { userId: user.uid, type: 'payment', amount: -rewardAmount, description: `Payment for project: ${project.title}`, status: 'completed', createdAt: serverTimestamp(), relatedUserId: application.testerId });
        batch.set(doc(collection(db, 'transactions')), { userId: application.testerId, type: 'payout', amount: rewardAmount, description: `Reward for project: ${project.title}`, status: 'completed', createdAt: serverTimestamp(), relatedUserId: user.uid });

        try {
            await batch.commit();
            toast({ title: 'Project Approved & Payment Sent!', description: 'The tester has been paid and your review has been posted.' });
            setApproveDialogOpen(false);
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Failed to process payment', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isClient = user?.uid === application?.ownerId;
    const isTester = user?.uid === application?.testerId;

    if (isLoading || !application || !project || !testerProfile || (isClient && !clientWallet)) {
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
        );
    }

    return (
        <div className="container py-12">
            <div className="mb-8"><Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Project Submission</CardTitle>
                            <CardDescription>Project: <Link href={`/projects/${projectId}`} className="text-primary hover:underline">{project?.title || 'Loading...'}</Link></CardDescription>
                        </div>
                        <Button variant="outline" asChild><Link href={`/chat/${applicationId}`}><MessageSquare className="mr-2 h-4 w-4" />Chat</Link></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Tester's view to submit work */}
                    {isTester && !application?.isApproved && (
                        <Card className="p-6 bg-muted/50">
                            <CardTitle className="text-xl mb-4">Submit a New Version</CardTitle>
                            <Form {...submissionForm}>
                                <form onSubmit={submissionForm.handleSubmit(handleSubmission)} className="space-y-6">
                                    <FormField control={submissionForm.control} name="files" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Upload Files</FormLabel>
                                            <FormControl>
                                                <label onDragEnter={handleDragOver} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={cn("flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors", isDragging && "border-primary bg-primary/10")}>
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6"><UploadCloud className={cn("w-10 h-10 mb-3 text-muted-foreground", isDragging && "text-primary")} /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag & drop</p></div>
                                                    <Input id="dropzone-file" type="file" className="hidden" multiple onChange={handleFileChange} disabled={isSubmitting} />
                                                </label>
                                            </FormControl>
                                            <FormMessage />
                                            {selectedFiles.length > 0 && (
                                                <div className="mt-4 space-y-2"><h4 className="text-sm font-medium mb-2">Selected files:</h4>
                                                    <ul className="space-y-2">{selectedFiles.map((file, index) => (<li key={index} className="text-sm text-muted-foreground flex items-center justify-between gap-2 bg-background p-2 rounded-md border"><div className="flex items-center gap-2 truncate"><Paperclip className="h-4 w-4 flex-shrink-0" /><span className="truncate">{file.name}</span></div><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSelectedFile(index)}><X className="h-4 w-4 text-destructive" /></Button></li>))}</ul>
                                                </div>
                                            )}
                                        </FormItem>
                                    )} />
                                    <FormField control={submissionForm.control} name="comments" render={({ field }) => (
                                        <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea placeholder="Add any comments about your submission..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="submit" disabled={isSubmitting}><Upload className="mr-2 h-4 w-4" />{isSubmitting ? 'Submitting...' : `Submit Version ${submissions.length + 1}`}</Button>
                                </form>
                            </Form>
                        </Card>
                    )}

                    {/* Client's view for feedback and approval */}
                    {isClient && !application?.isApproved && submissions.length > 0 && (
                        <div className="space-y-6">
                            <Card className="p-6 bg-muted/50">
                                <CardTitle className="text-xl mb-4">Feedback & Approval</CardTitle>
                                <div className="grid md:grid-cols-2 gap-4">
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline"><Edit className="mr-2 h-4 w-4" />Request Edits / Send Feedback</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Request Edits</DialogTitle><DialogDescription>Provide feedback to the tester. They will be notified to upload a new version.</DialogDescription></DialogHeader>
                                            <Form {...requestEditsForm}>
                                                <form onSubmit={requestEditsForm.handleSubmit(handleRequestEdits)} className="space-y-4">
                                                    <FormField control={requestEditsForm.control} name="feedbackComment" render={({ field }) => (
                                                        <FormItem><FormControl><Textarea placeholder="e.g., 'Please address the bug on the login screen and resubmit.'" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send Feedback'}</Button>
                                                    </DialogFooter>
                                                </form>
                                            </Form>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog open={isApproveDialogOpen} onOpenChange={setApproveDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button><Check className="mr-2 h-4 w-4" />Approve & Pay Tester</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Approve Submission & Release Payment</DialogTitle>
                                                <DialogDescription>Leave a final review for the tester. This will be public on their profile. Payment will be released upon submission.</DialogDescription>
                                            </DialogHeader>
                                            {!clientWallet || clientWallet.balance < (project?.compensation ?? 0) ? (
                                                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Insufficient Funds</AlertTitle><AlertDescription>Your balance is too low. Please <Link href="/wallet" className="font-bold underline">add funds</Link>.</AlertDescription></Alert>
                                            ) : (
                                                <Form {...feedbackForm}>
                                                    <form onSubmit={feedbackForm.handleSubmit(handleApproveAndPay)} className="space-y-6">
                                                        <FormField control={feedbackForm.control} name="rating" render={({ field }) => (
                                                            <FormItem><FormLabel>Rating</FormLabel><FormControl><div className="flex items-center gap-2">{[...Array(5)].map((_, i) => (<Star key={i} className={cn('h-8 w-8 cursor-pointer', i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300')} onClick={() => { if (!isSubmitting) { setRating(i + 1); field.onChange(i + 1); }}} />))}</div></FormControl><FormMessage /></FormItem>
                                                        )} />
                                                        <FormField control={feedbackForm.control} name="comment" render={({ field }) => (
                                                            <FormItem><FormLabel>Final Comments</FormLabel><FormControl><Textarea placeholder="Great work on the final submission!" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                                                        )} />
                                                        <DialogFooter>
                                                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project?.compensation ?? 0)}`}</Button>
                                                        </DialogFooter>
                                                    </form>
                                                </Form>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </Card>
                            
                        </div>
                    )}
                    
                    {/* Display approval and payment status */}
                     {application?.isApproved && (
                        <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                            <Check className="h-4 w-4 !text-green-500" />
                            <AlertTitle>Project Approved</AlertTitle>
                            <AlertDescription>
                                You approved this project and paid the tester <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(application.rewardedAmount ?? 0)}</strong>.
                                {application.reviewId && isClient && (
                                    <Button asChild variant="link" className="p-0 h-auto ml-2"><Link href={`/profile`}>View your review</Link></Button>
                                )}
                            </AlertDescription>
                        </Alert>
                     )}
                     
                    {/* Tester's view of feedback */}
                    {isTester && application?.feedbackComment && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Feedback from Client</AlertTitle>
                            <AlertDescription>{application.feedbackComment}</AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Submission History */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-xl">Submission History</h3>
                        {submissions.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <FileText className="mx-auto h-12 w-12 mb-4" />
                                <p>{isTester ? "You have not submitted your work yet." : "The tester has not submitted any work yet."}</p>
                            </div>
                        ) : (
                            submissions.map((version, index) => (
                                <div key={version.id}>
                                    {index > 0 && <Separator className="my-6" />}
                                    <CardHeader className="p-0 mb-4">
                                        <CardTitle className="text-lg">Version {version.version}</CardTitle>
                                        <CardDescription>Submitted {formatDistanceToNow(version.submittedAt.toDate(), { addSuffix: true })}</CardDescription>
                                    </CardHeader>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <Link href={`/users/${application?.testerId}`}><Avatar><AvatarImage src={testerProfile?.avatarUrl} /><AvatarFallback>{getInitials(testerProfile?.name)}</AvatarFallback></Avatar></Link>
                                            <div><p className="font-semibold">{testerProfile?.name}</p><p className="text-sm text-muted-foreground">{version.comments}</p></div>
                                        </div>
                                        {version.files && version.files.length > 0 && (
                                            <div className="pt-2">
                                                <p className="text-sm font-medium text-muted-foreground mb-2">Submitted Files:</p>
                                                <div className="flex flex-wrap gap-2">{version.files.map((file, fIndex) => (<Button asChild variant="outline" key={fIndex} className="mr-2"><a href={file.url} target="_blank" download={file.name}><Download className="mr-2 h-4 w-4" />{file.name}</a></Button>))}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}


    