import Menu from "./menu";

describe("Menu creator", () => {
  it("should create menu", () => {
    const menu = new Menu();
    expect(Array.isArray(menu)).toBe(true);
  });

  it("should add a row", () => {
    const menu = new Menu();
    const row = menu.addRow();

    expect(Array.isArray(row)).toBe(true);
    expect(row).toHaveLength(0);
    expect(menu).toHaveLength(1);
  });

  it("should add a button in row", () => {
    const menu = new Menu();
    menu.addRow();

    expect(menu).toHaveLength(1);
    expect(menu[0]).toHaveLength(0);
  });

  it("should return a JSON with menu", () => {
    const menu = new Menu();

    menu.addRow().addButton({ text: "a", callback_data: "a" });

    expect(menu.toInlineMarkup()).toBe(
      JSON.stringify({
        inline_keyboard: [[{ text: "a", callback_data: "a" }]],
      }),
    );
  });
});
