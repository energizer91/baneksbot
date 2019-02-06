import {MessageParams} from "../models/telegram";

interface IUpdaterMessageInterface {
  type: string;
  action: string;
  value: any;
}

interface IUpdaterServiceMessage extends IUpdaterMessageInterface {
  type: 'service';
}

interface IUpdaterSendMessage extends IUpdaterServiceMessage {
  action: 'message';
  value: number;
  text?: string;
  params: MessageParams;
}

interface IUpdaterServiceSynchronizeMessage extends IUpdaterServiceMessage {
  action: 'synchronize';
}

interface IUpdaterServiceUpdateLastMessage extends IUpdaterServiceMessage {
  action: 'last';
}

interface IUpdaterServiceAnekMessage extends IUpdaterServiceMessage {
  action: 'anek';
  value: {
    language: string,
    user_id: number
  };
}

interface IUpdaterUpdateMessage extends IUpdaterServiceMessage {
  action: 'update';
  value: boolean;
}

export type UpdaterMessageTypes =
  IUpdaterSendMessage |
  IUpdaterServiceSynchronizeMessage |
  IUpdaterServiceAnekMessage |
  IUpdaterUpdateMessage |
  IUpdaterServiceUpdateLastMessage;
