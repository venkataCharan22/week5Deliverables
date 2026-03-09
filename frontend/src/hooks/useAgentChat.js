import { useState, useCallback, useRef } from 'react';
import { auth } from '../lib/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let msgIdCounter = 100;

export function useAgentChat() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your BizBuddy AI assistant. I can look up your real inventory, analyze sales, forecast demand, and more. How can I help?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentSteps, setAgentSteps] = useState([]);
  const abortRef = useRef(null);
  const stepsRef = useRef([]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return;

      const userMessage = {
        id: String(++msgIdCounter),
        role: 'user',
        content: text.trim(),
      };

      // Build history before updating state — exclude the welcome message
      const history = [
        ...messages.filter((m) => m.id !== '1').map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text.trim() },
      ];

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAgentSteps([]);
      stepsRef.current = [];

      const user = auth.currentUser;
      const userId = user?.uid;
      if (!userId) {
        setMessages((prev) => [
          ...prev,
          { id: String(++msgIdCounter), role: 'assistant', content: 'Please log in first.' },
        ]);
        setIsLoading(false);
        return;
      }

      // Get business type from localStorage
      let businessType = null;
      try {
        const profile = JSON.parse(localStorage.getItem(`bizbuddy_profile_${userId}`));
        businessType = profile?.businessType || null;
      } catch {}

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch(
          `${API_URL}/agent/chat?user_id=${encodeURIComponent(userId)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: history,
              business_type: businessType,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = null;
          let eventData = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6).trim();
            } else if (line === '' && eventType && eventData) {
              try {
                const parsed = JSON.parse(eventData);
                handleEvent(eventType, parsed);
              } catch {}
              eventType = null;
              eventData = null;
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            {
              id: String(++msgIdCounter),
              role: 'assistant',
              content: 'Sorry, something went wrong. Please try again.',
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        setAgentSteps([]);
        stepsRef.current = [];
        abortRef.current = null;
      }

      function handleEvent(type, data) {
        switch (type) {
          case 'status': {
            const step = { type: 'status', tool: data.tool, label: data.label };
            stepsRef.current = [...stepsRef.current, step];
            setAgentSteps([...stepsRef.current]);
            break;
          }
          case 'tool_result': {
            const step = { type: 'tool_result', tool: data.tool, summary: data.summary };
            stepsRef.current = [...stepsRef.current, step];
            setAgentSteps([...stepsRef.current]);
            break;
          }
          case 'message':
            setMessages((prev) => [
              ...prev,
              {
                id: String(++msgIdCounter),
                role: 'assistant',
                content: data.content,
                steps: [...stepsRef.current],
              },
            ]);
            break;
          case 'error':
            setMessages((prev) => [
              ...prev,
              {
                id: String(++msgIdCounter),
                role: 'assistant',
                content: `Error: ${data.message}`,
              },
            ]);
            break;
          case 'done':
            break;
        }
      }
    },
    [messages, isLoading]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setAgentSteps([]);
    stepsRef.current = [];
  }, []);

  return { messages, isLoading, agentSteps, sendMessage, cancel };
}
