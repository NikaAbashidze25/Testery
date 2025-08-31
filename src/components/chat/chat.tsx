
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
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
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
import { ArrowLeft, Send, Image as ImageIcon, Smile, Reply, MoreHorizontal, X, Edit, Trash2, Pin, Info, Search, Paperclip } from 'lucide-react';

// Interfaces
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
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const EDIT_TIME_LIMIT_MS = 5 * 60 * 1000;
const availableReactions = ['👍', '❤️', '😂'];


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
  const { setOpenMobile } = useSidebar();
  
  const formatTimestamp = (timestamp: ChatListItem['lastMessageTimestamp']) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
     <div className="flex flex-col h-full">
      <SidebarHeader>
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Chats</h2>
            <SidebarTrigger className="md:hidden" />
        </div>
         <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-9" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {chats.map(chat => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                isActive={chat.id === activeChatId}
                onClick={() => {
                  onSelectChat(chat.id);
                  setOpenMobile(false);
                }}
                className="h-auto py-2"
              >
                <Avatar className="h-10 w-10">
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
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </div>
  );
};

const ChatInfoPanel = ({ messages, otherUser, projectTitle, onTogglePin }: { messages: Message[]; otherUser: OtherUser | null, projectTitle: string, onTogglePin: (message: Message) => void }) => {
  const pinnedMessages = messages.filter(m => m.isPinned);
  const sharedImages = messages.filter(m => m.imageUrl);

  return (
    <div className="flex flex-col h-full">
       <SidebarHeader className="text-center border-b">
         <Avatar className="h-20 w-20 mx-auto">
            <AvatarImage src={otherUser?.avatarUrl} />
            <AvatarFallback className="text-3xl">{getInitials(otherUser?.name)}</AvatarFallback>
         </Avatar>
         <h3 className="text-lg font-semibold mt-2">{otherUser?.name}</h3>
         <p className="text-sm text-muted-foreground">Project: {projectTitle}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pinned Messages</SidebarGroupLabel>
           <div className="space-y-2 text-sm">
             {pinnedMessages.length > 0 ? pinnedMessages.map(msg => (
                <div key={`pin-info-${msg.id}`} className="group/pin p-2 bg-muted rounded-md text-muted-foreground flex justify-between items-start gap-2">
                   <div className="flex-grow">
                        <span className="font-semibold">{msg.senderId === otherUser?.uid ? otherUser.name : "You"}: </span>
                        <p className="truncate">{msg.text || 'Image'}</p>
                   </div>
                   <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 opacity-50 group-hover/pin:opacity-100" onClick={() => onTogglePin(msg)}>
                        <X className="h-3 w-3" />
                   </Button>
                </div>
            )) : <p className="text-xs text-muted-foreground text-center py-2">No pinned messages.</p>}
           </div>
        </SidebarGroup>
         <SidebarGroup>
          <SidebarGroupLabel>Shared Photos</SidebarGroupLabel>
           <div className="grid grid-cols-3 gap-2">
             {sharedImages.length > 0 ? sharedImages.slice(0, 9).map(msg => (
                <Link key={`img-info-${msg.id}`} href={msg.imageUrl!} target="_blank" className="aspect-square">
                    <Image src={msg.imageUrl!} alt="Shared media" width={100} height={100} className="rounded-md object-cover w-full h-full" />
                </Link>
            )) : <p className="text-xs text-muted-foreground text-center py-2 col-span-3">No shared photos.</p>}
           </div>
        </SidebarGroup>
      </SidebarContent>
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
  
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { setOpenMobile } = useSidebar();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

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
                app.lastMessage = lastMessage.text || 'Image';
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user || isSending || !activeChat) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: `Image is too large. Maximum allowed size is ${MAX_IMAGE_SIZE_MB} MB.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsSending(true);
    try {
      const storageRef = ref(storage, `chat_images/${activeChat.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      const messagesColRef = collection(db, 'applications', activeChat.id, 'messages');
      const messageData: any = { imageUrl, senderId: user.uid, timestamp: serverTimestamp() };
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || 'Image',
          senderName: replyingTo.senderId === user.uid ? 'You' : activeChat.otherUser?.name || 'User'
        };
      }
      await addDoc(messagesColRef, messageData);
      setReplyingTo(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not upload image.' });
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

  const handleReaction = async (message: Message, emoji: string) => {
    if (!user || !activeChat) return;
    const messageRef = doc(db, 'applications', activeChat.id, 'messages', message.id);
    const reactionPath = `reactions.${emoji}`;
    const userHasReacted = message.reactions?.[emoji]?.includes(user.uid);
    try {
      await updateDoc(messageRef, { [reactionPath]: userHasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update reaction.' });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel: Chat List */}
      <div className="w-full md:w-1/4 lg:w-1/4 h-full border-r hidden md:block flex-shrink-0">
          {user && <ChatList user={user} chats={chats} activeChatId={activeChat?.id} onSelectChat={handleSelectChat} />}
      </div>
      <Sidebar side="left" collapsible="offcanvas">
        {user && <ChatList user={user} chats={chats} activeChatId={activeChat?.id} onSelectChat={handleSelectChat} />}
      </Sidebar>

      <div className="flex-1 flex flex-col h-screen">
        {!activeChat ? (
          <div className="flex flex-col h-full items-center justify-center text-center bg-muted/50 p-8">
             <div className="flex items-center gap-2 mb-4 md:hidden">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold">My Chats</h1>
             </div>
            <Paperclip className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
            <p className="text-muted-foreground">Your conversations will appear here.</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Center Panel: Main Chat Area */}
            <div className="flex flex-col h-full flex-1 w-full md:w-1/2 lg:w-1/2">
              {/* Chat Header */}
              <header className="flex items-center gap-3 border-b p-3 h-16 flex-shrink-0">
                <SidebarTrigger className="md:hidden" />
                <Avatar>
                  <AvatarImage src={activeChat.otherUser?.avatarUrl} />
                  <AvatarFallback>{getInitials(activeChat.otherUser?.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">{activeChat.otherUser?.name || 'Chat'}</h2>
                </div>
                <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(prev => !prev)}>
                        <Info className="h-5 w-5" />
                        <span className="sr-only">Chat Info</span>
                    </Button>
                </div>
              </header>

              {/* Messages */}
              <main ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1 text-sm md:text-base">
                {messages.map((msg) => {
                  const isSender = msg.senderId === user?.uid;
                  const canEdit = isSender && (Date.now() - msg.timestamp?.toMillis()) < EDIT_TIME_LIMIT_MS;
                  return (
                    <div key={msg.id} className={cn("group flex items-start gap-2.5 max-w-[85%]", isSender ? "ml-auto flex-row-reverse" : "mr-auto")}>
                      <Avatar className="h-8 w-8 self-end mb-1">
                        <AvatarImage src={isSender ? user?.photoURL! : activeChat.otherUser?.avatarUrl} />
                        <AvatarFallback>{getInitials(isSender ? user?.displayName! : activeChat.otherUser?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 w-full">
                         <div className={cn("flex items-center gap-2", isSender ? "flex-row-reverse" : "")}>
                            <div className={cn("rounded-xl px-3.5 py-2.5 max-w-max", isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none", msg.isPinned && "bg-primary/20 dark:bg-primary/30")}>
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
                                    {msg.editedAt && <span className="text-xs text-muted-foreground/70">(edited)</span>}
                                </div>
                            </div>
                            {/* Message Actions */}
                            <div className={cn("flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity", isSender ? "flex-row-reverse" : "")}>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-1"><div className="flex gap-1">{availableReactions.map(emoji => (<Button key={emoji} variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReaction(msg, emoji)}><span className="text-lg">{emoji}</span></Button>))}</div></PopoverContent>
                                </Popover>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyingTo(msg)}><Reply className="h-4 w-4" /></Button>
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
                         {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className={cn("flex gap-1 items-center", isSender ? "justify-end" : "justify-start")}>
                                {Object.entries(msg.reactions).map(([emoji, uids]) => (uids.length > 0 && (
                                    <div key={emoji} className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs flex items-center gap-1 shadow-sm"><span>{emoji}</span><span>{uids.length}</span></div>
                                )))}
                            </div>
                         )}
                      </div>
                    </div>
                  );
                })}
              </main>

              {/* Message Input */}
              <footer className="p-4 border-t flex-shrink-0 bg-background">
                {(replyingTo || editingMessage) && (
                  <div className="bg-secondary/70 p-2 mb-2 rounded-md text-sm text-muted-foreground flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderId === user?.uid ? 'yourself' : activeChat.otherUser?.name}`}</p>
                      <p className="truncate max-w-sm">{editingMessage?.text || replyingTo?.text || 'Image'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReplyingTo(null); cancelEdit(); }}><X className="h-4 w-4" /></Button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isSending} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}><ImageIcon className="h-5 w-5" /></Button>
                  <Popover>
                    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={isSending}><Smile className="h-5 w-5" /></Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-none"><EmojiPicker onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)} theme={resolvedTheme === 'dark' || resolvedTheme === 'midnight' ? EmojiTheme.DARK : EmojiTheme.LIGHT} /></PopoverContent>
                  </Popover>
                  <TextareaAutosize
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    autoComplete="off"
                    className="flex-1 resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 shadow-none px-2 py-3 min-h-[52px] text-base"
                    maxRows={5}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e); }}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}><Send className="h-4 w-4" /><span className="sr-only">{editingMessage ? 'Save' : 'Send'}</span></Button>
                </form>
              </footer>
            </div>

            {/* Right Panel: Chat Info */}
            {rightPanelOpen && (
              <div className="h-full border-l w-full md:w-1/4 lg:w-1/4 hidden lg:block flex-shrink-0">
                 <ChatInfoPanel messages={messages} otherUser={activeChat.otherUser} projectTitle={activeChat.projectTitle} onTogglePin={handleTogglePinMessage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
