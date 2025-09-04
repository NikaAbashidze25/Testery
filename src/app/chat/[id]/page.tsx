
import { Chat } from '@/components/chat/chat';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Chat initialApplicationId={id} />;
}
