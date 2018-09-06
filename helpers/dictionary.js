/**
 * Created by xgmv84 on 12/1/2016.
 */

const languages = {
  russian: require('../languages/russian.json'),
  english: require('../languages/english.json')
};

module.exports = {
  translate (language, string, params = {}) {
    if (!language || !this.languageExists(language)) {
      language = 'russian';
    }

    return (languages[language][string] || '').replace(/{(\w+)}/g, (match, param) => params[param] || 'not defined');
  },
  languageExists (language) {
    return languages.hasOwnProperty(language);
  }
};
