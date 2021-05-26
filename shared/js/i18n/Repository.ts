/*
"key": "de_gt",
"country_code": "de",
"path": "de_google_translate.translation",

"name": "German translation, based on Google Translate",
"contributors": [
{
  "name": "Google Translate, via script by Markus Hadenfeldt",
  "email": "gtr.i18n.client@teaspeak.de"
},
{
  "name": "Markus Hadenfeldt",
  "email": "i18n.client@teaspeak.de"
}
]
 */

import {CountryFlag} from "svg-sprites/country-flags";
import {AbstractTranslationResolver} from "tc-shared/i18n/Translation";

export type I18NContributor = {
    name: string,
    email: string
};

export type TranslationResolverCreateResult = {
    status: "success",
    resolver: AbstractTranslationResolver
} | {
    status: "error",
    message: string
};

export abstract class I18NTranslation {
    abstract getId() : string;
    abstract getName() : string;

    abstract getCountry() : CountryFlag;
    abstract getDescription() : string;
    abstract getContributors() : I18NContributor[];

    abstract createTranslationResolver() : Promise<TranslationResolverCreateResult>;
}

export abstract class I18NRepository {
    abstract getName() : string;
    abstract getDescription() : string;

    abstract getTranslations() : Promise<I18NTranslation[]>;
}