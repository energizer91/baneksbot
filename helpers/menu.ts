/* tslint:disable max-classes-per-file */

type Button = {
  text: string,
  callback_data?: string
};

export const createButton = (text: string, callbackData?: string): Button => ({
  callback_data: callbackData,
  text
});

class Row extends Array {
  public addButton(button: Button): Row {
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
