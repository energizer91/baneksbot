import {MessageParams} from "../models/telegram";
import {Anek} from "../models/vk";

export enum UpdaterMessageTypes {
  service
}

export enum UpdaterMessageActions {
  ready,
  message,
  synchronize,
  last,
  anek,
  update,
  statistics
}

interface IUpdaterMessageInterface {
  type: UpdaterMessageTypes;
  action: UpdaterMessageActions;
  value: any;
}

interface IUpdaterServiceMessage extends IUpdaterMessageInterface {
  type: UpdaterMessageTypes.service;
}

interface IUpdaterSendMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.message;
  value: number;
  text?: string;
  params: MessageParams;
}

interface IUpdaterServiceSynchronizeMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.synchronize;
}

interface IUpdaterServiceUpdateLastMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.last;
}

interface IUpdaterServiceAnekMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.anek;
  params: {
    language: string
    needApprove: boolean
  };
  userId: number;
  anek: Anek;
}

interface IUpdaterUpdateMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.update;
  value: boolean;
}

interface IUpdaterStatisticsMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.statistics;
  value: boolean;
}

interface IUpdaterReadyMessage extends IUpdaterServiceMessage {
  action: UpdaterMessageActions.ready;
  value: boolean;
}

export type UpdaterMessages = IUpdaterSendMessage
    | IUpdaterServiceSynchronizeMessage
    | IUpdaterServiceAnekMessage
    | IUpdaterUpdateMessage
    | IUpdaterServiceUpdateLastMessage
    | IUpdaterStatisticsMessage
    | IUpdaterReadyMessage;
