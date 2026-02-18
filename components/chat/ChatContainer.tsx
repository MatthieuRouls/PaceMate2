'use client';

import { useChat } from './ChatProvider';
import FloatingChatButton from './FloatingChatButton';
import ChatDrawer from './ChatDrawer';
import MiniChatWindow from './MiniChatWindow';

export default function ChatContainer() {
  const { openConversations } = useChat();

  return (
    <>
      {/* Mini chat windows */}
      {openConversations.map((convId, index) => (
        <MiniChatWindow
          key={convId}
          conversationId={convId}
          position={index}
        />
      ))}

      {/* Chat drawer */}
      <ChatDrawer />

      {/* Floating button */}
      <FloatingChatButton />
    </>
  );
}
