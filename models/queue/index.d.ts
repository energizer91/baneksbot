type Rule = {
    rate: number,
    limit: number,
    priority: number
}

type BackOffFunction = (delay: number) => void;
type QueueRequest = (BackOffFunction: BackOffFunction) => Promise<any>;
type Callback = (error: Error, data: any) => void;

type QueueItemData = {
    request: QueueRequest,
    callback: Callback
}

type QueueItem = {
    cooldown: number,
    key: string,
    data: QueueItemData[],
    rule: Rule
}

type ShiftItemStructure = {
    queue: QueueItem,
    item: QueueItemData
}

declare class Queue {
    createQueue(queueName: string, request: QueueRequest, callback: Callback, rule: Rule): QueueItem;

    getRule(name: string, params?: {}): Rule;

    addBackOff(item: ShiftItemStructure, delay: number): void;

    execute(queue?: QueueItem): Promise<boolean | QueueItem>;

    shift(queue?: QueueItem): ShiftItemStructure;

    heat(): void;

    findMostImportant(bestQueue?: QueueItem): QueueItem;

    setCooldown(queue: QueueItem): void;

    delay(time: number): Promise<void>;

    isCool(queue: QueueItem): boolean;

    remove(key: string): boolean;

    request(fn: QueueRequest, key?: string, rule?: string): Promise<any>;

    // get isOverheated(): boolean;
    // get getTotalLength(): number;
}

export = Queue;
