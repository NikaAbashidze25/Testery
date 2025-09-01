
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
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
import { Send, Smile, Reply, MoreHorizontal, X, Edit, Trash2, Pin, Info, Search, Paperclip, Menu, File as FileIcon, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// Interfaces
interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
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
    [emoji: string]: string[];
  };
}

interface OtherUser {
  uid: string;
  name: string;
  avatarUrl: string;
}

interface ChatListItem extends DocumentData {
  id: string;
  projectTitle: string;
  testerId: string;
  ownerId: string;
  lastMessage?: string;
  lastMessageTimestamp?: {
    seconds: number;
    nanoseconds: number;
  };
  otherUserName?: string;
  otherUserAvatar?: string;
}

// Constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const EDIT_TIME_LIMIT_MS = 5 * 60 * 1000;
const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];


// Helper function
const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  const names = name.split(' ');
  if (names.length > 1) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name[0];
};

// Sub-components
const ChatList = ({ user, chats, activeChatId, onSelectChat }: { user: User; chats: ChatListItem[]; activeChatId?: string; onSelectChat: (id: string) => void }) => {
  
  const formatTimestamp = (timestamp: ChatListItem['lastMessageTimestamp']) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
     <div className="flex flex-col h-full bg-secondary/50 border-r overflow-y-auto">
      <div className="p-4 border-b sticky top-0 bg-secondary/50 z-10">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Chats</h2>
        </div>
         <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-9 bg-background" />
        </div>
      </div>
      <div className="flex-1">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              "w-full text-left p-3 flex items-center gap-3 transition-colors hover:bg-accent",
              chat.id === activeChatId && "bg-accent"
            )}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={chat.otherUserAvatar} />
              <AvatarFallback>{getInitials(chat.otherUserName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <div className="flex justify-between items-center">
                <span className="font-semibold truncate text-sm">{chat.otherUserName}</span>
                <span className="text-xs text-muted-foreground">{formatTimestamp(chat.lastMessageTimestamp)}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || '...'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatInfoPanel = ({ messages, otherUser, projectTitle, onTogglePin }: { messages: Message[]; otherUser: OtherUser | null, projectTitle: string, onTogglePin: (message: Message) => void }) => {
  const pinnedMessages = messages.filter(m => m.isPinned);
  const sharedImages = messages.filter(m => m.imageUrl);
  const sharedFiles = messages.filter(m => m.fileUrl);

  return (
    <div className="flex flex-col h-full bg-secondary/50 border-l overflow-y-auto w-[280px]">
       <div className="p-4 text-center border-b">
         <Avatar className="h-20 w-20 mx-auto">
            <AvatarImage src={otherUser?.avatarUrl} />
            <AvatarFallback className="text-3xl">{getInitials(otherUser?.name)}</AvatarFallback>
         </Avatar>
         <div className="mt-2 space-y-1">
            <h3 className="text-lg font-semibold">{otherUser?.name}</h3>
            <p className="text-sm text-muted-foreground">Project: {projectTitle}</p>
         </div>
      </div>
      <div className="flex-1 p-2">
        <Accordion type="multiple" defaultValue={['pinned', 'photos', 'files']} className="w-full">
            <AccordionItem value="pinned">
                <AccordionTrigger className="px-2 font-semibold flex items-center gap-2"><Pin className="h-4 w-4" /> Pinned Messages</AccordionTrigger>
                <AccordionContent className="px-2">
                    <div className="space-y-2 text-sm">
                        {pinnedMessages.length > 0 ? pinnedMessages.map(msg => (
                            <div key={`pin-info-${msg.id}`} className="group/pin p-2 bg-muted rounded-md text-muted-foreground flex justify-between items-start gap-2 hover:bg-muted/80">
                                <div className="flex-grow">
                                    <p className="truncate">{msg.text || 'Shared Media'}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 opacity-50 group-hover/pin:opacity-100" onClick={() => onTogglePin(msg)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )) : <p className="text-xs text-muted-foreground text-center py-2">No pinned messages.</p>}
                    </div>
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="photos">
                <AccordionTrigger className="px-2 font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Shared Photos</AccordionTrigger>
                <AccordionContent className="px-2">
                     <div className="grid grid-cols-3 gap-2 mt-2">
                        {sharedImages.length > 0 ? sharedImages.slice(0, 9).map(msg => (
                            <Link key={`img-info-${msg.id}`} href={msg.imageUrl!} target="_blank" className="aspect-square">
                                <Image src={msg.imageUrl!} alt="Shared media" width={100} height={100} className="rounded-md object-cover w-full h-full" />
                            </Link>
                        )) : <p className="text-xs text-muted-foreground text-center py-2 col-span-3">No shared photos.</p>}
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="files">
                <AccordionTrigger className="px-2 font-semibold flex items-center gap-2"><FileIcon className="h-4 w-4" /> Shared Files</AccordionTrigger>
                <AccordionContent className="px-2">
                    <div className="space-y-2 text-sm">
                        {sharedFiles.length > 0 ? sharedFiles.map(msg => (
                           <a href={msg.fileUrl} key={msg.id} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                             <FileIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground"/>
                             <span className="truncate text-muted-foreground">{msg.fileName}</span>
                           </a>
                        )) : <p className="text-xs text-muted-foreground text-center py-2">No files shared yet.</p>}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};


export function Chat({ initialApplicationId }: { initialApplicationId?: string }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChat, setActiveChat] = useState<{ id: string, otherUser: OtherUser | null, projectTitle: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme } = useTheme();
  const prevMessagesCountRef = useRef(messages.length);

  // Effects
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

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: behavior,
      });
    }
  }, []);

  useEffect(() => {
    // Only scroll to bottom if new messages are added, not on reaction updates
    if (messages.length > prevMessagesCountRef.current) {
      scrollToBottom();
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const fetchChats = async () => {
        try {
          const isTesterQuery = query(collection(db, 'applications'), where('testerId', '==', user.uid), where('status', '==', 'accepted'));
          const isOwnerQuery = query(collection(db, 'applications'), where('ownerId', '==', user.uid), where('status', '==', 'accepted'));
          
          const [testerSnapshot, ownerSnapshot] = await Promise.all([getDocs(isTesterQuery), getDocs(isOwnerQuery)]);
          const applications = [...testerSnapshot.docs, ...ownerSnapshot.docs].map(doc => ({ id: doc.id, ...doc.data() } as ChatListItem));
          const uniqueApplications = Array.from(new Map(applications.map(item => [item.id, item])).values());
          
          const chatsWithDetails = await Promise.all(
            uniqueApplications.map(async (app) => {
              const otherUserId = user.uid === app.ownerId ? app.testerId : app.ownerId;
              const userDocRef = doc(db, 'users', otherUserId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                app.otherUserName = userData.companyName || userData.fullName;
                app.otherUserAvatar = userData.companyLogoUrl || userData.profilePictureUrl;
              }
              const messagesRef = collection(db, 'applications', app.id, 'messages');
              const lastMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), where('timestamp', '!=', null));
              const lastMessageSnapshot = await getDocs(lastMessageQuery);
              if (!lastMessageSnapshot.empty) {
                const lastMessage = lastMessageSnapshot.docs[0].data();
                 if (lastMessage.text) app.lastMessage = lastMessage.text;
                 else if (lastMessage.imageUrl) app.lastMessage = 'Photo';
                 else if (lastMessage.fileUrl) app.lastMessage = 'File';
                 else app.lastMessage = '...';
                app.lastMessageTimestamp = lastMessage.timestamp;
              }
              return app;
            })
          );
          chatsWithDetails.sort((a,b) => (b.lastMessageTimestamp?.seconds ?? 0) - (a.lastMessageTimestamp?.seconds ?? 0));
          setChats(chatsWithDetails);
        } catch (error) {
          console.error("Error fetching user's chats: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (initialApplicationId && chats.length > 0) {
      const chatExists = chats.some(c => c.id === initialApplicationId);
      if (chatExists) {
        handleSelectChat(initialApplicationId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialApplicationId, chats]);

  useEffect(() => {
    if (activeChat?.id && user) {
      const messagesColRef = collection(db, 'applications', activeChat.id, 'messages');
      const q = query(messagesColRef, orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      }, (error) => {
        console.error("Error fetching messages:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load messages.' });
      });
      return () => unsubscribe();
    }
  }, [activeChat, user, toast]);

  const handleSelectChat = useCallback(async (applicationId: string) => {
    if (!user) return;
    const appDocRef = doc(db, 'applications', applicationId);
    const appDocSnap = await getDoc(appDocRef);
    if (!appDocSnap.exists()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Chat not found.' });
      return;
    }
    const appData = appDocSnap.data();
    const isOwner = user.uid === appData.ownerId;
    const isTester = user.uid === appData.testerId;
    if (!isOwner && !isTester) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have access to this chat.' });
      return;
    }
    const otherUserId = isOwner ? appData.testerId : appData.ownerId;
    const otherUserDocRef = doc(db, 'users', otherUserId);
    const otherUserDocSnap = await getDoc(otherUserDocRef);
    let otherUserInfo: OtherUser | null = null;
    if (otherUserDocSnap.exists()) {
      const otherUserData = otherUserDocSnap.data();
      otherUserInfo = {
        uid: otherUserId,
        name: otherUserData.companyName || otherUserData.fullName,
        avatarUrl: otherUserData.companyLogoUrl || otherUserData.profilePictureUrl
      };
    }
    setActiveChat({ id: applicationId, otherUser: otherUserInfo, projectTitle: appData.projectTitle });
    router.replace(`/chat/${applicationId}`, { scroll: false });
    setIsMobileMenuOpen(false);
  }, [user, toast, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isSending || !activeChat) return;
    setIsSending(true);

    if (editingMessage) {
      const messageRef = doc(db, 'applications', activeChat.id, 'messages', editingMessage.id);
      try {
        await updateDoc(messageRef, { text: newMessage, editedAt: serverTimestamp() });
        setNewMessage('');
        setEditingMessage(null);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update message.' });
      } finally {
        setIsSending(false);
      }
    } else {
      const messagesColRef = collection(db, 'applications', activeChat.id, 'messages');
      const messageData: any = { text: newMessage, senderId: user.uid, timestamp: serverTimestamp() };
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || 'Image',
          senderName: replyingTo.senderId === user.uid ? 'You' : activeChat.otherUser?.name || 'User'
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user || isSending || !activeChat) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsSending(true);

    const isImage = file.type.startsWith('image/');
    const storagePath = isImage ? `chat_images/${activeChat.id}/${Date.now()}_${file.name}` : `chat_files/${activeChat.id}/${Date.now()}_${file.name}`;
    
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const messagesColRef = collection(db, 'applications', activeChat.id, 'messages');
      
      const messageData: any = { senderId: user.uid, timestamp: serverTimestamp() };
      if (isImage) {
        messageData.imageUrl = url;
      } else {
        messageData.fileUrl = url;
        messageData.fileName = file.name;
      }

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.imageUrl ? 'Image' : 'File'),
          senderName: replyingTo.senderId === user.uid ? 'You' : activeChat.otherUser?.name || 'User'
        };
      }
      await addDoc(messagesColRef, messageData);
      setReplyingTo(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not upload file.' });
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const handleStartEdit = (message: Message) => {
    const now = Date.now();
    const messageTime = message.timestamp.toMillis();
    if (now - messageTime > EDIT_TIME_LIMIT_MS) {
      toast({ variant: 'destructive', title: 'Cannot Edit', description: 'You can only edit messages for 5 minutes after sending.' });
      return;
    }
    setEditingMessage(message);
    setNewMessage(message.text || '');
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    try {
      await deleteDoc(doc(db, 'applications', activeChat.id, 'messages', messageId));
      toast({ title: "Message Deleted" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete message.' });
    }
  };

  const handleTogglePinMessage = async (message: Message) => {
    if (!activeChat) return;
    try {
      await updateDoc(doc(db, 'applications', activeChat.id, 'messages', message.id), { isPinned: !message.isPinned });
      toast({ title: message.isPinned ? "Message Unpinned" : "Message Pinned" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update pin status.' });
    }
  };

  const handleReaction = async (message: Message, newEmoji: string) => {
    if (!user || !activeChat) return;
    setOpenPopoverId(null);
    const messageRef = doc(db, 'applications', activeChat.id, 'messages', message.id);
    const currentUserReactions = Object.entries(message.reactions || {}).find(
      ([, uids]) => uids.includes(user.uid)
    );

    const batch = writeBatch(db);

    // If user has an existing reaction, remove it first
    if (currentUserReactions) {
      const [oldEmoji] = currentUserReactions;
      if (oldEmoji !== newEmoji) {
        batch.update(messageRef, { [`reactions.${oldEmoji}`]: arrayRemove(user.uid) });
      }
    }

    // Toggle the new emoji reaction
    const userHasReactedWithNewEmoji = message.reactions?.[newEmoji]?.includes(user.uid);
    batch.update(messageRef, {
      [`reactions.${newEmoji}`]: userHasReactedWithNewEmoji
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid),
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update reaction.' });
    }
  };
  
  const handleStartReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full w-full">
        {/* Mobile menu sheet */}
        <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-3/4">
                    {user && <ChatList user={user} chats={chats} activeChatId={activeChat?.id} onSelectChat={handleSelectChat} />}
                </SheetContent>
            </Sheet>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block md:w-[320px] lg:w-[360px] flex-shrink-0 h-full">
             {user && <ChatList user={user} chats={chats} activeChatId={activeChat?.id} onSelectChat={handleSelectChat} />}
        </aside>
        
        <main className="flex-1 flex flex-col h-full min-h-0">
            {!activeChat ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-8 w-full">
                <button className="md:hidden absolute top-4 left-4" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu />
                </button>
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
                <p className="text-muted-foreground">Your conversations will appear here.</p>
            </div>
            ) : (
             <div className="flex h-full">
                 <div className="flex flex-col flex-1 h-full min-h-0">
                     {/* Header */}
                    <header className="flex items-center gap-3 border-b p-3 flex-shrink-0">
                        <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu />
                        </Button>
                        <Avatar>
                            <AvatarImage src={activeChat.otherUser?.avatarUrl} />
                            <AvatarFallback>{getInitials(activeChat.otherUser?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-lg font-semibold">{activeChat.otherUser?.name || 'Chat'}</h2>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setIsInfoPanelOpen(prev => !prev)} className={cn(isInfoPanelOpen && "bg-accent")}>
                                <Info className="h-5 w-5" />
                                <span className="sr-only">Chat Info</span>
                            </Button>
                        </div>
                    </header>

                     {/* Messages */}
                    <main ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 text-sm min-h-0" style={{lineHeight: '1.3'}}>
                    {messages.map((msg) => {
                        const isSender = msg.senderId === user?.uid;
                        const canEdit = isSender && (Date.now() - msg.timestamp?.toMillis()) < EDIT_TIME_LIMIT_MS;
                        const hasReactions = msg.reactions && Object.values(msg.reactions).some(uids => uids.length > 0);

                        return (
                        <div key={msg.id} className={cn("group flex items-start gap-2.5 max-w-[85%]", isSender ? "ml-auto flex-row-reverse" : "mr-auto")}>
                            <Avatar className="h-8 w-8 self-end mb-1">
                            <AvatarImage src={isSender ? user?.photoURL! : activeChat.otherUser?.avatarUrl} />
                            <AvatarFallback>{getInitials(isSender ? user?.displayName! : activeChat.otherUser?.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-0.5 w-full">
                            <div className={cn("flex items-center gap-2", isSender ? "flex-row-reverse" : "")}>
                                <div className={cn("relative rounded-xl px-3 py-1.5 max-w-max", isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none", msg.isPinned && "bg-primary/20 dark:bg-primary/30", hasReactions ? 'mb-5' : '')}>
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
                                {msg.fileUrl && (
                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-background/50 rounded-md hover:bg-background/80 transition-colors">
                                    <FileIcon className="h-6 w-6 flex-shrink-0"/>
                                    <span className="truncate">{msg.fileName}</span>
                                </a>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    {msg.isPinned && <Pin className="h-3 w-3 text-primary" />}
                                    {msg.editedAt && <span className="text-xs text-muted-foreground/70">(edited)</span>}
                                </div>
                                {hasReactions && (
                                <div className={cn("absolute -bottom-4 flex gap-1 items-center", isSender ? "right-2" : "left-2")}>
                                    {Object.entries(msg.reactions).map(([emoji, uids]) => (uids.length > 0 && (
                                    <div key={emoji} className={cn("bg-background border rounded-full px-1.5 py-0.5 text-xs flex items-center gap-1 shadow-sm", uids.includes(user?.uid || '') ? 'border-primary' : 'border-border')}>
                                        <span>{emoji}</span>
                                    </div>
                                    )))}
                                </div>
                                )}
                                </div>
                                <div className={cn("flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity", isSender ? "flex-row-reverse" : "")}>
                                <Popover open={openPopoverId === msg.id} onOpenChange={(open) => setOpenPopoverId(open ? msg.id : null)}>
                                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-1">
                                        <div className="flex items-center gap-1">
                                            {availableReactions.map(emoji => (
                                                <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8 rounded-full transition-transform hover:scale-125" onClick={() => handleReaction(msg, emoji)}>
                                                    <span className="text-lg">{emoji}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartReply(msg)}><Reply className="h-4 w-4" /></Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleTogglePinMessage(msg)}><Pin className="mr-2 h-4 w-4" /><span>{msg.isPinned ? 'Unpin' : 'Pin'}</span></DropdownMenuItem>
                                    {isSender && canEdit && msg.text && (<DropdownMenuItem onClick={() => handleStartEdit(msg)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>)}
                                    {isSender && (
                                        <AlertDialog>
                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></AlertDialogTrigger>
                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the message.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                            </div>
                            </div>
                        </div>
                        );
                    })}
                    </main>

                     {/* Footer */}
                    <footer className="p-2.5 border-t bg-background flex-shrink-0">
                    {(replyingTo || editingMessage) && (
                        <div className="bg-secondary/70 p-2 mb-2 rounded-md text-sm text-muted-foreground flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderId === user?.uid ? 'yourself' : activeChat.otherUser?.name}`}</p>
                            <p className="truncate max-w-sm">{editingMessage?.text || replyingTo?.text || (replyingTo?.imageUrl ? 'Image' : 'File')}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReplyingTo(null); cancelEdit(); }}><X className="h-4 w-4" /></Button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex w-full items-end gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" disabled={isSending} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}><Paperclip className="h-5 w-5" /></Button>
                        <div className="flex-1 relative">
                            <TextareaAutosize
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                autoComplete="off"
                                className="flex-1 resize-none border rounded-xl border-input bg-transparent focus:ring-0 focus-visible:ring-0 shadow-none px-4 py-2 text-base pr-20"
                                minRows={1}
                                maxRows={5}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center">
                                <Popover>
                                    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={isSending}><Smile className="h-5 w-5" /></Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-none mb-2"><EmojiPicker onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)} theme={resolvedTheme === 'dark' || resolvedTheme === 'midnight' ? EmojiTheme.DARK : EmojiTheme.LIGHT} /></PopoverContent>
                                </Popover>
                                <Button type="submit" size="icon" variant="ghost" disabled={!newMessage.trim() || isSending}><Send className="h-5 w-5" /><span className="sr-only">{editingMessage ? 'Save' : 'Send'}</span></Button>
                            </div>
                        </div>
                        
                    </form>
                    </footer>
                 </div>
                <aside className={cn("h-full transition-all duration-300 overflow-hidden", isInfoPanelOpen ? "block" : "hidden")}>
                    {isInfoPanelOpen && <ChatInfoPanel messages={messages} otherUser={activeChat.otherUser} projectTitle={activeChat.projectTitle} onTogglePin={handleTogglePinMessage} />}
                </aside>
            </div>
            )}
        </main>
    </div>
  );
}
