import { InlineKeyboard, InlineKeyboardButton } from "../models/telegram";

export class Row extends Array {
  public addButton(button: InlineKeyboardButton): Row {
    this.push(button);

    return this;
  }
}

class Menu extends Array implements InlineKeyboard {
  public static toInlineMarkup(menuStructure: Menu) {
    return JSON.stringify({
      inline_keyboard: menuStructure,
    });
  }

  public addRow(): Row {
    const newRow = new Row();

    this.push(newRow);

    return newRow;
  }

  public toInlineMarkup(): string {
    return JSON.stringify({
      inline_keyboard: this,
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
