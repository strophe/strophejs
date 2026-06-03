export interface WebsocketLike {
    send(str: string): void;
    close(): void;
    onopen: (() => void) | null;
    onerror: ((e: Event) => void) | null;
    onclose: ((e: CloseEvent) => void) | null;
    onmessage: ((message: MessageEvent) => void) | null;
    readyState: number | null;
}
