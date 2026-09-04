// The channel contract. Everything above this line is provider-agnostic.

export interface Attachment {
  filename: string;
  /** Raw bytes. Providers base64 it themselves. */
  content: Buffer;
  contentType?: string;
}

export interface Message {
  to: string;
  subject?: string;
  /** Always required. Every email ships a text part; SMS is text only. */
  text: string;
  html?: string;
  attachments?: Attachment[];
  /** Overrides the channel default. Used for owner alerts. */
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  /** Operator-facing, present only on failure. */
  reason?: string;
}

export interface Channel {
  /** Provider name for logs and the notifications row. */
  readonly name: string;
  /** False when the provider's env is unset — callers skip rather than fail. */
  isConfigured(): boolean;
  send(msg: Message): Promise<SendResult>;
}

/** A rendered template. Kept separate from Message so templates stay pure. */
export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}
