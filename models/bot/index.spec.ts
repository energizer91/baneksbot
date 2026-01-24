import { expect } from "chai";
import Bot from "./";

const bot = new Bot();

describe("Bot model", () => {
  it("should initialize", () => {
    expect(bot).to.be.a("object");
  });

  // describe('Bot.getUserInfo', () => {
  //   it('should return Invalid user if there is no user', () => {
  //     expect(bot.getUserInfo(null)).to.equals('Invalid user');
  //     expect(bot.getUserInfo({})).to.equals('Invalid user');
  //   });
  //
  //   it('should return username if it exists', () => {
  //     const user = {
  //       user_id: 123,
  //       username: 'test_user'
  //     };
  //
  //     expect(bot.getUserInfo(user)).to.equals('@test_user');
  //   });
  //
  //   it('should return first name if it is exist', () => {
  //     const user = {
  //       user_id: 123,
  //       first_name: 'test'
  //     };
  //
  //     expect(bot.getUserInfo(user)).to.equals('test (123)');
  //   });
  //
  //   it('should return last name if it is exist', () => {
  //     const user = {
  //       user_id: 123,
  //       last_name: 'user'
  //     };
  //
  //     expect(bot.getUserInfo(user)).to.equals('user (123)');
  //   });
  //
  //   it('should return title if it is exist', () => {
  //     const user = {
  //       user_id: 123,
  //       title: 'super chat'
  //     };
  //
  //     expect(bot.getUserInfo(user)).to.equals('super chat');
  //   });
  //
  //   it('should return user_id if nothing exists', () => {
  //     const user = {
  //       user_id: 123
  //     };
  //
  //     expect(bot.getUserInfo(user)).to.equals(123);
  //   });
  // });
  //
  // describe('Bot.convertAttachment', () => {
  //   it('should return empty object if there is no attachment', () => {
  //     expect(bot.convertAttachment(null)).to.deep.equal({});
  //   });
  //
  //   it('should return photo on type photo', () => {
  //     const vkAttachment = {
  //       type: 'photo',
  //       photo: {
  //         photo_2560: 'https://lorem.com'
  //       },
  //       text: 'ipsum'
  //     };
  //
  //     const tgAttachment = {
  //       type: 'photo',
  //       photo: 'https://lorem.com',
  //       caption: 'ipsum'
  //     };
  //
  //     expect(bot.convertAttachment(vkAttachment)).to.deep.equal(tgAttachment);
  //   });
  //
  //   it('should return video on type video', () => {
  //     const vkAttachment = {
  //       type: 'video',
  //       title: 'lorem',
  //       video: {
  //         owner_id: 123,
  //         id: 456
  //       }
  //     };
  //
  //     const tgAttachment = {
  //       type: 'video',
  //       text: 'lorem\nhttps://vk.com/video123_456'
  //     };
  //
  //     expect(bot.convertAttachment(vkAttachment)).to.deep.equal(tgAttachment);
  //   });
  // });
});
