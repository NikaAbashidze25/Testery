
import { Chat } from '@/components/chat/chat';

export default function ChatPage({ params }: { params: { id: string } }) {
  return <Chat initialApplicationId={params.id} />;
}
