import "svg-sprites/country-flags";
import {CountryFlag} from "svg-sprites/country-flags";
import {LogCategory, logWarn} from "tc-shared/log";

interface CountryInfo {
    name: string;
    alpha_2: string;
    alpha_3: string;
    un_code: number;
    icon: string;

    flagMissingWarned?: boolean;
}
const registeredCountries: CountryInfo[] = [];
const alphaCode2Info: { [name: string]: CountryInfo } = {};

const registerCountries = (array: CountryInfo[]) => {
    array.push({
        name: "Afghanistan",
        alpha_2: "AF",
        alpha_3: "AFG",
        un_code: 4,
        icon: "afghanistan",
    });
    array.push({
        name: "Aland Islands",
        alpha_2: "AX",
        alpha_3: "ALA",
        un_code: 248,
        icon: "aland-islands",
    });
    array.push({
        name: "Albania",
        alpha_2: "AL",
        alpha_3: "ALB",
        un_code: 8,
        icon: "albania",
    });
    array.push({
        name: "Algeria",
        alpha_2: "DZ",
        alpha_3: "DZA",
        un_code: 12,
        icon: "algeria",
    });
    array.push({
        name: "American Samoa",
        alpha_2: "AS",
        alpha_3: "ASM",
        un_code: 16,
        icon: "american-samoa",
    });
    array.push({
        name: "Andorra",
        alpha_2: "AD",
        alpha_3: "AND",
        un_code: 20,
        icon: "andorra",
    });
    array.push({
        name: "Angola",
        alpha_2: "AO",
        alpha_3: "AGO",
        un_code: 24,
        icon: "angola",
    });
    array.push({
        name: "Anguilla",
        alpha_2: "AI",
        alpha_3: "AIA",
        un_code: 660,
        icon: "anguilla",
    });
    /* TODO(flag): https://en.wikipedia.org/wiki/Flag_of_Antarctica */
    array.push({
        name: "Antarctica",
        alpha_2: "AQ",
        alpha_3: "ATA",
        un_code: 10,
        icon: "worldwide",
    });
    array.push({
        name: "Antigua and Barbuda",
        alpha_2: "AG",
        alpha_3: "ATG",
        un_code: 28,
        icon: "antigua-and-barbuda",
    });
    array.push({
        name: "Argentina",
        alpha_2: "AR",
        alpha_3: "ARG",
        un_code: 32,
        icon: "argentina",
    });
    array.push({
        name: "Armenia",
        alpha_2: "AM",
        alpha_3: "ARM",
        un_code: 51,
        icon: "armenia",
    });
    array.push({
        name: "Aruba",
        alpha_2: "AW",
        alpha_3: "ABW",
        un_code: 533,
        icon: "aruba",
    });
    array.push({
        name: "Australia",
        alpha_2: "AU",
        alpha_3: "AUS",
        un_code: 36,
        icon: "australia",
    });
    array.push({
        name: "Austria",
        alpha_2: "AT",
        alpha_3: "AUT",
        un_code: 40,
        icon: "austria",
    });
    array.push({
        name: "Azerbaijan",
        alpha_2: "AZ",
        alpha_3: "AZE",
        un_code: 31,
        icon: "azerbaijan",
    });
    array.push({
        name: "Bahamas",
        alpha_2: "BS",
        alpha_3: "BHS",
        un_code: 44,
        icon: "bahamas",
    });
    array.push({
        name: "Bahrain",
        alpha_2: "BH",
        alpha_3: "BHR",
        un_code: 48,
        icon: "bahrain",
    });
    array.push({
        name: "Bangladesh",
        alpha_2: "BD",
        alpha_3: "BGD",
        un_code: 50,
        icon: "bangladesh",
    });
    array.push({
        name: "Barbados",
        alpha_2: "BB",
        alpha_3: "BRB",
        un_code: 52,
        icon: "barbados",
    });
    array.push({
        name: "Belarus",
        alpha_2: "BY",
        alpha_3: "BLR",
        un_code: 112,
        icon: "belarus",
    });
    array.push({
        name: "Belgium",
        alpha_2: "BE",
        alpha_3: "BEL",
        un_code: 56,
        icon: "belgium",
    });
    array.push({
        name: "Belize",
        alpha_2: "BZ",
        alpha_3: "BLZ",
        un_code: 84,
        icon: "belize",
    });
    array.push({
        name: "Benin",
        alpha_2: "BJ",
        alpha_3: "BEN",
        un_code: 204,
        icon: "benin",
    });
    array.push({
        name: "Bermuda",
        alpha_2: "BM",
        alpha_3: "BMU",
        un_code: 60,
        icon: "bermuda",
    });
    array.push({
        name: "Bhutan",
        alpha_2: "BT",
        alpha_3: "BTN",
        un_code: 64,
        icon: "bhutan",
    });
    array.push({
        name: "Bolivia",
        alpha_2: "BO",
        alpha_3: "BOL",
        un_code: 68,
        icon: "bolivia",
    });
    array.push({
        name: "Bosnia and Herzegovina",
        alpha_2: "BA",
        alpha_3: "BIH",
        un_code: 70,
        icon: "bosnia-and-herzegovina",
    });
    array.push({
        name: "Botswana",
        alpha_2: "BW",
        alpha_3: "BWA",
        un_code: 72,
        icon: "botswana",
    });
    /* Island uninhabited  */
    array.push({
        name: "Bouvet Island",
        alpha_2: "BV",
        alpha_3: "BVT",
        un_code: 74,
        icon: "worldwide",
    });
    array.push({
        name: "Brazil",
        alpha_2: "BR",
        alpha_3: "BRA",
        un_code: 76,
        icon: "brazil",
    });
    array.push({
        name: "British Virgin Islands",
        alpha_2: "VG",
        alpha_3: "VGB",
        un_code: 92,
        icon: "british-virgin-islands",
    });
    array.push({
        name: "British Indian Ocean Territory",
        alpha_2: "IO",
        alpha_3: "IOT",
        un_code: 86,
        icon: "british-indian-ocean-territory",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/Brunei */
    array.push({
        name: "Brunei Darussalam",
        alpha_2: "BN",
        alpha_3: "BRN",
        un_code: 96,
        icon: "worldwide",
    });
    array.push({
        name: "Bulgaria",
        alpha_2: "BG",
        alpha_3: "BGR",
        un_code: 100,
        icon: "bulgaria",
    });
    array.push({
        name: "Burkina Faso",
        alpha_2: "BF",
        alpha_3: "BFA",
        un_code: 854,
        icon: "burkina-faso",
    });
    array.push({
        name: "Burundi",
        alpha_2: "BI",
        alpha_3: "BDI",
        un_code: 108,
        icon: "burundi",
    });
    array.push({
        name: "Cambodia",
        alpha_2: "KH",
        alpha_3: "KHM",
        un_code: 116,
        icon: "cambodia",
    });
    array.push({
        name: "Cameroon",
        alpha_2: "CM",
        alpha_3: "CMR",
        un_code: 120,
        icon: "cameroon",
    });
    array.push({
        name: "Canada",
        alpha_2: "CA",
        alpha_3: "CAN",
        un_code: 124,
        icon: "canada",
    });
    array.push({
        name: "Cape Verde",
        alpha_2: "CV",
        alpha_3: "CPV",
        un_code: 132,
        icon: "cape-verde",
    });
    array.push({
        name: "Cayman Islands",
        alpha_2: "KY",
        alpha_3: "CYM",
        un_code: 136,
        icon: "cayman-islands",
    });
    array.push({
        name: "Central African Republic",
        alpha_2: "CF",
        alpha_3: "CAF",
        un_code: 140,
        icon: "central-african-republic",
    });
    array.push({
        name: "Chad",
        alpha_2: "TD",
        alpha_3: "TCD",
        un_code: 148,
        icon: "chad",
    });
    array.push({
        name: "Chile",
        alpha_2: "CL",
        alpha_3: "CHL",
        un_code: 152,
        icon: "chile",
    });
    array.push({
        name: "China",
        alpha_2: "CN",
        alpha_3: "CHN",
        un_code: 156,
        icon: "china",
    });
    array.push({
        name: "Hong Kong, SAR China",
        alpha_2: "HK",
        alpha_3: "HKG",
        un_code: 344,
        icon: "hong-kong",
    });
    array.push({
        name: "Macao, SAR China",
        alpha_2: "MO",
        alpha_3: "MAC",
        un_code: 446,
        icon: "macao",
    });
    array.push({
        name: "Christmas Island",
        alpha_2: "CX",
        alpha_3: "CXR",
        un_code: 162,
        icon: "christmas-island",
    });
    array.push({
        name: "Cocos (Keeling) Islands",
        alpha_2: "CC",
        alpha_3: "CCK",
        un_code: 166,
        icon: "cocos-island",
    });
    array.push({
        name: "Colombia",
        alpha_2: "CO",
        alpha_3: "COL",
        un_code: 170,
        icon: "colombia",
    });
    array.push({
        name: "Comoros",
        alpha_2: "KM",
        alpha_3: "COM",
        un_code: 174,
        icon: "comoros",
    });
    array.push({
        name: "Congo (Brazzaville)",
        alpha_2: "CG",
        alpha_3: "COG",
        un_code: 178,
        icon: "republic-of-the-congo",
    });
    array.push({
        name: "Congo (Kinshasa)",
        alpha_2: "CD",
        alpha_3: "COD",
        un_code: 180,
        icon: "democratic-republic-of-congo",
    });
    array.push({
        name: "Cook Islands",
        alpha_2: "CK",
        alpha_3: "COK",
        un_code: 184,
        icon: "cook-islands",
    });
    array.push({
        name: "Costa Rica",
        alpha_2: "CR",
        alpha_3: "CRI",
        un_code: 188,
        icon: "costa-rica",
    });
    array.push({
        name: "Côte d'Ivoire",
        alpha_2: "CI",
        alpha_3: "CIV",
        un_code: 384,
        icon: "ivory-coast",
    });
    array.push({
        name: "Croatia",
        alpha_2: "HR",
        alpha_3: "HRV",
        un_code: 191,
        icon: "croatia",
    });
    array.push({
        name: "Cuba",
        alpha_2: "CU",
        alpha_3: "CUB",
        un_code: 192,
        icon: "cuba",
    });
    array.push({
        name: "Cyprus",
        alpha_2: "CY",
        alpha_3: "CYP",
        un_code: 196,
        icon: "cyprus",
    });
    array.push({
        name: "Czech Republic",
        alpha_2: "CZ",
        alpha_3: "CZE",
        un_code: 203,
        icon: "czech-republic",
    });
    array.push({
        name: "Denmark",
        alpha_2: "DK",
        alpha_3: "DNK",
        un_code: 208,
        icon: "denmark",
    });
    array.push({
        name: "Djibouti",
        alpha_2: "DJ",
        alpha_3: "DJI",
        un_code: 262,
        icon: "djibouti",
    });
    array.push({
        name: "Dominica",
        alpha_2: "DM",
        alpha_3: "DMA",
        un_code: 212,
        icon: "dominica",
    });
    array.push({
        name: "Dominican Republic",
        alpha_2: "DO",
        alpha_3: "DOM",
        un_code: 214,
        icon: "dominican-republic",
    });
    array.push({
        name: "Ecuador",
        alpha_2: "EC",
        alpha_3: "ECU",
        un_code: 218,
        icon: "ecuador",
    });
    array.push({
        name: "Egypt",
        alpha_2: "EG",
        alpha_3: "EGY",
        un_code: 818,
        icon: "egypt",
    });
    array.push({
        name: "El Salvador",
        alpha_2: "SV",
        alpha_3: "SLV",
        un_code: 222,
        icon: "el-salvador",
    });
    array.push({
        name: "Equatorial Guinea",
        alpha_2: "GQ",
        alpha_3: "GNQ",
        un_code: 226,
        icon: "equatorial-guinea",
    });
    array.push({
        name: "Eritrea",
        alpha_2: "ER",
        alpha_3: "ERI",
        un_code: 232,
        icon: "eritrea",
    });
    array.push({
        name: "Estonia",
        alpha_2: "EE",
        alpha_3: "EST",
        un_code: 233,
        icon: "estonia",
    });
    array.push({
        name: "Ethiopia",
        alpha_2: "ET",
        alpha_3: "ETH",
        un_code: 231,
        icon: "ethiopia",
    });
    array.push({
        name: "Falkland Islands (Malvinas)",
        alpha_2: "FK",
        alpha_3: "FLK",
        un_code: 238,
        icon: "falkland-islands",
    });
    array.push({
        name: "Faroe Islands",
        alpha_2: "FO",
        alpha_3: "FRO",
        un_code: 234,
        icon: "faroe-islands",
    });
    array.push({
        name: "Fiji",
        alpha_2: "FJ",
        alpha_3: "FJI",
        un_code: 242,
        icon: "fiji",
    });
    array.push({
        name: "Finland",
        alpha_2: "FI",
        alpha_3: "FIN",
        un_code: 246,
        icon: "finland",
    });
    array.push({
        name: "France",
        alpha_2: "FR",
        alpha_3: "FRA",
        un_code: 250,
        icon: "france",
    });
    /* TODO(flag): https://en.wikipedia.org/wiki/French_Guiana */
    array.push({
        name: "French Guiana",
        alpha_2: "GF",
        alpha_3: "GUF",
        un_code: 254,
        icon: "worldwide",
    });
    array.push({
        name: "French Polynesia",
        alpha_2: "PF",
        alpha_3: "PYF",
        un_code: 258,
        icon: "french-polynesia",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/Französische_Süd-_und_Antarktisgebiete */
    array.push({
        name: "French Southern Territories",
        alpha_2: "TF",
        alpha_3: "ATF",
        un_code: 260,
        icon: "worldwide",
    });
    array.push({
        name: "Gabon",
        alpha_2: "GA",
        alpha_3: "GAB",
        un_code: 266,
        icon: "gabon",
    });
    array.push({
        name: "Gambia",
        alpha_2: "GM",
        alpha_3: "GMB",
        un_code: 270,
        icon: "gambia",
    });
    array.push({
        name: "Georgia",
        alpha_2: "GE",
        alpha_3: "GEO",
        un_code: 268,
        icon: "georgia",
    });
    array.push({
        name: "Germany",
        alpha_2: "DE",
        alpha_3: "DEU",
        un_code: 276,
        icon: "germany",
    });
    array.push({
        name: "Ghana",
        alpha_2: "GH",
        alpha_3: "GHA",
        un_code: 288,
        icon: "ghana",
    });
    array.push({
        name: "Gibraltar",
        alpha_2: "GI",
        alpha_3: "GIB",
        un_code: 292,
        icon: "gibraltar",
    });
    array.push({
        name: "Greece",
        alpha_2: "GR",
        alpha_3: "GRC",
        un_code: 300,
        icon: "greece",
    });
    array.push({
        name: "Greenland",
        alpha_2: "GL",
        alpha_3: "GRL",
        un_code: 304,
        icon: "greenland",
    });
    array.push({
        name: "Grenada",
        alpha_2: "GD",
        alpha_3: "GRD",
        un_code: 308,
        icon: "grenada",
    });
    /* The france flag is the official flag of Guadeloupe */
    array.push({
        name: "Guadeloupe",
        alpha_2: "GP",
        alpha_3: "GLP",
        un_code: 312,
        icon: "france",
    });
    array.push({
        name: "Guam",
        alpha_2: "GU",
        alpha_3: "GUM",
        un_code: 316,
        icon: "guam",
    });
    array.push({
        name: "Guatemala",
        alpha_2: "GT",
        alpha_3: "GTM",
        un_code: 320,
        icon: "guatemala",
    });
    array.push({
        name: "Guernsey",
        alpha_2: "GG",
        alpha_3: "GGY",
        un_code: 831,
        icon: "guernsey",
    });
    array.push({
        name: "Guinea",
        alpha_2: "GN",
        alpha_3: "GIN",
        un_code: 324,
        icon: "guinea",
    });
    array.push({
        name: "Guinea-Bissau",
        alpha_2: "GW",
        alpha_3: "GNB",
        un_code: 624,
        icon: "guinea_bissau",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/Guyana */
    array.push({
        name: "Guyana",
        alpha_2: "GY",
        alpha_3: "GUY",
        un_code: 328,
        icon: "worldwide",
    });
    array.push({
        name: "Haiti",
        alpha_2: "HT",
        alpha_3: "HTI",
        un_code: 332,
        icon: "haiti",
    });
    /* Uninhibited */
    array.push({
        name: "Heard and Mcdonald Islands",
        alpha_2: "HM",
        alpha_3: "HMD",
        un_code: 334,
        icon: "worldwide",
    });
    array.push({
        name: "Holy See (Vatican City State)",
        alpha_2: "VA",
        alpha_3: "VAT",
        un_code: 336,
        icon: "vatican_city",
    });
    array.push({
        name: "Honduras",
        alpha_2: "HN",
        alpha_3: "HND",
        un_code: 340,
        icon: "honduras",
    });
    array.push({
        name: "Hungary",
        alpha_2: "HU",
        alpha_3: "HUN",
        un_code: 348,
        icon: "hungary",
    });
    array.push({
        name: "Iceland",
        alpha_2: "IS",
        alpha_3: "ISL",
        un_code: 352,
        icon: "iceland",
    });
    array.push({
        name: "India",
        alpha_2: "IN",
        alpha_3: "IND",
        un_code: 356,
        icon: "india",
    });
    array.push({
        name: "Indonesia",
        alpha_2: "ID",
        alpha_3: "IDN",
        un_code: 360,
        icon: "indonesia",
    });
    array.push({
        name: "Iran, Islamic Republic of",
        alpha_2: "IR",
        alpha_3: "IRN",
        un_code: 364,
        icon: "iran",
    });
    array.push({
        name: "Iraq",
        alpha_2: "IQ",
        alpha_3: "IRQ",
        un_code: 368,
        icon: "iraq",
    });
    array.push({
        name: "Ireland",
        alpha_2: "IE",
        alpha_3: "IRL",
        un_code: 372,
        icon: "ireland",
    });
    array.push({
        name: "Isle of Man",
        alpha_2: "IM",
        alpha_3: "IMN",
        un_code: 833,
        icon: "isle-of-man",
    });
    array.push({
        name: "Israel",
        alpha_2: "IL",
        alpha_3: "ISR",
        un_code: 376,
        icon: "israel",
    });
    array.push({
        name: "Italy",
        alpha_2: "IT",
        alpha_3: "ITA",
        un_code: 380,
        icon: "italy",
    });
    array.push({
        name: "Jamaica",
        alpha_2: "JM",
        alpha_3: "JAM",
        un_code: 388,
        icon: "jamaica",
    });
    array.push({
        name: "Japan",
        alpha_2: "JP",
        alpha_3: "JPN",
        un_code: 392,
        icon: "japan",
    });
    array.push({
        name: "Jersey",
        alpha_2: "JE",
        alpha_3: "JEY",
        un_code: 832,
        icon: "jersey",
    });
    array.push({
        name: "Jordan",
        alpha_2: "JO",
        alpha_3: "JOR",
        un_code: 400,
        icon: "jordan",
    });
    array.push({
        name: "Kazakhstan",
        alpha_2: "KZ",
        alpha_3: "KAZ",
        un_code: 398,
        icon: "kazakhstan",
    });
    array.push({
        name: "Kenya",
        alpha_2: "KE",
        alpha_3: "KEN",
        un_code: 404,
        icon: "kenya",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/Kiribati */
    array.push({
        name: "Kiribati",
        alpha_2: "KI",
        alpha_3: "KIR",
        un_code: 296,
        icon: "worldwide",
    });
    /* Will ever anybody join from there? :D */
    array.push({
        name: "Korea (North)",
        alpha_2: "KP",
        alpha_3: "PRK",
        un_code: 408,
        icon: "north-korea",
    });
    array.push({
        name: "Korea (South)",
        alpha_2: "KR",
        alpha_3: "KOR",
        un_code: 410,
        icon: "south-korea",
    });
    array.push({
        name: "Kuwait",
        alpha_2: "KW",
        alpha_3: "KWT",
        un_code: 414,
        icon: "kuwait",
    });
    array.push({
        name: "Kyrgyzstan",
        alpha_2: "KG",
        alpha_3: "KGZ",
        un_code: 417,
        icon: "kyrgyzstan",
    });
    array.push({
        name: "Lao PDR",
        alpha_2: "LA",
        alpha_3: "LAO",
        un_code: 418,
        icon: "laos",
    });
    array.push({
        name: "Latvia",
        alpha_2: "LV",
        alpha_3: "LVA",
        un_code: 428,
        icon: "latvia",
    });
    array.push({
        name: "Lebanon",
        alpha_2: "LB",
        alpha_3: "LBN",
        un_code: 422,
        icon: "lebanon",
    });
    array.push({
        name: "Lesotho",
        alpha_2: "LS",
        alpha_3: "LSO",
        un_code: 426,
        icon: "lesotho",
    });
    array.push({
        name: "Liberia",
        alpha_2: "LR",
        alpha_3: "LBR",
        un_code: 430,
        icon: "liberia",
    });
    array.push({
        name: "Libya",
        alpha_2: "LY",
        alpha_3: "LBY",
        un_code: 434,
        icon: "libya",
    });
    array.push({
        name: "Liechtenstein",
        alpha_2: "LI",
        alpha_3: "LIE",
        un_code: 438,
        icon: "liechtenstein",
    });
    array.push({
        name: "Lithuania",
        alpha_2: "LT",
        alpha_3: "LTU",
        un_code: 440,
        icon: "lithuania",
    });
    array.push({
        name: "Luxembourg",
        alpha_2: "LU",
        alpha_3: "LUX",
        un_code: 442,
        icon: "luxembourg",
    });
    array.push({
        name: "Macedonia, Republic of",
        alpha_2: "MK",
        alpha_3: "MKD",
        un_code: 807,
        icon: "republic-of-macedonia",
    });
    array.push({
        name: "Madagascar",
        alpha_2: "MG",
        alpha_3: "MDG",
        un_code: 450,
        icon: "madagascar",
    });
    array.push({
        name: "Malawi",
        alpha_2: "MW",
        alpha_3: "MWI",
        un_code: 454,
        icon: "malawi",
    });
    array.push({
        name: "Malaysia",
        alpha_2: "MY",
        alpha_3: "MYS",
        un_code: 458,
        icon: "malaysia",
    });
    array.push({
        name: "Maldives",
        alpha_2: "MV",
        alpha_3: "MDV",
        un_code: 462,
        icon: "maldives",
    });
    array.push({
        name: "Mali",
        alpha_2: "ML",
        alpha_3: "MLI",
        un_code: 466,
        icon: "mali",
    });
    array.push({
        name: "Malta",
        alpha_2: "MT",
        alpha_3: "MLT",
        un_code: 470,
        icon: "malta",
    });
    array.push({
        name: "Marshall Islands",
        alpha_2: "MH",
        alpha_3: "MHL",
        un_code: 584,
        icon: "marshall-island",
    });
    array.push({
        name: "Martinique",
        alpha_2: "MQ",
        alpha_3: "MTQ",
        un_code: 474,
        icon: "martinique",
    });
    array.push({
        name: "Mauritania",
        alpha_2: "MR",
        alpha_3: "MRT",
        un_code: 478,
        icon: "mauritania",
    });
    array.push({
        name: "Mauritius",
        alpha_2: "MU",
        alpha_3: "MUS",
        un_code: 480,
        icon: "mauritius",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/Mayotte */
    array.push({
        name: "Mayotte",
        alpha_2: "YT",
        alpha_3: "MYT",
        un_code: 175,
        icon: "worldwide",
    });
    array.push({
        name: "Mexico",
        alpha_2: "MX",
        alpha_3: "MEX",
        un_code: 484,
        icon: "mexico",
    });
    array.push({
        name: "Micronesia, Federated States of",
        alpha_2: "FM",
        alpha_3: "FSM",
        un_code: 583,
        icon: "micronesia",
    });
    array.push({
        name: "Moldova",
        alpha_2: "MD",
        alpha_3: "MDA",
        un_code: 498,
        icon: "moldova",
    });
    array.push({
        name: "Monaco",
        alpha_2: "MC",
        alpha_3: "MCO",
        un_code: 492,
        icon: "monaco",
    });
    array.push({
        name: "Mongolia",
        alpha_2: "MN",
        alpha_3: "MNG",
        un_code: 496,
        icon: "mongolia",
    });
    array.push({
        name: "Montenegro",
        alpha_2: "ME",
        alpha_3: "MNE",
        un_code: 499,
        icon: "montenegro",
    });
    array.push({
        name: "Montserrat",
        alpha_2: "MS",
        alpha_3: "MSR",
        un_code: 500,
        icon: "montserrat",
    });
    array.push({
        name: "Morocco",
        alpha_2: "MA",
        alpha_3: "MAR",
        un_code: 504,
        icon: "morocco",
    });
    array.push({
        name: "Mozambique",
        alpha_2: "MZ",
        alpha_3: "MOZ",
        un_code: 508,
        icon: "mozambique",
    });
    array.push({
        name: "Myanmar",
        alpha_2: "MM",
        alpha_3: "MMR",
        un_code: 104,
        icon: "myanmar",
    });
    array.push({
        name: "Namibia",
        alpha_2: "NA",
        alpha_3: "NAM",
        un_code: 516,
        icon: "namibia",
    });
    array.push({
        name: "Nauru",
        alpha_2: "NR",
        alpha_3: "NRU",
        un_code: 520,
        icon: "nauru",
    });
    array.push({
        name: "Nepal",
        alpha_2: "NP",
        alpha_3: "NPL",
        un_code: 524,
        icon: "nepal",
    });
    array.push({
        name: "Netherlands",
        alpha_2: "NL",
        alpha_3: "NLD",
        un_code: 528,
        icon: "netherlands",
    });
    /* Official flag is the french flag */
    array.push({
        name: "New Caledonia",
        alpha_2: "NC",
        alpha_3: "NCL",
        un_code: 540,
        icon: "french",
    });
    array.push({
        name: "New Zealand",
        alpha_2: "NZ",
        alpha_3: "NZL",
        un_code: 554,
        icon: "new-zealand",
    });
    array.push({
        name: "Nicaragua",
        alpha_2: "NI",
        alpha_3: "NIC",
        un_code: 558,
        icon: "nicaragua",
    });
    array.push({
        name: "Niger",
        alpha_2: "NE",
        alpha_3: "NER",
        un_code: 562,
        icon: "niger",
    });
    array.push({
        name: "Nigeria",
        alpha_2: "NG",
        alpha_3: "NGA",
        un_code: 566,
        icon: "nigeria",
    });
    array.push({
        name: "Niue",
        alpha_2: "NU",
        alpha_3: "NIU",
        un_code: 570,
        icon: "niue",
    });
    array.push({
        name: "Norfolk Island",
        alpha_2: "NF",
        alpha_3: "NFK",
        un_code: 574,
        icon: "norfolk-island",
    });
    array.push({
        name: "Northern Mariana Islands",
        alpha_2: "MP",
        alpha_3: "MNP",
        un_code: 580,
        icon: "northern-marianas-islands",
    });
    array.push({
        name: "Norway",
        alpha_2: "NO",
        alpha_3: "NOR",
        un_code: 578,
        icon: "norway",
    });
    array.push({
        name: "Oman",
        alpha_2: "OM",
        alpha_3: "OMN",
        un_code: 512,
        icon: "oman",
    });
    array.push({
        name: "Pakistan",
        alpha_2: "PK",
        alpha_3: "PAK",
        un_code: 586,
        icon: "pakistan",
    });
    array.push({
        name: "Palau",
        alpha_2: "PW",
        alpha_3: "PLW",
        un_code: 585,
        icon: "palau",
    });
    /* TODO(flag): https://en.wikipedia.org/wiki/Palestinians */
    array.push({
        name: "Palestinian Territory",
        alpha_2: "PS",
        alpha_3: "PSE",
        un_code: 275,
        icon: "worldwide",
    });
    array.push({
        name: "Panama",
        alpha_2: "PA",
        alpha_3: "PAN",
        un_code: 591,
        icon: "panama",
    });
    array.push({
        name: "Papua New Guinea",
        alpha_2: "PG",
        alpha_3: "PNG",
        un_code: 598,
        icon: "papua-new-guinea",
    });
    array.push({
        name: "Paraguay",
        alpha_2: "PY",
        alpha_3: "PRY",
        un_code: 600,
        icon: "paraguay",
    });
    array.push({
        name: "Peru",
        alpha_2: "PE",
        alpha_3: "PER",
        un_code: 604,
        icon: "peru",
    });
    array.push({
        name: "Philippines",
        alpha_2: "PH",
        alpha_3: "PHL",
        un_code: 608,
        icon: "philippines",
    });
    array.push({
        name: "Pitcairn",
        alpha_2: "PN",
        alpha_3: "PCN",
        un_code: 612,
        icon: "pitcairn-islands",
    });
    array.push({
        name: "Poland",
        alpha_2: "PL",
        alpha_3: "POL",
        un_code: 616,
        icon: "poland",
    });
    array.push({
        name: "Portugal",
        alpha_2: "PT",
        alpha_3: "PRT",
        un_code: 620,
        icon: "portugal",
    });
    array.push({
        name: "Puerto Rico",
        alpha_2: "PR",
        alpha_3: "PRI",
        un_code: 630,
        icon: "puerto-rico",
    });
    array.push({
        name: "Qatar",
        alpha_2: "QA",
        alpha_3: "QAT",
        un_code: 634,
        icon: "qatar",
    });
    array.push({
        name: "Réunion",
        alpha_2: "RE",
        alpha_3: "REU",
        un_code: 638,
        icon: "french",
    });
    array.push({
        name: "Romania",
        alpha_2: "RO",
        alpha_3: "ROU",
        un_code: 642,
        icon: "romania",
    });
    array.push({
        name: "Russian Federation",
        alpha_2: "RU",
        alpha_3: "RUS",
        un_code: 643,
        icon: "russia",
    });
    array.push({
        name: "Rwanda",
        alpha_2: "RW",
        alpha_3: "RWA",
        un_code: 646,
        icon: "rwanda",
    });
    array.push({
        name: "Saint-Barthélemy",
        alpha_2: "BL",
        alpha_3: "BLM",
        un_code: 652,
        icon: "french",
    });
    /* More or less uninhibited (2017: 4846 inhabitants)*/
    array.push({
        name: "Saint Helena",
        alpha_2: "SH",
        alpha_3: "SHN",
        un_code: 654,
        icon: "worldwide",
    });
    array.push({
        name: "Saint Kitts and Nevis",
        alpha_2: "KN",
        alpha_3: "KNA",
        un_code: 659,
        icon: "saint-kitts-and-nevis",
    });
    array.push({
        name: "Saint Lucia",
        alpha_2: "LC",
        alpha_3: "LCA",
        un_code: 662,
        icon: "st_lucia",
    });
    array.push({
        name: "Saint-Martin (French part)",
        alpha_2: "MF",
        alpha_3: "MAF",
        un_code: 663,
        icon: "french",
    });
    array.push({
        name: "Saint Pierre and Miquelon",
        alpha_2: "PM",
        alpha_3: "SPM",
        un_code: 666,
        icon: "french",
    });
    /* TODO(flag): https://de.wikipedia.org/wiki/St._Vincent_und_die_Grenadinen */
    array.push({
        name: "Saint Vincent and Grenadines",
        alpha_2: "VC",
        alpha_3: "VCT",
        un_code: 670,
        icon: "worldwide",
    });
    array.push({
        name: "Samoa",
        alpha_2: "WS",
        alpha_3: "WSM",
        un_code: 882,
        icon: "samoa",
    });
    array.push({
        name: "San Marino",
        alpha_2: "SM",
        alpha_3: "SMR",
        un_code: 674,
        icon: "san-marino",
    });
    array.push({
        name: "Sao Tome and Principe",
        alpha_2: "ST",
        alpha_3: "STP",
        un_code: 678,
        icon: "sao-tome-and-principe",
    });
    array.push({
        name: "Saudi Arabia",
        alpha_2: "SA",
        alpha_3: "SAU",
        un_code: 682,
        icon: "saudi-arabia",
    });
    array.push({
        name: "Senegal",
        alpha_2: "SN",
        alpha_3: "SEN",
        un_code: 686,
        icon: "senegal",
    });
    array.push({
        name: "Serbia",
        alpha_2: "RS",
        alpha_3: "SRB",
        un_code: 688,
        icon: "serbia",
    });
    array.push({
        name: "Seychelles",
        alpha_2: "SC",
        alpha_3: "SYC",
        un_code: 690,
        icon: "seychelles",
    });
    array.push({
        name: "Sierra Leone",
        alpha_2: "SL",
        alpha_3: "SLE",
        un_code: 694,
        icon: "sierra-leone",
    });
    array.push({
        name: "Singapore",
        alpha_2: "SG",
        alpha_3: "SGP",
        un_code: 702,
        icon: "singapore",
    });
    array.push({
        name: "Slovakia",
        alpha_2: "SK",
        alpha_3: "SVK",
        un_code: 703,
        icon: "slovakia",
    });
    array.push({
        name: "Slovenia",
        alpha_2: "SI",
        alpha_3: "SVN",
        un_code: 705,
        icon: "slovenia",
    });
    array.push({
        name: "Solomon Islands",
        alpha_2: "SB",
        alpha_3: "SLB",
        un_code: 90,
        icon: "solomon-islands",
    });
    array.push({
        name: "Somalia",
        alpha_2: "SO",
        alpha_3: "SOM",
        un_code: 706,
        icon: "somalia",
    });
    array.push({
        name: "South Africa",
        alpha_2: "ZA",
        alpha_3: "ZAF",
        un_code: 710,
        icon: "south-africa",
    });
    array.push({
        name: "South Georgia and the South Sandwich Islands",
        alpha_2: "GS",
        alpha_3: "SGS",
        un_code: 239,
        icon: "worldwide",
    });
    array.push({
        name: "South Sudan",
        alpha_2: "SS",
        alpha_3: "SSD",
        un_code: 728,
        icon: "south-sudan",
    });
    array.push({
        name: "Spain",
        alpha_2: "ES",
        alpha_3: "ESP",
        un_code: 724,
        icon: "spain",
    });
    array.push({
        name: "Sri Lanka",
        alpha_2: "LK",
        alpha_3: "LKA",
        un_code: 144,
        icon: "sri-lanka",
    });
    array.push({
        name: "Sudan",
        alpha_2: "SD",
        alpha_3: "SDN",
        un_code: 736,
        icon: "sudan",
    });
    array.push({
        name: "Suriname",
        alpha_2: "SR",
        alpha_3: "SUR",
        un_code: 740,
        icon: "suriname",
    });
    array.push({
        name: "Svalbard and Jan Mayen Islands",
        alpha_2: "SJ",
        alpha_3: "SJM",
        un_code: 744,
        icon: "worldwide",
    });
    array.push({
        name: "Swaziland",
        alpha_2: "SZ",
        alpha_3: "SWZ",
        un_code: 748,
        icon: "worldwide",
    });
    array.push({
        name: "Sweden",
        alpha_2: "SE",
        alpha_3: "SWE",
        un_code: 752,
        icon: "sweden",
    });
    array.push({
        name: "Switzerland",
        alpha_2: "CH",
        alpha_3: "CHE",
        un_code: 756,
        icon: "switzerland",
    });
    array.push({
        name: "Syrian Arab Republic (Syria)",
        alpha_2: "SY",
        alpha_3: "SYR",
        un_code: 760,
        icon: "syria",
    });
    array.push({
        name: "Taiwan, Republic of China",
        alpha_2: "TW",
        alpha_3: "TWN",
        un_code: 158,
        icon: "taiwan",
    });
    array.push({
        name: "Tajikistan",
        alpha_2: "TJ",
        alpha_3: "TJK",
        un_code: 762,
        icon: "tajikistan",
    });
    array.push({
        name: "Tanzania, United Republic of",
        alpha_2: "TZ",
        alpha_3: "TZA",
        un_code: 834,
        icon: "tanzania",
    });
    array.push({
        name: "Thailand",
        alpha_2: "TH",
        alpha_3: "THA",
        un_code: 764,
        icon: "thailand",
    });
    array.push({
        name: "Timor-Leste",
        alpha_2: "TL",
        alpha_3: "TLS",
        un_code: 626,
        icon: "east-timor",
    });
    array.push({
        name: "Togo",
        alpha_2: "TG",
        alpha_3: "TGO",
        un_code: 768,
        icon: "togo",
    });
    array.push({
        name: "Tokelau",
        alpha_2: "TK",
        alpha_3: "TKL",
        un_code: 772,
        icon: "tokelau",
    });
    array.push({
        name: "Tonga",
        alpha_2: "TO",
        alpha_3: "TON",
        un_code: 776,
        icon: "tonga",
    });
    array.push({
        name: "Trinidad and Tobago",
        alpha_2: "TT",
        alpha_3: "TTO",
        un_code: 780,
        icon: "trinidad-and-tobago",
    });
    array.push({
        name: "Tunisia",
        alpha_2: "TN",
        alpha_3: "TUN",
        un_code: 788,
        icon: "tunisia",
    });
    array.push({
        name: "Turkey",
        alpha_2: "TR",
        alpha_3: "TUR",
        un_code: 792,
        icon: "turkey",
    });
    array.push({
        name: "Turkmenistan",
        alpha_2: "TM",
        alpha_3: "TKM",
        un_code: 795,
        icon: "turkmenistan",
    });
    array.push({
        name: "Turks and Caicos Islands",
        alpha_2: "TC",
        alpha_3: "TCA",
        un_code: 796,
        icon: "worldwide",
    });
    array.push({
        name: "Tuvalu",
        alpha_2: "TV",
        alpha_3: "TUV",
        un_code: 798,
        icon: "worldwide",
    });
    array.push({
        name: "Uganda",
        alpha_2: "UG",
        alpha_3: "UGA",
        un_code: 800,
        icon: "uganda",
    });
    array.push({
        name: "Ukraine",
        alpha_2: "UA",
        alpha_3: "UKR",
        un_code: 804,
        icon: "ukraine",
    });
    array.push({
        name: "United Arab Emirates",
        alpha_2: "AE",
        alpha_3: "ARE",
        un_code: 784,
        icon: "united-arab-emirates",
    });
    array.push({
        name: "United Kingdom",
        alpha_2: "GB",
        alpha_3: "GBR",
        un_code: 826,
        icon: "united-kingdom",
    });
    array.push({
        name: "United States of America",
        alpha_2: "US",
        alpha_3: "USA",
        un_code: 840,
        icon: "united-states-of-america",
    });
    array.push({
        name: "US Minor Outlying Islands",
        alpha_2: "UM",
        alpha_3: "UMI",
        un_code: 581,
        icon: "worldwide",
    });
    array.push({
        name: "Uruguay",
        alpha_2: "UY",
        alpha_3: "URY",
        un_code: 858,
        icon: "uruguay",
    });
    /* TODO(flag): https://en.wikipedia.org/wiki/Uzbekistan */
    array.push({
        name: "Uzbekistan",
        alpha_2: "UZ",
        alpha_3: "UZB",
        un_code: 860,
        icon: "worldwide",
    });
    array.push({
        name: "Vanuatu",
        alpha_2: "VU",
        alpha_3: "VUT",
        un_code: 548,
        icon: "vanuatu",
    });
    array.push({
        name: "Venezuela (Bolivarian Republic)",
        alpha_2: "VE",
        alpha_3: "VEN",
        un_code: 862,
        icon: "venezuela",
    });
    array.push({
        name: "Viet Nam",
        alpha_2: "VN",
        alpha_3: "VNM",
        un_code: 704,
        icon: "vietnam",
    });
    array.push({
        name: "Virgin Islands, US",
        alpha_2: "VI",
        alpha_3: "VIR",
        un_code: 850,
        icon: "virgin-islands",
    });
    array.push({
        name: "Wallis and Futuna Islands",
        alpha_2: "WF",
        alpha_3: "WLF",
        un_code: 876,
        icon: "worldwide",
    });
    array.push({
        name: "Western Sahara",
        alpha_2: "EH",
        alpha_3: "ESH",
        un_code: 732,
        icon: "sahrawi_arab_democratic_republic",
    });
    array.push({
        name: "Yemen",
        alpha_2: "YE",
        alpha_3: "YEM",
        un_code: 887,
        icon: "yemen",
    });
    array.push({
        name: "Zambia",
        alpha_2: "ZM",
        alpha_3: "ZMB",
        un_code: 894,
        icon: "zambia",
    });
    array.push({
        name: "Zimbabwe",
        alpha_2: "ZW",
        alpha_3: "ZWE",
        un_code: 716,
        icon: "zimbabwe",
    });
};

export function getKnownCountries() : CountryInfo[] {
    return registeredCountries;
}

export function getCountryName(alphaCode: string, fallback?: string) {
    const countryInfo = alphaCode2Info[alphaCode?.toUpperCase()];
    if(!countryInfo) {
        return fallback || "unknown";
    }

    return countryInfo.name;
}

export function getCountryFlag(alphaCode: string) : CountryFlag {
    const countryInfo = alphaCode2Info[alphaCode?.toUpperCase()];
    if(!countryInfo) {
        return CountryFlag.Worldwide;
    }

    const flag = CountryFlag["flag-" + countryInfo.icon.replace(/-/, "_")];
    if(!flag) {
        if(!countryInfo.flagMissingWarned) {
            countryInfo.flagMissingWarned = true;
            logWarn(LogCategory.GENERAL, tr("Missing country flag for %o"), countryInfo);
        }

        return CountryFlag.Worldwide;
    }

    return CountryFlag[flag] || CountryFlag.Worldwide;
}

registerCountries(registeredCountries);
for(const country of registeredCountries) {
    alphaCode2Info[country.alpha_2] = country;
}
