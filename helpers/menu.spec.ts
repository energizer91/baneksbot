import { expect } from "chai";
import Menu from "./menu";

describe("Menu creator", () => {
  it("should create menu", () => {
    const menu = new Menu();
    expect(menu).to.be.a("array");
  });

  it("should add a row", () => {
    const menu = new Menu();
    const row = menu.addRow();

    expect(row).to.be.a("array");
    expect(row).to.have.length(0);
    expect(menu).to.have.length(1);
  });

  it("should add a button in row", () => {
    const menu = new Menu();
    menu.addRow();

    expect(menu).to.have.length(1);
    expect(menu[0]).to.have.length(0);
  });

  it("should return a JSON with menu", () => {
    const menu = new Menu();

    menu.addRow().addButton({ text: "a", callback_data: "a" });

    expect(menu.toInlineMarkup()).to.eq(
      JSON.stringify({
        inline_keyboard: [[{ text: "a", callback_data: "a" }]],
      }),
    );
  });
});
