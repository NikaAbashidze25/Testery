
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, type DocumentData, writeBatch, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Star, Upload, FileText, Paperclip, X, UploadCloud, Check, DollarSign, AlertTriangle, MessageSquare, Edit } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { notifySubmissionReceived } from '@/lib/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    path: string; // Add path for deletion
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
    testerInfo?: {
        fullName: string;
        profilePictureUrl: string;
    };
}

interface ProjectData extends DocumentData {
    title: string;
    compensation: number;
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
    const [project, setProject] = useState<ProjectData | null>(null);
    const [application, setApplication] = useState<DocumentData | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingFiles, setExistingFiles] = useState<SubmissionFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
    const [clientWallet, setClientWallet] = useState<WalletData | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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
        if (!user || !applicationId) return;

        const fetchStaticData = async () => {
             setIsLoading(true);
            try {
                const projectDoc = await getDoc(doc(db, 'projects', projectId));
                if (projectDoc.exists()) setProject(projectDoc.data() as ProjectData);

                const appDoc = await getDoc(doc(db, 'applications', applicationId));
                 if (appDoc.exists()) {
                    const appData = appDoc.data();
                    setApplication(appData);

                    const isTester = user.uid === appData.testerId;
                    const isClient = user.uid === appData.ownerId;

                    if (!isTester && !isClient) {
                         toast({ variant: 'destructive', title: 'Unauthorized', description: 'You cannot view this page.' });
                         router.push('/');
                         return;
                    }
                } else {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'Application not found.' });
                    router.push('/');
                    return;
                }
            } catch (e) {
                 console.error(e);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load page data.' });
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchStaticData();

        const submissionUnsub = onSnapshot(doc(db, 'submissions', applicationId), async (docSnap) => {
            if (docSnap.exists()) {
                const subData = docSnap.data() as Submission;

                // Fetch tester info if not already present
                 if (subData.testerId && !subData.testerInfo) {
                    const testerDocRef = doc(db, 'users', subData.testerId);
                    const testerDocSnap = await getDoc(testerDocRef);
                    if (testerDocSnap.exists()) {
                        const testerData = testerDocSnap.data();
                        subData.testerInfo = {
                            fullName: testerData.fullName || 'Unknown Tester',
                            profilePictureUrl: testerData.profilePictureUrl || ''
                        };
                    }
                }

                setSubmission(subData);
                if (subData.feedback) {
                    feedbackForm.reset(subData.feedback);
                    setRating(subData.feedback.rating);
                }

                 if (!subData.clientId) return;
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
            } else {
                setSubmission(null);
            }
        });

        if (user) {
            const walletUnsub = onSnapshot(doc(db, 'wallets', user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setClientWallet(docSnap.data() as WalletData);
                } else {
                    setClientWallet({ balance: 0, currency: 'USD' });
                }
            });
             return () => {
                submissionUnsub();
                walletUnsub();
            };
        }

        return () => {
            submissionUnsub();
        };

    }, [user, applicationId, projectId, router, toast, feedbackForm]);


    const handleSubmission = async (values: SubmissionFormValues) => {
        if (!user || !application || !project) return;
        setIsSubmitting(true);
        try {
            const finalFiles: SubmissionFile[] = [...existingFiles];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const filePath = `submissions/${applicationId}/${Date.now()}-${file.name}`;
                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    finalFiles.push({ name: file.name, url, path: filePath });
                }
            }
    
            // Handle removed files
            if (submission?.files) {
                const filesToDelete = submission.files.filter(
                    (sf) => !existingFiles.some((ef) => ef.url === sf.url)
                );
    
                for (const fileToDelete of filesToDelete) {
                    try {
                        const fileRef = ref(storage, fileToDelete.path);
                        await deleteObject(fileRef);
                    } catch (error: any) {
                        // If file not found, we can ignore, otherwise log it
                        if (error.code !== 'storage/object-not-found') {
                            console.error("Error deleting file from storage:", error);
                        }
                    }
                }
            }

            const submissionRef = doc(db, 'submissions', applicationId);
            const submissionDoc = await getDoc(submissionRef);

            const submissionData = {
                testerId: user.uid,
                clientId: application.ownerId,
                projectId,
                comments: values.comments || '',
                submittedAt: serverTimestamp(),
                files: finalFiles,
            };
            
            if (submissionDoc.exists()) {
                await updateDoc(submissionRef, submissionData);
                toast({ title: 'Success', description: 'Your submission has been updated.' });
            } else {
                await setDoc(submissionRef, submissionData);
                await notifySubmissionReceived(
                    application.ownerId, 
                    projectId, 
                    project.title, 
                    user.displayName || 'A tester', 
                    applicationId
                );
                toast({ title: 'Success', description: 'Your work has been submitted.' });
            }
            setIsEditing(false); // Exit editing mode
            setSelectedFiles([]); // Clear new files
            
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
        event.target.value = '';
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
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        addFilesToList(e.dataTransfer.files);
    };


    const handleRemoveNewFile = (indexToRemove: number) => {
        const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
        setSelectedFiles(updatedFiles);
        submissionForm.setValue('files', updatedFiles);
    };

    const handleRemoveExistingFile = (urlToRemove: string) => {
        const updatedFiles = existingFiles.filter((file) => file.url !== urlToRemove);
        setExistingFiles(updatedFiles);
    };
    
    const handleFeedback = async (values: FeedbackFormValues) => {
        if (!user || !submission || !project || !clientWallet) return;

        const rewardAmount = parseFloat(String(project.compensation));
        if (rewardAmount > clientWallet.balance) {
            toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your wallet balance is too low to release the payment. Please add funds.' });
            return;
        }
         
        setIsSubmitting(true);
        const batch = writeBatch(db);

        const submissionRef = doc(db, 'submissions', applicationId);
        batch.update(submissionRef, { feedback: values, rewardedAmount: rewardAmount });

        const clientUser = await getDoc(doc(db, 'users', user.uid));
        const clientData = clientUser.data();
        const reviewRef = doc(collection(db, 'reviews'));
        batch.set(reviewRef, {
            ...values,
            testerId: submission.testerId,
            clientId: user.uid,
            clientName: clientData?.companyName || clientData?.fullName,
            clientAvatar: clientData?.companyLogoUrl || clientData?.profilePictureUrl,
            projectId: submission.projectId,
            createdAt: serverTimestamp()
        });
         
        const clientWalletRef = doc(db, 'wallets', user.uid);
        batch.update(clientWalletRef, { balance: clientWallet.balance - rewardAmount });

        const testerWalletRef = doc(db, 'wallets', submission.testerId);
        const testerWalletSnap = await getDoc(testerWalletRef);
        const testerWalletData = testerWalletSnap.data();
        const newTesterBalance = (testerWalletData?.balance || 0) + rewardAmount;
        batch.set(testerWalletRef, { balance: newTesterBalance, currency: 'USD' }, { merge: true });
        
        const clientTransactionRef = doc(collection(db, 'transactions'));
        batch.set(clientTransactionRef, {
            userId: user.uid,
            type: 'payment',
            amount: -rewardAmount,
            description: `Payment for project: ${project.title}`,
            status: 'completed',
            createdAt: serverTimestamp(),
            relatedUserId: submission.testerId,
        });
        
        const testerTransactionRef = doc(collection(db, 'transactions'));
        batch.set(testerTransactionRef, {
            userId: submission.testerId,
            type: 'payout',
            amount: rewardAmount,
            description: `Reward for project: ${project.title}`,
            status: 'completed',
            createdAt: serverTimestamp(),
            relatedUserId: user.uid,
        });

         try {
            await batch.commit();
            toast({ title: 'Feedback & Payment Sent!', description: 'You have successfully submitted feedback and the payment has been sent.' });
            setClientWallet(prev => prev ? { ...prev, balance: prev.balance - rewardAmount } : null);
         } catch(error: any) {
              toast({ variant: 'destructive', title: 'Failed to submit feedback', description: error.message });
         } finally {
            setIsSubmitting(false);
         }
    };
    
    const handleStartEdit = () => {
        setIsEditing(true);
        submissionForm.setValue('comments', submission?.comments || '');
        setExistingFiles(submission?.files || []);
        setSelectedFiles([]); 
    };

    const isClient = user?.uid === application?.ownerId;
    const isTester = user?.uid === application?.testerId;
    const projectCompensation = project ? parseFloat(String(project.compensation)) : 0;
    const hasSufficientFunds = isClient && project && clientWallet ? clientWallet.balance >= projectCompensation : false;


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

    const renderSubmissionForm = () => (
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
                        {(existingFiles.length > 0 || selectedFiles.length > 0) && (
                             <div className="mt-4 space-y-4">
                                {existingFiles.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Current files:</h4>
                                        <ul className="space-y-2 bg-muted/50 p-3 rounded-md">
                                        {existingFiles.map((file, index) => (
                                            <li key={index} className="text-sm text-muted-foreground flex items-center justify-between gap-2 bg-background p-2 rounded-md border">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{file.name}</span>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveExistingFile(file.url)}>
                                                    <X className="h-4 w-4 text-destructive" />
                                                    <span className="sr-only">Remove file</span>
                                                </Button>
                                            </li>
                                        ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedFiles.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">New files to upload:</h4>
                                        <ul className="space-y-2 bg-muted/50 p-3 rounded-md">
                                        {selectedFiles.map((file, index) => (
                                            <li key={index} className="text-sm text-muted-foreground flex items-center justify-between gap-2 bg-background p-2 rounded-md border">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{file.name}</span>
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveNewFile(index)}>
                                                    <X className="h-4 w-4 text-destructive" />
                                                    <span className="sr-only">Remove file</span>
                                                </Button>
                                            </li>
                                        ))}
                                        </ul>
                                    </div>
                                )}
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
                 <div className="flex gap-4">
                    <Button type="submit" disabled={isSubmitting}>
                        <Upload className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Submission' : 'Submit Work')}
                    </Button>
                    {isEditing && (
                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    );

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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl">Project Submission</CardTitle>
                            <CardDescription>
                                Project: <Link href={`/projects/${projectId}`} className="text-primary hover:underline">{project?.title || 'Loading...'}</Link>
                            </CardDescription>
                        </div>
                         <Button variant="outline" asChild>
                            <Link href={`/chat/${applicationId}`}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {(!submission || isEditing) && isTester && renderSubmissionForm()}

                    {submission && !isEditing && (
                        <div className="space-y-6">
                             <div>
                                <h3 className="font-semibold text-lg mb-4">Submission Details</h3>
                                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                     <div className="flex items-center gap-3">
                                        <Link href={`/users/${submission.testerId}`}>
                                            <Avatar>
                                                <AvatarImage src={submission.testerInfo?.profilePictureUrl} alt={submission.testerInfo?.fullName} />
                                                <AvatarFallback>{getInitials(submission.testerInfo?.fullName)}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Submission from</p>
                                            <Link href={`/users/${submission.testerId}`} className="font-semibold text-foreground hover:underline">
                                                {submission.testerInfo?.fullName || 'Unknown Tester'}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Comments:</p>
                                        <p className="text-foreground">{submission.comments || 'No comments provided.'}</p>
                                    </div>
                                    {submission.files && submission.files.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Submitted Files:</p>
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
                                     {isTester && !submission.feedback && (
                                        <div className="pt-4 border-t">
                                            <Button onClick={handleStartEdit}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Submission
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="border-t pt-6">
                                {submission.rewardedAmount ? (
                                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center gap-3">
                                        <Check className="h-5 w-5" />
                                        <p>You have rewarded this tester with <strong>${parseFloat(String(submission.rewardedAmount)).toFixed(2)}</strong>.</p>
                                     </div>
                                ) : (
                                    <h3 className="font-semibold text-lg mb-4">Feedback &amp; Payment</h3>
                                )}

                                {submission.feedback && clientProfile && (
                                     <div className="p-4 border rounded-lg bg-muted/50 space-y-4 mt-4">
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
                                    <>
                                        {!hasSufficientFunds && project && (
                                            <Alert variant="destructive" className="mb-6">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Insufficient Funds</AlertTitle>
                                                <AlertDescription>
                                                    Your wallet balance is too low to pay the project compensation of ${parseFloat(String(project.compensation)).toFixed(2)}. 
                                                    Please <Link href="/wallet" className="font-bold underline">add funds</Link> to your wallet before providing feedback.
                                                </AlertDescription>
                                            </Alert>
                                        )}
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
                                                                            if (!isSubmitting && hasSufficientFunds) {
                                                                                setRating(i + 1);
                                                                                field.onChange(i + 1);
                                                                            }
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
                                                            <Textarea placeholder="Provide feedback on the tester's work..." {...field} disabled={isSubmitting || !hasSufficientFunds} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                    )}
                                                />
                                                <div>
                                                    <Button type="submit" disabled={isSubmitting || !hasSufficientFunds}>
                                                        {isSubmitting ? 'Processing...' : 'Submit Feedback & Pay Tester'}
                                                    </Button>
                                                    {project && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Submitting feedback will automatically transfer ${parseFloat(String(project.compensation)).toFixed(2)} to the tester.
                                                        </p>
                                                    )}
                                                </div>
                                            </form>
                                        </Form>
                                    </>
                                )}
                                {submission && !submission.feedback && isTester && (
                                     <div className="text-center text-muted-foreground py-8">
                                        <FileText className="mx-auto h-12 w-12 mb-4" />
                                        <p>Waiting for client to provide feedback.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                     {!submission && !isEditing && isClient && (
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
