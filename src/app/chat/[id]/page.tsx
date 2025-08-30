
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDoc, DocumentData, updateDoc, Timestamp, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, Image as ImageIcon, Smile, Reply, MoreHorizontal, X, Edit, Trash2, Pin, ThumbsUp, Heart, Laugh } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import TextareaAutosize from 'react-textarea-autosize';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from 'next-themes';


interface Message {
    id: string;
    text?: string;
    imageUrl?: string;
    senderId: string;
    timestamp: Timestamp;
    editedAt?: Timestamp;
    isPinned?: boolean;
    replyTo?: {
        id: string;
        text: string;
        senderName: string;
    };
    reactions?: {
        [emoji: string]: string[]; // emoji: list of user UIDs who reacted
    }
}

interface OtherUser {
    uid: string;
    name: string;
    avatarUrl: string;
}

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const EDIT_TIME_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

const availableReactions = ['👍', '❤️', '😂'];


export default function ChatPage() {
    const [user, setUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [projectTitle, setProjectTitle] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);


    const router = useRouter();
    const params = useParams();
    const applicationId = params.id as string;
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();


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

    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);


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
                const q = query(messagesColRef, orderBy('timestamp', 'asc'));

                const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
                    const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                    setMessages(msgs);
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching messages:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load messages.' });
                    setIsLoading(false);
                });

                return () => unsubscribeMessages();
            };
            fetchChatParticipants();
        }
    }, [user, applicationId, router, toast]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || isSending) return;

        setIsSending(true);

        if (editingMessage) {
            const messageRef = doc(db, 'applications', applicationId, 'messages', editingMessage.id);
            try {
                await updateDoc(messageRef, {
                    text: newMessage,
                    editedAt: serverTimestamp()
                });
                setNewMessage('');
                setEditingMessage(null);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not update message.' });
            } finally {
                setIsSending(false);
            }

        } else {
            const messagesColRef = collection(db, 'applications', applicationId, 'messages');
            
            const messageData: any = {
                text: newMessage,
                senderId: user.uid,
                timestamp: serverTimestamp()
            };
            
            if (replyingTo) {
                messageData.replyTo = {
                    id: replyingTo.id,
                    text: replyingTo.text || 'Image',
                    senderName: replyingTo.senderId === user.uid ? 'You' : otherUser?.name || 'User'
                };
            }
            
            try {
                await addDoc(messagesColRef, messageData);
                setNewMessage('');
                setReplyingTo(null);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
            } finally {
                setIsSending(false);
            }
        }
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !user || isSending) return;
        
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: `Image is too large. Maximum allowed size is ${MAX_IMAGE_SIZE_MB} MB.`
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setIsSending(true);
        try {
            const storageRef = ref(storage, `chat_images/${applicationId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);

            const messagesColRef = collection(db, 'applications', applicationId, 'messages');
             const messageData: any = {
                imageUrl: imageUrl,
                senderId: user.uid,
                timestamp: serverTimestamp()
            };

            if (replyingTo) {
                 messageData.replyTo = {
                    id: replyingTo.id,
                    text: replyingTo.text || 'Image',
                    senderName: replyingTo.senderId === user.uid ? 'You' : otherUser?.name || 'User'
                };
            }

            await addDoc(messagesColRef, messageData);
            setReplyingTo(null);

        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not upload image.' });
        } finally {
            setIsSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleStartEdit = (message: Message) => {
        const now = Date.now();
        const messageTime = message.timestamp.toMillis();
        if (now - messageTime > EDIT_TIME_LIMIT_MS) {
            toast({ variant: 'destructive', title: 'Cannot Edit', description: 'You can only edit messages for 5 minutes after sending.'});
            return;
        }
        setEditingMessage(message);
        setNewMessage(message.text || '');
        setReplyingTo(null);
    }
    
    const cancelEdit = () => {
        setEditingMessage(null);
        setNewMessage('');
    }

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const messageRef = doc(db, 'applications', applicationId, 'messages', messageId);
            await deleteDoc(messageRef);
            toast({ title: "Message Deleted", description: "The message has been removed."});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete message.' });
        }
    };
    
    const handleTogglePinMessage = async (message: Message) => {
        try {
            const messageRef = doc(db, 'applications', applicationId, 'messages', message.id);
            await updateDoc(messageRef, {
                isPinned: !message.isPinned
            });
            toast({ title: message.isPinned ? "Message Unpinned" : "Message Pinned" });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not update pin status.' });
        }
    };

    const handleReaction = async (message: Message, emoji: string) => {
        if (!user) return;
        
        const messageRef = doc(db, 'applications', applicationId, 'messages', message.id);
        const reactionPath = `reactions.${emoji}`;
        const userHasReacted = message.reactions?.[emoji]?.includes(user.uid);

        try {
            if (userHasReacted) {
                // Atomically remove a value from an array
                await updateDoc(messageRef, {
                    [reactionPath]: arrayRemove(user.uid)
                });
            } else {
                // Atomically add a new value to an array
                 await updateDoc(messageRef, {
                    [reactionPath]: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Error updating reaction:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update reaction.' });
        }
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
             <div className="flex flex-col h-screen bg-background">
                <header className="flex items-center gap-4 border-b p-4 h-20">
                     <Skeleton className="h-12 w-12 rounded-full" />
                     <div className="space-y-2">
                         <Skeleton className="h-5 w-32" />
                         <Skeleton className="h-4 w-48" />
                     </div>
                </header>
                <main className="flex-1 p-6 space-y-4 overflow-y-hidden">
                    <Skeleton className="h-10 w-3/4" />
                    <div className="flex justify-end w-full"><Skeleton className="h-10 w-1/2" /></div>
                    <Skeleton className="h-8 w-3/5" />
                </main>
                <footer className="p-4 border-t"><Skeleton className="h-11 w-full" /></footer>
            </div>
        )
    }

    const pinnedMessages = messages.filter(m => m.isPinned);

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center gap-4 border-b p-4 h-20 flex-shrink-0">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Avatar>
                    <AvatarImage src={otherUser?.avatarUrl} alt={otherUser?.name} />
                    <AvatarFallback>{getInitials(otherUser?.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-lg font-semibold">{otherUser?.name || 'Chat'}</h2>
                    <p className="text-sm text-muted-foreground">Regarding project: {projectTitle}</p>
                </div>
            </header>

            {pinnedMessages.length > 0 && (
            <div className="p-2 border-b bg-secondary/50">
                {pinnedMessages.map(msg => (
                        <div key={`pin-${msg.id}`} className="p-2 rounded-md text-xs text-muted-foreground flex items-center gap-2 container">
                        <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="font-semibold">{msg.senderId === user?.uid ? "You" : otherUser?.name}:</span>
                        <p className="truncate">{msg.text || "Image"}</p>
                    </div>
                ))}
            </div>
            )}
            
            <main ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-1">
                <div className="container">
                    {messages.map((msg) => {
                        const isSender = msg.senderId === user?.uid;
                        const canEdit = isSender && (Date.now() - msg.timestamp?.toMillis()) < EDIT_TIME_LIMIT_MS;
                        
                        return (
                         <div key={msg.id} className={cn("group flex items-center gap-2 max-w-[85%]", isSender ? "ml-auto flex-row-reverse" : "mr-auto")}>
                             <Avatar className="h-8 w-8 self-end mb-4">
                                <AvatarImage src={isSender ? user?.photoURL! : otherUser?.avatarUrl} />
                                <AvatarFallback>{getInitials(isSender ? user?.displayName! : otherUser?.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1 w-full">
                                <div className={cn("flex items-center gap-2", isSender ? "flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "rounded-lg px-4 py-2 text-sm max-w-max", 
                                        isSender ? "bg-primary text-primary-foreground" : "bg-secondary",
                                        msg.isPinned && "bg-primary/20 dark:bg-primary/30"
                                    )}>
                                            {msg.replyTo && (
                                                <div className="border-l-2 border-primary/50 pl-2 mb-2 text-xs opacity-80">
                                                    <p className="font-semibold">{msg.replyTo.senderName} replied:</p>
                                                    <p className="truncate">{msg.replyTo.text}</p>
                                                </div>
                                            )}

                                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                            {msg.imageUrl && (
                                                <Link href={msg.imageUrl} target="_blank">
                                                    <Image src={msg.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md max-w-xs cursor-pointer" />
                                                </Link>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                {msg.isPinned && <Pin className="h-3 w-3 text-primary" />}
                                                {msg.editedAt && (
                                                    <span className="text-xs text-muted-foreground/70">(edited)</span>
                                                )}
                                            </div>
                                    </div>
                                    <div className={cn("flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity", isSender ? "flex-row-reverse" : "")}>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <Smile className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-1">
                                                <div className="flex gap-1">
                                                {availableReactions.map(emoji => (
                                                    <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReaction(msg, emoji)}>
                                                        <span className="text-lg">{emoji}</span>
                                                    </Button>
                                                ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyingTo(msg)}>
                                            <Reply className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleTogglePinMessage(msg)}>
                                                    <Pin className="mr-2 h-4 w-4" />
                                                    <span>{msg.isPinned ? 'Unpin' : 'Pin'}</span>
                                                </DropdownMenuItem>
                                                {isSender && canEdit && msg.text && (
                                                    <DropdownMenuItem onClick={() => handleStartEdit(msg)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {isSender && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone. This will permanently delete the message.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                     <div className={cn("flex gap-1 items-center -mt-2", isSender ? "justify-end" : "justify-start")}>
                                        {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                            uids.length > 0 && (
                                                <div key={emoji} className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs flex items-center gap-1 shadow-sm">
                                                    <span>{emoji}</span>
                                                    <span>{uids.length}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    })}
                </div>
            </main>
            <footer className="p-4 border-t flex-shrink-0 bg-background">
                <div className="container">
                    {(replyingTo || editingMessage) && (
                        <div className="bg-secondary/70 w-full p-2 mb-2 rounded-md text-sm text-muted-foreground flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderId === user?.uid ? 'yourself' : otherUser?.name}`}</p>
                                <p className="truncate max-w-sm">{editingMessage?.text || replyingTo?.text || 'Image'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReplyingTo(null); cancelEdit(); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                         <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isSending} />
                         <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                            <ImageIcon className="h-5 w-5" />
                            <span className="sr-only">Upload Image</span>
                         </Button>

                         <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" disabled={isSending}>
                                    <Smile className="h-5 w-5" />
                                    <span className="sr-only">Add Emoji</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none">
                               <EmojiPicker 
                                  onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)}
                                  theme={resolvedTheme === 'dark' || resolvedTheme === 'midnight' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                               />
                            </PopoverContent>
                         </Popover>

                        <TextareaAutosize
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            autoComplete="off"
                            className="flex-1 resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 shadow-none px-2 py-3"
                            maxRows={5}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    handleSendMessage(e);
                                }
                            }}
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">{editingMessage ? 'Save Changes' : 'Send'}</span>
                        </Button>
                    </form>
                </div>
            </footer>
        </div>
    )

}

    

    