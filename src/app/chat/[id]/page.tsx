
'use client';

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDoc, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
}

interface OtherUser {
    uid: string;
    name: string;
    avatarUrl: string;
}

export default function ChatPage() {
    const [user, setUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [projectTitle, setProjectTitle] = useState<string>('');

    const router = useRouter();
    const params = useParams();
    const applicationId = params.id as string;
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (user && applicationId) {
            const fetchChatParticipants = async () => {
                const appDocRef = doc(db, 'applications', applicationId);
                const appDocSnap = await getDoc(appDocRef);

                if (!appDocSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Chat not found.' });
                    router.push('/');
                    return;
                }
                
                const appData = appDocSnap.data();
                setProjectTitle(appData.projectTitle);

                const isOwner = user.uid === appData.ownerId;
                const isTester = user.uid === appData.testerId;

                if (!isOwner && !isTester) {
                    toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have access to this chat.' });
                    router.push('/');
                    return;
                }

                const otherUserId = isOwner ? appData.testerId : appData.ownerId;
                const otherUserDocRef = doc(db, 'users', otherUserId);
                const otherUserDocSnap = await getDoc(otherUserDocRef);

                if (otherUserDocSnap.exists()) {
                    const otherUserData = otherUserDocSnap.data();
                    setOtherUser({
                        uid: otherUserId,
                        name: otherUserData.companyName || otherUserData.fullName,
                        avatarUrl: otherUserData.companyLogoUrl || otherUserData.profilePictureUrl
                    });
                }
                
                const messagesColRef = collection(db, 'applications', applicationId, 'messages');
                const q = query(messagesColRef, orderBy('timestamp'));

                const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
                    const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                    setMessages(msgs);
                    setIsLoading(false);
                });

                return () => unsubscribeMessages();
            };
            fetchChatParticipants();
        }
    }, [user, applicationId, router, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        const messagesColRef = collection(db, 'applications', applicationId, 'messages');
        await addDoc(messagesColRef, {
            text: newMessage,
            senderId: user.uid,
            timestamp: serverTimestamp()
        });

        setNewMessage('');
    };

    const getInitials = (name: string | undefined) => {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
        }
        return name[0];
    };
    
    if (isLoading) {
        return (
             <div className="container py-12">
                 <Skeleton className="h-10 w-24 mb-6" />
                <Card className="max-w-3xl mx-auto h-[70vh] flex flex-col">
                    <CardHeader className="flex flex-row items-center gap-4 border-b">
                         <Skeleton className="h-12 w-12 rounded-full" />
                         <div className="space-y-2">
                             <Skeleton className="h-5 w-32" />
                             <Skeleton className="h-4 w-48" />
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-6 space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-10 w-1/2 self-end" />
                        <Skeleton className="h-8 w-3/5" />
                    </CardContent>
                    <CardFooter><Skeleton className="h-11 w-full" /></CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="container py-12">
            <div className="mb-6">
                 <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card className="max-w-3xl mx-auto h-[70vh] flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 border-b">
                     <Avatar>
                        <AvatarImage src={otherUser?.avatarUrl} alt={otherUser?.name} />
                        <AvatarFallback>{getInitials(otherUser?.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg">{otherUser?.name || 'Chat'}</CardTitle>
                         <p className="text-sm text-muted-foreground">Regarding project: {projectTitle}</p>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                         <div key={msg.id} className={cn("flex items-end gap-2 max-w-[75%]", msg.senderId === user?.uid ? "ml-auto flex-row-reverse" : "mr-auto")}>
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.senderId === user?.uid ? user.photoURL! : otherUser?.avatarUrl} />
                                <AvatarFallback>{getInitials(msg.senderId === user?.uid ? user.displayName! : otherUser?.name)}</AvatarFallback>
                            </Avatar>
                           <div className={cn("rounded-lg px-4 py-2 text-sm", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                <p>{msg.text}</p>
                           </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            autoComplete="off"
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )

}
