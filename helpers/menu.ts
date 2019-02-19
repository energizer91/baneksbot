/* tslint:disable max-classes-per-file */

import {InlineKeyboardButton} from '../models/telegram';

export class Row extends Array {
  public addButton(button: InlineKeyboardButton): Row;
  public addButton(text: string, params?: InlineKeyboardButton): Row;
  public addButton(text: string, callbackData?: string, params?: InlineKeyboardButton): Row;
  public addButton(button: string | InlineKeyboardButton, callbackData?: string | InlineKeyboardButton, params?: InlineKeyboardButton): Row {
    if (typeof button === 'object' && button.text) {
      this.push(button);
    } else if (typeof button === 'string') {
      if (typeof callbackData === 'string') {
        this.push({
          callback_data: callbackData,
          text: button,
          ...params
        });
      } else {
        this.push({
          text: button,
          ...callbackData
        });
      }
    }

    return this;
  }
}

class Menu extends Array {
  public addRow(): Menu {
    const newRow = new Row();

    this.push(newRow);

    return this;
  }

  public addButton(button: InlineKeyboardButton): Menu;
  public addButton(text: string, params?: InlineKeyboardButton): Menu;
  public addButton(text: string, callbackData?: string, params?: InlineKeyboardButton): Menu;
  public addButton(button: string | InlineKeyboardButton, callbackData?: string | InlineKeyboardButton, params?: InlineKeyboardButton): Menu {
    if (!this.length) {
      this.addRow();
    }

    const row = this[this.length - 1];

    row.addButton(button, callbackData, params);

    return this;
  }

  public toInlineMarkup(): string {
    return JSON.stringify({
      inline_keyboard: this
    });
  }
}

// class ReplyMenu extends Menu {
//   public toReplyMarkup(): string {
//     return JSON.stringify({
//       reply_keyboard: this
//     });
//   }
// }

export default Menu;

// new Row()
//   .addButton('lol', 'kek')
//   .addButton('cheburek', {url: 'azaza'});
//
// new Menu()
//   .addRow()
//   .addButton('Сосать')
//   .addButton('Кусать', {url: 'https://ya.ru'})
//   .addRow()
//   .addButton({text: 'Сидеть'})
//   .addButton('Пердеть', 'sit')
//   .addButton('Пердеть', 'sit', {pay: true})
//   .toInlineMarkup();
