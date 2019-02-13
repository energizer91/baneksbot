/* tslint:disable max-classes-per-file */

import {InlineKeyboardButton} from '../models/telegram';

export const createButton = (text: string, callbackData?: string): InlineKeyboardButton => ({
  callback_data: callbackData,
  text
});

export class Row extends Array {
  public addButton(button: InlineKeyboardButton): Row {
    this.push(button);

    return this;
  }
}

class Menu extends Array {
  public static toInlineMarkup(menuStructure: Menu) {
    return JSON.stringify({
      inline_keyboard: menuStructure
    });
  }

  public addRow(): Row {
    const newRow = new Row();

    this.push(newRow);

    return newRow;
  }

  public toInlineMarkup(): string {
    return JSON.stringify({
      inline_keyboard: this
    });
  }
}

export default Menu;

// const menu: Menu = new Menu();
//
// menu
//   .addRow()
//   .addButton(createButton('Сосать'))
//   .addButton(createButton('Кусать'));
//
// menu
//   .addRow()
//   .addButton(createButton('Сидеть'))
//   .addButton(createButton('Пердеть'));
