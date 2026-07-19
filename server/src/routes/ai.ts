import { Router, Request, Response } from 'express';
import { askAssistant, ChatMessage } from '../ai/assistant';
import { SchemaGraph } from '../types/schema';

const router = Router();

router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  const { graph, messages, message } = req.body as {
    graph: SchemaGraph;
    messages: ChatMessage[];
    message: string;
  };

  if (!graph || !message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'Missing required fields: graph and message.' },
    });
  }

  if (!message.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Message cannot be empty.' },
    });
  }

  // Safety: limit message length
  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      error: { message: 'Message too long. Maximum 2000 characters.' },
    });
  }

  // Safety: limit conversation history
  const recentMessages = (messages || []).slice(-10); // only last 10 messages for context

  try {
    const reply = await askAssistant(graph, recentMessages, message);
    return res.json({ success: true, data: { reply } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI assistant failed.';
    return res.status(500).json({
      success: false,
      error: {
        message,
        suggestion: 'Check that GEMINI_API_KEY is set correctly in server/.env',
      },
    });
  }
});

export default router;
