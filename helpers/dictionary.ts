/**
 * Created by xgmv84 on 12/1/2016.
 */

type Languages = {
  [key: string]: {
    [key: string]: string;
  };
};

const languages: Languages = {
  english: require("../languages/english.json"),
  russian: require("../languages/russian.json"),
};

export const translate = (
  language: string,
  part: string,
  params: any = {},
): string => {
  if (!language || !languageExists(language)) {
    language = "russian";
  }

  const dictionary = languages[language] || languages.russian;

  return (dictionary[part] || "").replace(
    /{(\w+)}/g,
    (match, param) => params[param] || "not defined",
  );
};

export const languageExists = (language: string): boolean => {
  return languages.hasOwnProperty(language);
};
