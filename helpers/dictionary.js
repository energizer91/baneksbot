
/**
 * Created by xgmv84 on 12/1/2016.
 */

var languages = {
    russian: require('../languages/russian.json'),
    english: require('../languages/english.json')
};

module.exports = {
    translate: function (language, string, params) {
        if (!language || !this.languageExists(language)) {
            language = 'russian';
        }

        if (!params) {
            params = {};
        }

        return (languages[language][string] || '').replace(/\{(\w+)}/g, function (match, param) {
            return params[param] || 'not defined';
        })
    },
    languageExists: function (language) {
        return languages.hasOwnProperty(language);
    }
};